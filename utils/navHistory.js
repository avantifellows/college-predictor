import { useEffect } from "react";
import { useRouter } from "next/router";

// Where the student came from, inside the site, so a detail page's back link
// can say "← Ayurveda" and go back there instead of always "← All exams".
//
// Kept per HISTORY ENTRY (Next gives each one a key in history.state), in
// sessionStorage, so it stays right after the browser's own Back/Forward:
//   - a new entry remembers the page that opened it
//   - revisiting an entry (Back/Forward) keeps what it already had
//   - a same-page URL change (filters, sort) or a forwarding hop
//     (/exams?q=NEET-UG -> /exams/neet-ug, marked with markForward()) replaces
//     an entry, and inherits the replaced entry's origin
const STORE = "nav:cameFrom";
const FORWARD = "nav:forward";

const read = (k) => {
  try {
    return sessionStorage.getItem(k);
  } catch (e) {
    return null;
  }
};
const write = (k, v) => {
  try {
    if (v == null) sessionStorage.removeItem(k);
    else sessionStorage.setItem(k, v);
  } catch (e) {
    /* storage blocked: back links fall back to the list */
  }
};
const readMap = () => {
  try {
    return JSON.parse(read(STORE) || "{}");
  } catch (e) {
    return {};
  }
};

const entryKey = () =>
  (typeof window !== "undefined" && window.history.state?.key) || null;
const pathname = (url) => String(url).split(/[?#]/)[0];
const titleOf = (t) => String(t || "").replace(/\s+-\s+Futures$/, "");

/** In _app: record, for each history entry, the page that opened it. */
export function useNavHistory() {
  const router = useRouter();
  useEffect(() => {
    let leaving = null;
    const onStart = () => {
      leaving = {
        key: entryKey(),
        path: router.asPath.split("#")[0],
        title: titleOf(document.title),
      };
    };
    const onDone = (url) => {
      const key = entryKey();
      if (!key || !leaving) return;
      const map = readMap();
      // only the navigation the marker was set for counts as the forward; a
      // marker left behind by an interrupted hop must not misfile the next
      const forward = read(FORWARD) === pathname(url);
      write(FORWARD, null);
      if (map[key]) {
        // Back/Forward to an entry we already know: nothing changes
      } else if (forward || pathname(url) === pathname(leaving.path)) {
        if (map[leaving.key]) map[key] = map[leaving.key];
      } else {
        map[key] = { path: leaving.path, title: leaving.title };
      }
      write(STORE, JSON.stringify(map));
      leaving = null;
    };
    router.events.on("routeChangeStart", onStart);
    router.events.on("routeChangeComplete", onDone);
    return () => {
      router.events.off("routeChangeStart", onStart);
      router.events.off("routeChangeComplete", onDone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Call right before a router.replace that forwards to `target`. */
export const markForward = (target) => write(FORWARD, pathname(target));

/** The in-app page that opened the current one, or null (arrived directly). */
export function previousPage() {
  const key = entryKey();
  return key ? readMap()[key] || null : null;
}

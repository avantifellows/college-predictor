import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

// A page's filters, mirrored into the query string: a filtered view can be
// shared as a link, survives a refresh, and comes back when the student
// returns with Back. Values equal to their default stay out of the URL.
//
// Written with a shallow REPLACE, not a push: changing a filter is not a new
// page, so one press of Back still leaves the page. Query keys the page
// doesn't manage, and the #hash, are kept as they are.
const qs = (query) => {
  const s = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v != null && v !== "")
  ).toString();
  return s ? `?${s}` : "";
};

export default function useUrlParams(defaults) {
  const router = useRouter();
  const defaultsRef = useRef(defaults);
  const [params, setParams] = useState(defaults);
  const [ready, setReady] = useState(false);
  // edits not yet written to the URL (the write is debounced)
  const dirty = useRef(false);

  // read on arrival, and whenever the URL changes under the page (Back /
  // Forward, a link to the same page with other params) — but not while
  // edits are pending, or our own lagging write would undo the student's
  // latest keystrokes
  useEffect(() => {
    if (!router.isReady) return;
    if (ready && dirty.current) return;
    const d = defaultsRef.current;
    const next = {};
    for (const k of Object.keys(d)) {
      const v = router.query[k];
      next[k] = v == null ? d[k] : String(Array.isArray(v) ? v[0] : v);
    }
    setParams((p) =>
      Object.keys(d).every((k) => p[k] === next[k]) ? p : next
    );
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.asPath]);

  // write, debounced so typing in a search box is one replace, not twenty
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const d = defaultsRef.current;
      const query = { ...router.query };
      for (const k of Object.keys(d)) {
        if (params[k] === d[k] || params[k] == null) delete query[k];
        else query[k] = params[k];
      }
      dirty.current = false;
      const search = qs(query);
      if (search === window.location.search) return;
      router.replace(
        `${router.pathname}${search}${window.location.hash}`,
        undefined,
        { shallow: true, scroll: false }
      );
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, ready]);

  // setParam("q", "iit") or setParam("q", (prev) => ...)
  const setParam = useCallback(
    (key, value) =>
      setParams((p) => {
        const v = typeof value === "function" ? value(p[key]) : value;
        if (p[key] === v) return p;
        dirty.current = true;
        return { ...p, [key]: v };
      }),
    []
  );

  return [params, setParam, ready];
}

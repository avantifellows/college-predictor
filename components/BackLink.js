import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";
import { previousPage } from "../utils/navHistory";

// Every page's way back. Opened from another page on the site, it says
// where it goes ("← Student Corner") and goes there with the browser's
// Back, so that page comes back as the student left it (scroll, filters,
// an open plan). Arrived directly (shared link, typed URL, a new tab): the
// page's own fallback, `href` and `children` ("← Home", "← All colleges").
// _app records, per history entry, the page that opened it
// (utils/navHistory.js); nothing here knows about particular pages.
//   label  fixed text whatever the origin
//   fixed  always the fallback link (a step that must not depend on history)

const strip = (p) => String(p || "").split(/[?#]/)[0];

const labelFor = (prev, href, fallback) => {
  const path = strip(prev.path);
  if (path === strip(href)) return fallback;
  if (path === "/") return "Home";
  if (path === "/college_predictor") return "Your results";
  return prev.title || "Back";
};

const cls =
  "inline-flex items-center gap-1.5 text-sm font-semibold text-[#8f2e31] hover:underline";

export default function BackLink({
  href = "/",
  children = "Home",
  label,
  fixed = false,
}) {
  const router = useRouter();
  const [prev, setPrev] = useState(null);

  useEffect(() => {
    if (fixed) return undefined;
    const refresh = () => setPrev(previousPage());
    refresh();
    // _app files this page's origin when the navigation completes, which is
    // after this page first renders
    const onDone = () => setTimeout(refresh, 0);
    router.events.on("routeChangeComplete", onDone);
    return () => router.events.off("routeChangeComplete", onDone);
  }, [router.events, fixed]);

  if (fixed || !prev) {
    return (
      <Link href={href} className={cls}>
        <ArrowLeft size={15} /> {label || children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => router.back()} className={cls}>
      <ArrowLeft size={15} /> {label || labelFor(prev, href, children)}
    </button>
  );
}

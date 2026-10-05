import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";
import BackLink from "./BackLink";
import { previousPage } from "../utils/navHistory";
import { listBackHref } from "../utils/listReturn";

// A detail page's way back. Came from another page on the site (Ayurveda ->
// NEET-UG): "← Ayurveda", and it goes back there, with that page's scroll
// and filters. Came from the list: "← All exams", back to the list as left.
// Arrived directly (shared link, typed URL): a link to the list.
const labelFor = (prev, list, listLabel) => {
  const path = prev.path.split(/[?#]/)[0];
  if (path === list) return listLabel;
  if (path === "/") return "Home";
  if (path === "/college_predictor") return "Your results";
  return prev.title || "Back";
};

export default function DetailBackLink({ list, listLabel }) {
  const router = useRouter();
  const [prev, setPrev] = useState(null);

  useEffect(() => {
    const refresh = () => setPrev(previousPage());
    refresh();
    // the recorder in _app files this page's origin when the navigation
    // completes, which is after this page first renders
    const onDone = () => setTimeout(refresh, 0);
    router.events.on("routeChangeComplete", onDone);
    return () => router.events.off("routeChangeComplete", onDone);
  }, [router.events]);

  if (!prev) {
    return <BackLink href={listBackHref(list)}>{listLabel}</BackLink>;
  }
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8f2e31] hover:underline"
    >
      <ArrowLeft size={15} /> {labelFor(prev, list, listLabel)}
    </button>
  );
}

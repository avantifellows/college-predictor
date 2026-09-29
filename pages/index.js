import React, { useEffect, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ArrowDown, ArrowRight } from "lucide-react";
import IconTile from "../components/IconTile";
import { HOME_TILES } from "../utils/siteMap";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The landing page, following the futures v2 mockup: the gradient hero with
// the "I want to …" chooser, then four big tiles (Careers, Colleges, Exams,
// Scholarships). Each tile opens its section page. The chooser uses the
// house Dropdown, never the browser's native select.

// every option completes the sentence "I want to …" — keep them short.
// kw is the one word that names the destination; it renders bold-red so a
// scanning eye can pick the row without reading full sentences
const ACTIONS = [
  {
    value: "/predictor",
    label: "predict my colleges from my exam rank",
    kw: "predict",
  },
  {
    value: "/careers",
    label: "explore careers and what they pay",
    kw: "careers",
  },
  {
    value: "/colleges",
    label: "browse colleges, fees and rankings",
    kw: "colleges",
  },
  { value: "/compare", label: "compare colleges and branches", kw: "compare" },
  {
    value: "/josaa",
    label: "learn how JoSAA allotment works",
    kw: "mock",
  },
  { value: "/exams", label: "learn about entrance exams", kw: "exams" },
  {
    value: "/scholarships",
    label: "find scholarships I can apply for",
    kw: "scholarships",
  },
  {
    value: "https://cv-generator.avantifellows.org/",
    label: "build my resume",
    kw: "resume",
  },
];

// bold-red keyword inside the option text; white when the row itself is
// painted maroon (the selected row in a reopened menu)
const actionLabel = (data, meta) => {
  const { label, kw } = data;
  if (!kw || !label.includes(kw)) return label;
  const [before, after] = label.split(kw, 2);
  const onSelectedRow =
    meta.context === "menu" &&
    (meta.selectValue || []).some((v) => v.value === data.value);
  return (
    <>
      {before}
      <span
        className={`font-bold ${
          onSelectedRow ? "text-white" : "text-[#B52326]"
        }`}
      >
        {kw}
      </span>
      {after}
    </>
  );
};

export default function Home() {
  const router = useRouter();
  const [action, setAction] = useState(null);

  // old deep links (/?exam=KCET) predate the landing — forward them to the
  // predictor form so nothing anyone bookmarked or shared breaks
  useEffect(() => {
    if (router.isReady && router.query.exam) {
      router.replace({ pathname: "/predictor", query: router.query });
    }
  }, [router.isReady, router.query, router]);

  const go = () => {
    if (!action) return;
    if (action.startsWith("http")) window.open(action, "_blank");
    else router.push(action);
  };

  return (
    <>
      <Head>
        <title>Futures - Avanti Fellows</title>
        <meta
          name="description"
          content="One stop guide to higher education and professional careers in India: predict your colleges, explore careers, compare colleges, and understand every entrance exam."
        />
      </Head>
      <div className="min-h-screen bg-[#fdf8f6]">
        {/* hero band */}
        <section className="bg-gradient-to-b from-[#fbeeec] to-[#fdf8f6] px-4 pb-10 pt-14 text-center">
          <h1 className="mx-auto max-w-4xl text-[clamp(28px,4.3vw,44px)] font-black leading-[1.12] tracking-[-0.02em] text-[#2f2320]">
            One stop guide to{" "}
            <span className="text-[#B52326]">higher education</span> and
            professional careers in India
          </h1>
          <div className="mx-auto mt-9 flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <span className="shrink-0 text-[26px] font-black text-[#B52326] sm:text-[28px]">
              I want to
            </span>
            <div className="w-full min-w-0 flex-1 text-left">
              <Dropdown
                options={ACTIONS}
                selectedValue={action}
                onChange={(o) => setAction(o.value)}
                placeholder="choose an action…"
                isSearchable={false}
                formatOptionLabel={actionLabel}
              />
            </div>
            <button
              type="button"
              onClick={go}
              disabled={!action}
              className={`inline-flex shrink-0 items-center gap-2 rounded-[10px] px-6 py-3 text-base font-black text-white transition ${
                action
                  ? "bg-[#B52326] hover:bg-[#9E1F22]"
                  : "cursor-not-allowed bg-[#B52326]/40"
              }`}
            >
              Go <ArrowRight size={18} />
            </button>
          </div>
          <p className="mt-8 text-[15px] text-[#7a635d]">
            Or explore everything below
          </p>
          <ArrowDown size={18} className="mx-auto mt-3 text-[#B52326]/60" />
        </section>

        <div className="mx-auto max-w-[1080px] px-4 pb-16 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
            {HOME_TILES.map(({ key, href, icon, title, line }) => (
              <IconTile
                key={key}
                href={href}
                icon={icon}
                title={title}
                line={line}
                big
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

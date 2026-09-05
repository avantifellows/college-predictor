import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  ArrowDown,
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Target,
  Wrench,
} from "lucide-react";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The landing page, following the futures standalone's design: the gradient
// hero with the "I want to …" chooser, then the two grouped cards. Kept to
// what is shipped (no quiz / comparison / simulator), no eyebrow labels, no
// stat tiles, Datasets lives in the navbar only. The chooser uses the house
// Dropdown, never the browser's native select.

const ACTIONS = [
  {
    value: "/predictor",
    label: "Predict the top colleges for me based on my entrance exam result",
  },
  { value: "/careers", label: "Discover careers and what they pay" },
  { value: "/colleges", label: "Explore colleges, their fees and rankings" },
  { value: "/exams", label: "Understand the entrance exams" },
  {
    value: "/scholarships",
    label: "Find the best scholarship for my education",
  },
  {
    value: "https://cv-generator.avantifellows.org/",
    label: "Build a professional resume in minutes",
  },
];

const DASHBOARDS = [
  {
    href: "/careers",
    icon: Briefcase,
    title: "Careers",
    desc: "Pay, recruiters, and the exams that lead to each career.",
  },
  {
    href: "/colleges",
    icon: Building2,
    title: "Colleges",
    desc: "Rankings, fees, placements and branches.",
  },
  {
    href: "/exams",
    icon: ClipboardList,
    title: "Exams",
    desc: "Dates, eligibility, fees and paper format.",
  },
  {
    href: "/scholarships",
    icon: Award,
    title: "Scholarships",
    desc: "What you qualify for, with amounts and deadlines.",
  },
];

const TOOLS = [
  {
    href: "/predictor",
    icon: Target,
    title: "College Predictor",
    desc: "Enter your rank, see the colleges you could get.",
  },
  {
    href: "https://cv-generator.avantifellows.org/",
    icon: FileText,
    title: "CV Generator",
    desc: "A clean one-page resume in minutes.",
    external: true,
  },
];

const GroupCard = ({ icon: Badge, title, items }) => (
  <div className="flex flex-col overflow-hidden rounded-2xl border border-[#eaded8] bg-white shadow-sm">
    <div className="flex items-center gap-3.5 border-b border-[#eaded8] px-6 pb-4 pt-5">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#B52326] text-white">
        <Badge size={26} />
      </span>
      <h2 className="text-2xl font-black leading-tight text-[#2f2320]">
        {title}
      </h2>
    </div>
    <div className="flex flex-1 flex-col p-1.5">
      {items.map(({ href, icon: Icon, title: t, desc, external }, i) => (
        <Link
          key={t}
          href={href}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className={`group flex items-start gap-3.5 rounded-lg px-4 py-3.5 transition hover:bg-[#fbeeec] ${
            i > 0 ? "border-t border-[#eaded8]" : ""
          }`}
        >
          <Icon size={22} className="mt-0.5 shrink-0 text-[#B52326]" />
          <span className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-base font-bold text-[#2f2320]">
              {t}
              <ArrowRight
                size={15}
                className="text-[#B52326] transition group-hover:translate-x-1"
              />
            </span>
            <span className="mt-1 block text-[13.5px] leading-relaxed text-[#7a635d]">
              {desc}
            </span>
          </span>
        </Link>
      ))}
    </div>
  </div>
);

export default function Home() {
  const router = useRouter();
  const [action, setAction] = useState(null);
  const [updated, setUpdated] = useState(null);

  // old deep links (/?exam=KCET) predate the landing — forward them to the
  // predictor form so nothing anyone bookmarked or shared breaks
  useEffect(() => {
    if (router.isReady && router.query.exam) {
      router.replace({ pathname: "/predictor", query: router.query });
    }
  }, [router.isReady, router.query, router]);

  useEffect(() => {
    fetch("/data/last_updated.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUpdated(d.date))
      .catch(() => {});
  }, []);

  const go = () => {
    if (!action) return;
    if (action.startsWith("http")) window.open(action, "_blank");
    else router.push(action);
  };

  return (
    <>
      <Head>
        <title>Avanti Fellows - Futures</title>
        <meta
          name="description"
          content="One stop guide to higher education and professional careers in India: predict your colleges, explore careers, compare colleges, and understand every entrance exam."
        />
      </Head>
      <div className="min-h-screen bg-[#fdf8f6]">
        {/* hero band */}
        <section className="bg-gradient-to-b from-[#fbeeec] to-[#fdf8f6] px-4 pb-14 pt-16 text-center">
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
            Or scroll down to browse everything.
          </p>
          <ArrowDown size={18} className="mx-auto mt-4 text-[#B52326]/60" />
        </section>

        <div className="mx-auto max-w-[1080px] px-4 pb-16 sm:px-6">
          <div className="grid items-start gap-6 md:grid-cols-2">
            <GroupCard
              icon={LayoutDashboard}
              title="Dashboards"
              items={DASHBOARDS}
            />
            <GroupCard icon={Wrench} title="Tools" items={TOOLS} />
          </div>
          {updated ? (
            <p className="mt-10 text-center text-xs text-[#a89a94]">
              Data last updated {updated}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

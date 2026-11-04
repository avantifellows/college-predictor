import React, { useEffect, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import IconTile from "../components/IconTile";
import { HOME_TILES } from "../utils/siteMap";
import { planFor } from "../utils/onboarding";
import useGetStarted from "../utils/useGetStarted";
import { useStudentData } from "../utils/studentData";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The homepage. A first visit gets the landing: the gradient hero with a
// Get started button (pages/get-started.js asks class, stream and exam),
// then four big tiles (Careers, Colleges, Exams, Scholarships). Once the
// questions are answered, or a signed-in student's Avanti profile answers
// them, the hero becomes that student's plan (utils/onboarding.js): the one
// thing to do now, and the steps after it. Skipped, or not a student: the
// "I want to …" chooser. The chooser uses the house Dropdown, never the
// browser's native select.

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

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#B52326] px-6 py-3 text-base font-black text-white shadow-[0_8px_20px_rgba(181,35,38,.22)] transition hover:bg-[#9E1F22]";
const btnSecond =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[#e0cfc9] bg-white px-5 py-3 text-base font-bold text-[#2f2320] transition hover:border-[#B52326]";

// a step or button: in-site Link, or a new tab for the CV generator
function Go({ to, className, onClick, children }) {
  return to.external ? (
    <a
      href={to.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  ) : (
    <Link href={to.href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

function Landing() {
  return (
    <section className="bg-gradient-to-b from-[#fbeeec] to-[#fdf8f6] px-4 pb-10 pt-14 text-center">
      <h1 className="mx-auto max-w-4xl text-[clamp(28px,4.3vw,44px)] font-black leading-[1.12] tracking-[-0.02em] text-[#2f2320]">
        One stop guide to{" "}
        <span className="text-[#B52326]">higher education</span> and
        professional careers in India
      </h1>
      <Link href="/get-started" className={`${btnPrimary} mt-9`}>
        Get started <ArrowRight size={18} />
      </Link>
      <p className="mt-3 text-sm text-[#7a635d]">
        A few quick questions, then a plan made for you
      </p>
      <p className="mt-8 text-[15px] text-[#7a635d]">
        Or explore everything below
      </p>
      <ArrowDown size={18} className="mx-auto mt-3 text-[#B52326]/60" />
    </section>
  );
}

// "Class 12 · Science (PCM) · JEE · Maharashtra · Change"
function Chip({ parts, name }) {
  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 rounded-full border border-[#eaded8] bg-white px-3.5 py-1.5 text-[13px] text-[#5c4a45]">
      <span className="h-2 w-2 rounded-full bg-[#B52326]" aria-hidden />
      {[name && `Hi ${name}`, ...parts].filter(Boolean).join(" · ")}
      <span aria-hidden>·</span>
      <Link
        href="/get-started"
        className="font-bold text-[#B52326] hover:underline"
      >
        Change
      </Link>
    </div>
  );
}

function PlanHero({ plan, answers, markDone, name }) {
  const done = answers.done || [];
  const next = plan.steps.find((s) => !done.includes(s.id));
  const { hero } = plan;
  return (
    <section className="bg-gradient-to-b from-[#fbeeec] to-[#fdf8f6] pb-10 pt-10">
      <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
        <Chip parts={plan.chip} name={name} />
        <h1 className="mt-5 max-w-3xl text-[clamp(28px,4.3vw,44px)] font-black leading-[1.12] tracking-[-0.02em] text-[#2f2320]">
          {hero.before}
          <span className="text-[#B52326]">{hero.em}</span>
          {hero.after}
        </h1>
        <p className="mt-3 text-[15px] text-[#7a635d]">{hero.line}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Go
            to={hero.cta}
            className={btnPrimary}
            onClick={() => markDone(hero.cta.id)}
          >
            {hero.cta.label} <ArrowRight size={18} />
          </Go>
          {hero.second ? (
            <Go
              to={hero.second}
              className={btnSecond}
              onClick={() => markDone(hero.second.id)}
            >
              {hero.second.label}
            </Go>
          ) : null}
        </div>

        <div className="mt-10 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-black text-[#2f2320] sm:text-2xl">
            {plan.title}
          </h2>
          <span className="text-sm font-bold text-[#7a635d]">
            {plan.steps.filter((s) => done.includes(s.id)).length} of{" "}
            {plan.steps.length} done
          </span>
        </div>
        <ol
          className={`mt-4 grid gap-3 ${
            plan.steps.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"
          } sm:grid-cols-2`}
        >
          {plan.steps.map((s, i) => {
            const isDone = done.includes(s.id);
            const isNext = next && next.id === s.id;
            return (
              <li key={s.id}>
                <Go
                  to={s}
                  onClick={() => markDone(s.id)}
                  className={`flex h-full flex-col rounded-2xl bg-white p-4 transition hover:shadow-md ${
                    isNext
                      ? "border-2 border-[#B52326] shadow-[0_8px_24px_rgba(181,35,38,.12)]"
                      : "border border-[#eaded8]"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${
                        isDone
                          ? "bg-[#e6f2e8] text-[#3d7a4a]"
                          : isNext
                          ? "bg-[#B52326] text-white"
                          : "bg-[#f6ece9] text-[#7a635d]"
                      }`}
                    >
                      {isDone ? <Check size={15} strokeWidth={3} /> : i + 1}
                    </span>
                    {isDone ? (
                      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#3d7a4a]">
                        Done
                      </span>
                    ) : isNext ? (
                      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#B52326]">
                        Do this next
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-3 font-black leading-snug text-[#2f2320]">
                    {s.title}
                  </span>
                  <span className="mt-1 text-[13px] leading-snug text-[#7a635d]">
                    {s.line}
                  </span>
                </Go>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const { answers, markDone } = useGetStarted();

  // old deep links (/?exam=KCET) predate the landing — forward them to the
  // predictor form so nothing anyone bookmarked or shared breaks
  useEffect(() => {
    if (router.isReady && router.query.exam) {
      router.replace({ pathname: "/predictor", query: router.query });
    }
  }, [router.isReady, router.query, router]);

  const { signedIn, profile } = useStudentData();
  // still loading a signed-in student's answers: no landing flash
  const plan = answers ? planFor(answers) : null;
  const firstName = profile?.name ? profile.name.split(" ")[0] : null;

  let hero;
  if (!answers) hero = signedIn ? <div className="h-[420px]" /> : <Landing />;
  else if (!answers.cls && !answers.skipped) hero = <Landing />;
  else if (plan.kind === "explore") hero = <Chooser />;
  else
    hero = (
      <PlanHero
        plan={plan}
        answers={answers}
        markDone={markDone}
        name={firstName}
      />
    );

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
        {hero}
        <div className="mx-auto max-w-[1080px] px-4 pb-16 sm:px-6">
          {plan && plan.kind !== "explore" ? (
            <h2 className="mb-2 mt-2 text-lg font-black text-[#7a635d]">
              Explore everything else
            </h2>
          ) : null}
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

// skipped the questions, or not a student: pick what to do
function Chooser() {
  const router = useRouter();
  const [action, setAction] = useState(null);

  const go = () => {
    if (!action) return;
    if (action.startsWith("http")) window.open(action, "_blank");
    else router.push(action);
  };

  return (
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
        Or{" "}
        <Link
          href="/get-started"
          className="font-bold text-[#B52326] hover:underline"
        >
          get a plan made for you
        </Link>
      </p>
    </section>
  );
}

import React, { useEffect, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import IconTile from "../components/IconTile";
import { HOME_TILES } from "../utils/siteMap";
import { planFor, stepDone } from "../utils/onboarding";
import useGetStarted from "../utils/useGetStarted";
import { useStudentData } from "../utils/studentData";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The homepage. A first visit gets the gradient hero with the "I want to …"
// chooser and a Get started button (pages/get-started.js asks class,
// stream and exam), then four big tiles (Careers, Colleges, Exams,
// Scholarships). Once the questions are answered, or a signed-in student's
// Avanti profile answers them, the hero becomes that student's plan
// (utils/onboarding.js): the one thing to do now, and the steps after it.
// Skipped, or not a student: the chooser and Get started again. The chooser uses the house Dropdown, never the browser's
// native select.

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
    label: "explore careers that fit me",
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

function PlanHero({ plan, answers, stars, name }) {
  const isDone = (s) => stepDone(s, answers.used, stars);
  const next = plan.steps.find((s) => !isDone(s));
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
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Go to={hero.cta} className={btnPrimary}>
            {hero.cta.label} <ArrowRight size={18} />
          </Go>
          {hero.second ? (
            <Go to={hero.second} className={btnSecond}>
              {hero.second.label}
            </Go>
          ) : null}
        </div>

        <div className="mt-10 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-black text-[#2f2320] sm:text-2xl">
            {plan.title}
          </h2>
          <span className="text-sm font-bold text-[#7a635d]">
            {plan.steps.filter(isDone).length} of {plan.steps.length} done
          </span>
        </div>
        <ol
          className={`mt-4 grid gap-3 ${
            plan.steps.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"
          } sm:grid-cols-2`}
        >
          {plan.steps.map((s, i) => {
            const done = isDone(s);
            const isNext = next && next.id === s.id;
            return (
              <li key={s.id}>
                <Go
                  to={s}
                  className={`flex h-full flex-col rounded-2xl bg-white p-4 transition hover:shadow-md ${
                    isNext
                      ? "border-2 border-[#B52326] shadow-[0_8px_24px_rgba(181,35,38,.12)]"
                      : "border border-[#eaded8]"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${
                        done
                          ? "bg-[#e6f2e8] text-[#3d7a4a]"
                          : isNext
                          ? "bg-[#B52326] text-white"
                          : "bg-[#f6ece9] text-[#7a635d]"
                      }`}
                    >
                      {done ? <Check size={15} strokeWidth={3} /> : i + 1}
                    </span>
                    {done ? (
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
  const { answers } = useGetStarted();

  // old deep links (/?exam=KCET) predate the landing — forward them to the
  // predictor form so nothing anyone bookmarked or shared breaks
  useEffect(() => {
    if (router.isReady && router.query.exam) {
      router.replace({ pathname: "/predictor", query: router.query });
    }
  }, [router.isReady, router.query, router]);

  const { signedIn, profile, stars } = useStudentData();
  // still loading a signed-in student's answers: no landing flash
  const plan = answers ? planFor(answers) : null;
  const firstName = profile?.name ? profile.name.split(" ")[0] : null;

  let hero;
  if (!answers) hero = signedIn ? <div className="h-[420px]" /> : <Chooser />;
  else if (!answers.cls && !answers.skipped) hero = <Chooser />;
  // not a student: the chooser, and a way to change that answer; skipped:
  // the chooser and Get started, since nothing was answered
  else if (plan.kind === "explore")
    hero = <Chooser chip={answers.cls === "none" ? "Not a student" : null} />;
  else
    hero = (
      <PlanHero plan={plan} answers={answers} stars={stars} name={firstName} />
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

// "I want to …" with Get started under it (first visit, or Skip). For a
// "Not a student" answer: the chooser under a chip that changes the answer
function Chooser({ chip }) {
  const router = useRouter();
  const [action, setAction] = useState(null);

  const go = () => {
    if (!action) return;
    if (action.startsWith("http")) window.open(action, "_blank");
    else router.push(action);
  };

  return (
    <section className="bg-gradient-to-b from-[#fbeeec] to-[#fdf8f6] px-4 pb-10 pt-14 text-center">
      {chip ? (
        <div className="mb-5">
          <Chip parts={[chip]} />
        </div>
      ) : null}
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
      {chip ? null : (
        <>
          <Link href="/get-started" className={`${btnPrimary} mt-8`}>
            Get started <ArrowRight size={18} />
          </Link>
          <p className="mt-3 text-sm text-[#7a635d]">
            Answer a few quick questions to get your own plan
          </p>
        </>
      )}
      <ArrowDown size={18} className="mx-auto mt-8 text-[#B52326]/60" />
    </section>
  );
}

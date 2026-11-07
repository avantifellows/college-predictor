import React, { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  FileText,
  ListChecks,
  Scale,
} from "lucide-react";
import IconTile from "../components/IconTile";
import { CV_URL, HOME_TILES } from "../utils/siteMap";
import { heroFor, planFor, stepDone } from "../utils/onboarding";
import useGetStarted from "../utils/useGetStarted";
import { useStudentData } from "../utils/studentData";

// The homepage. A first visit (or a guest who hasn't answered) gets the
// landing: one Get started button (pages/get-started.js asks class, stream
// and exam), what the site holds in numbers, and the tools. Once the
// questions are answered, or a signed-in student's Avanti profile answers
// them, the hero becomes that student's plan (utils/onboarding.js): the one
// thing to do now, the steps after it, ticked as they get done, then the
// four sections. The numbers are counted from the data files
// at build time, rounded down.

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

function PlanHero({ plan, answers, stars, name, signedIn }) {
  const isDone = (s) => stepDone(s, answers.used, stars);
  const next = plan.steps.find((s) => !isDone(s));
  // the headline moves on with the student (utils/onboarding.js heroFor)
  const hero = heroFor(plan, isDone);
  return (
    <section className="bg-gradient-to-b from-[#fbeeec] to-[#fdf8f6] pb-10 pt-10">
      <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
        <Chip parts={plan.chip} name={name} />
        {hero.done ? (
          <>
            <h1 className="mt-5 max-w-3xl text-[clamp(28px,4.3vw,44px)] font-black leading-[1.12] tracking-[-0.02em] text-[#2f2320]">
              You&apos;ve done every step of{" "}
              <span className="text-[#B52326]">your plan</span>
            </h1>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Go
                to={{ href: signedIn ? "/student-corner" : "/login?new=1" }}
                className={btnPrimary}
              >
                {signedIn ? "Make your college plan" : "Sign up to save it"}{" "}
                <ArrowRight size={18} />
              </Go>
              <Go to={{ href: "/get-started" }} className={btnSecond}>
                Change my answers
              </Go>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

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

export default function Home({ counts }) {
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
  const plan = answers ? planFor(answers) : null;
  const firstName = profile?.name ? profile.name.split(" ")[0] : null;
  const hasPlan = plan && plan.kind !== "explore";

  let hero;
  // still loading a signed-in student's answers: no landing flash
  if (!answers && signedIn) hero = <div className="h-[420px]" />;
  else if (hasPlan)
    hero = (
      <PlanHero
        plan={plan}
        answers={answers}
        stars={stars}
        name={firstName}
        signedIn={signedIn}
      />
    );
  // first visit, Skip, or not a student. Not a student keeps a way to
  // change that answer instead of being asked to get started again
  else
    hero = <Landing chip={answers?.cls === "none" ? "Not a student" : null} />;

  return (
    <>
      <Head>
        <title>Futures - Avanti Fellows</title>
        <meta
          name="description"
          content="Free guide to higher education and professional careers in India: predict your colleges, explore careers, compare colleges, and understand every entrance exam."
        />
      </Head>
      <div className="min-h-screen bg-[#fdf8f6]">
        {hero}
        <div className="mx-auto flex max-w-[1080px] flex-col gap-12 px-4 pb-16 sm:px-6">
          {/* a student with a plan needs a way around, not the numbers
              that sell the site on a first visit */}
          {hasPlan ? (
            <section>
              <h2 className="mb-2 text-lg font-black text-[#7a635d]">
                Explore everything else
              </h2>
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
            </section>
          ) : (
            <Numbers counts={counts} />
          )}
          {/* the plan already points at the tools that matter */}
          {hasPlan ? null : <Tools />}
        </div>
      </div>
    </>
  );
}

// first visit: the promise, one button, and three reasons to trust it
function Landing({ chip }) {
  return (
    <section className="bg-gradient-to-b from-[#fbeeec] to-[#fdf8f6] px-4 pb-12 pt-14 text-center">
      {chip ? (
        <div className="mb-5">
          <Chip parts={[chip]} />
        </div>
      ) : null}
      <h1 className="mx-auto max-w-4xl text-[clamp(28px,4.3vw,44px)] font-black leading-[1.12] tracking-[-0.02em] text-[#2f2320]">
        Your guide to <span className="text-[#B52326]">higher education</span>{" "}
        and professional careers in India
      </h1>
      {chip ? null : (
        <Link href="/get-started" className={`${btnPrimary} mt-9`}>
          Get started <ArrowRight size={18} />
        </Link>
      )}
      <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm font-bold text-[#5c4a45]">
        {["Completely free", "No ads", "Official data"].map((t) => (
          <li key={t} className="inline-flex items-center gap-1.5">
            <Check size={15} strokeWidth={3} className="text-[#3d7a4a]" />
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}

// what the site holds; each card opens its section
const NUMBERS = [
  {
    key: "colleges",
    href: "/sections/colleges",
    label: "colleges",
    line: "Placements, fees and cutoffs",
  },
  {
    key: "careers",
    href: "/sections/careers",
    label: "careers",
    line: "What they involve, how to get in",
  },
  {
    key: "exams",
    href: "/sections/exams",
    label: "entrance exams",
    line: "Dates, eligibility and how they work",
  },
  {
    key: "scholarships",
    href: "/scholarships",
    label: "scholarships",
    line: "Who can apply and how",
  },
];

function Numbers({ counts }) {
  return (
    <ul className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#eaded8] bg-white md:grid-cols-4">
      {NUMBERS.map(({ key, href, label, line }, i) => (
        <li
          key={key}
          className={`border-[#eaded8] ${i % 2 ? "border-l" : ""} ${
            i >= 2 ? "border-t md:border-t-0" : ""
          } ${i === 2 ? "md:border-l" : ""}`}
        >
          <Link
            href={href}
            className="flex h-full flex-col items-center px-3 py-6 text-center transition hover:bg-[#fdf8f6]"
          >
            <span className="text-[clamp(28px,4vw,40px)] font-black leading-none text-[#B52326]">
              {counts[key]}
            </span>
            <span className="mt-2 font-black text-[#2f2320]">{label}</span>
            <span className="mt-1 text-[13px] leading-snug text-[#7a635d]">
              {line}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const TOOLS = [
  {
    href: "/career-quiz",
    icon: Compass,
    title: "Career quiz",
    line: "Careers that fit what you enjoy",
  },
  {
    href: "/mock-allotment?exam=josaa",
    icon: ListChecks,
    title: "JoSAA mock allotment",
    line: "Practise your choices before the real rounds",
  },
  {
    href: "/compare",
    icon: Scale,
    title: "Compare colleges",
    line: "Fees, placements and cutoffs side by side",
  },
  {
    href: CV_URL,
    icon: FileText,
    title: "Resume builder",
    line: "A clean resume in minutes",
    external: true,
  },
];

function Tools() {
  return (
    <section>
      <h2 className="text-center text-xs font-extrabold uppercase tracking-[0.12em] text-[#B52326]">
        Tools made for you
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        {TOOLS.map((t) => (
          <IconTile key={t.title} {...t} />
        ))}
      </div>
    </section>
  );
}

// rounded down so the claim stays true as data moves: 4,751 → 4,700+,
// 156 → 150+
const atLeast = (n) => {
  const step = n >= 1000 ? 100 : 10;
  return `${(Math.floor(n / step) * step).toLocaleString("en-IN")}+`;
};

export async function getStaticProps() {
  const fs = await import("fs");
  const path = await import("path");
  const read = (f) =>
    JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "public/data", f), "utf8")
    );
  return {
    props: {
      counts: {
        colleges: atLeast(read("colleges/colleges.json").length),
        careers: atLeast(read("careers/careers.json").length),
        exams: atLeast(read("exams/exams.json").length),
        scholarships: atLeast(
          read("scholarships/scholarship_data.json").length
        ),
      },
    },
  };
}

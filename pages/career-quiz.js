import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import BackLink from "../components/BackLink";
import { loadCareers } from "../components/careerShared";
import {
  RIASEC,
  RIASEC_TYPES,
  groupNearTies,
  isFlat,
  recommendCareers,
} from "../utils/riasec";

// The Career Quiz: 20 questions about what a student enjoys, each option
// tagged with a RIASEC interest type (data-sources/riasec_quiz.csv). The
// picks become an interest profile, matched to every career's RIASEC scores
// (utils/riasec.js, the "Quiz-to-Career Matching" spec).

const STORE = "futures:careerQuiz";
// a type's colour, for its badge and profile bar
const TYPE_COLOUR = {
  R: "#a24b3f",
  I: "#3f6e8a",
  A: "#8a5fa2",
  S: "#3f8a5c",
  E: "#b8862f",
  C: "#5c5346",
};
// enough answers for a fair profile, if a student wants to stop early
const MIN_ANSWERS = 10;

// The sheet lists every question's options in R-I-A-S-E-C order; shown that
// way students would learn the pattern. A fixed shuffle per question keeps
// the order the same on every visit.
const shuffled = (options, seed) => {
  const out = [...options];
  let s = seed * 9301 + 49297;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const TypeBadge = ({ k }) => (
  <span
    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
    style={{ background: TYPE_COLOUR[k] }}
  >
    {k}
  </span>
);

export default function CareerQuiz() {
  const [questions, setQuestions] = useState(null);
  const [careers, setCareers] = useState(null);
  const [error, setError] = useState(null);
  // screen: "intro" | "quiz" | "results"
  const [screen, setScreen] = useState("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  // a quick double tap must not answer the next question too
  const advancing = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/careers/quiz.json").then((r) => r.json()),
      loadCareers(),
    ])
      .then(([q, c]) => {
        setQuestions(q);
        setCareers(c);
      })
      .catch(() => setError("Couldn't load the quiz. Please refresh."));
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORE) || "null");
      if (saved) {
        setAnswers(saved.answers || {});
        setStep(saved.step || 0);
        setScreen(saved.screen || "intro");
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORE,
        JSON.stringify({ answers, step, screen })
      );
    } catch (e) {}
  }, [answers, step, screen]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen, step]);

  const answered = Object.keys(answers).length;
  const result = useMemo(
    () =>
      screen === "results" && careers
        ? recommendCareers(answers, careers, 10)
        : null,
    [screen, careers, answers]
  );

  const start = () => {
    setAnswers({});
    setStep(0);
    setScreen("quiz");
  };
  // functional, so a pick advances from the step it was made on even when
  // its click handler was rendered a step earlier
  const next = () => setStep((s) => s + 1);
  // past the last question: the results
  useEffect(() => {
    if (screen === "quiz" && questions && step >= questions.length) {
      setStep(questions.length - 1);
      setScreen("results");
    }
  }, [screen, step, questions]);
  const pick = (q, type) => {
    if (advancing.current) return;
    advancing.current = true;
    setAnswers((a) => ({ ...a, [q.id]: type }));
    // a short beat so the student sees their pick land
    setTimeout(() => {
      advancing.current = false;
      next();
    }, 180);
  };
  const skip = (q) => {
    setAnswers((a) => {
      const rest = { ...a };
      delete rest[q.id];
      return rest;
    });
    next();
  };

  const card =
    "mx-auto max-w-3xl rounded-2xl border border-[#eee1d7] bg-white p-5 shadow-sm sm:p-8";

  const renderIntro = () => (
    <div className={card}>
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#B52326]">
        Career Quiz
      </p>
      <h1 className="mt-2 text-3xl font-black leading-tight text-[#2f2320] sm:text-4xl">
        Find careers that fit what you enjoy
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#5c4b46]">
        {questions?.length || 20} quick questions about how you like to spend
        your time. There are no right answers: pick what sounds most like you.
        We match your answers to {careers?.length || "170"} careers.
      </p>
      <ul className="mt-5 grid gap-2 text-sm text-[#5c4b46] sm:grid-cols-3">
        <li className="rounded-xl bg-[#fbeeec] px-4 py-3">
          <b className="block text-[#2f2320]">About 5 minutes</b>
          One answer per question
        </li>
        <li className="rounded-xl bg-[#fbeeec] px-4 py-3">
          <b className="block text-[#2f2320]">Skip any question</b>
          Leave out what doesn&apos;t fit
        </li>
        <li className="rounded-xl bg-[#fbeeec] px-4 py-3">
          <b className="block text-[#2f2320]">Your top 10 careers</b>
          With why each one fits
        </li>
      </ul>
      <button
        type="button"
        onClick={start}
        disabled={!questions || !careers}
        className="mt-6 inline-flex min-h-[50px] items-center gap-2 rounded-[10px] bg-[#B52326] px-[26px] text-base font-bold text-white transition hover:bg-[#9E1F22] disabled:bg-[#e0cdc6]"
      >
        {questions && careers ? "Start the quiz" : "Loading…"}
        <ArrowRight size={18} />
      </button>
      {answered > 0 && (
        <button
          type="button"
          onClick={() => setScreen("quiz")}
          className="ml-3 mt-6 text-sm font-bold text-[#B52326] underline underline-offset-2"
        >
          Continue where you left off
        </button>
      )}
    </div>
  );

  const renderQuestion = () => {
    const q = questions[step];
    const pct = Math.round((step / questions.length) * 100);
    return (
      <div className={card}>
        <div className="flex items-center justify-between text-sm font-semibold text-[#7a635d]">
          <span>
            Question {step + 1} of {questions.length}
          </span>
          {answered >= MIN_ANSWERS && (
            <button
              type="button"
              onClick={() => setScreen("results")}
              className="font-bold text-[#B52326] hover:underline"
            >
              See my results now
            </button>
          )}
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-[#f1e2dd]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[#B52326] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <h2 className="mt-6 text-xl font-black leading-snug text-[#2f2320] sm:text-2xl">
          {q.question}
        </h2>
        <div className="mt-5 grid gap-2.5">
          {shuffled(q.options, q.id).map((o) => {
            const on = answers[q.id] === o.type;
            return (
              <button
                key={o.type}
                type="button"
                onClick={() => pick(q, o.type)}
                aria-pressed={on}
                className={`rounded-xl border-[1.5px] px-4 py-3.5 text-left text-[15px] leading-snug transition ${
                  on
                    ? "border-[#B52326] bg-[#B52326] text-white"
                    : "border-[#e0cdc6] bg-[#fffdfa] text-[#2f2320] hover:border-[#B52326]"
                }`}
              >
                {o.text}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              step === 0 ? setScreen("intro") : setStep(step - 1)
            }
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#7a635d] hover:text-[#2f2320]"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            type="button"
            onClick={() => skip(q)}
            className="text-sm font-bold text-[#7a635d] hover:text-[#2f2320]"
          >
            Skip this question
          </button>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!result) return null;
    const { profile, code, matches } = result;
    const order = [...RIASEC].sort((a, b) => profile[b] - profile[a]);
    const groups = groupNearTies(matches);
    let rank = 0;
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className={card}>
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#B52326]">
            Your interest profile
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#2f2320]">
            {code
              .split("")
              // only types the student actually picked
              .filter((k) => profile[k] > 0)
              .map((k) => RIASEC_TYPES[k].name)
              .join(", ")}
          </h1>
          <p className="mt-2 text-sm text-[#6d5550]">
            From your {answered} answers. Interest types are a common way career
            counsellors describe what people enjoy at work.
          </p>
          {isFlat(profile) && (
            <p className="mt-4 rounded-xl border border-[#eaded8] bg-[#fffdfa] px-4 py-3 text-sm leading-relaxed text-[#5c4b46]">
              Your interests are broad: no single type stands out. The careers
              below fit you a little, rather than a lot. Explore widely, and
              take the quiz again later if your interests sharpen.
            </p>
          )}
          <div className="mt-5 space-y-2.5">
            {order.map((k) => (
              <div key={k} className="flex items-center gap-3">
                <TypeBadge k={k} />
                <div className="w-28 shrink-0 text-sm font-semibold text-[#2f2320]">
                  {RIASEC_TYPES[k].name}
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#f1e2dd]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${profile[k]}%`,
                      background: TYPE_COLOUR[k],
                    }}
                  />
                </div>
                <div className="w-10 text-right text-sm tabular-nums text-[#7a635d]">
                  {Math.round(profile[k])}%
                </div>
              </div>
            ))}
          </div>
          <details className="mt-4 text-sm text-[#5c4b46]">
            <summary className="cursor-pointer font-semibold text-[#B52326]">
              What the six types mean
            </summary>
            <ul className="mt-2 space-y-1.5">
              {RIASEC.map((k) => (
                <li key={k}>
                  <b className="text-[#2f2320]">{RIASEC_TYPES[k].name}:</b>{" "}
                  {RIASEC_TYPES[k].theme}
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className={card}>
          <h2 className="text-2xl font-black text-[#2f2320]">
            Careers that fit you
          </h2>
          <p className="mt-1 text-sm text-[#6d5550]">
            Matched on interests alone. Open a career to see the work, pay and
            the exams that lead there.
          </p>
          <div className="mt-5 space-y-3">
            {groups.map((group) => (
              <div
                key={group[0].career.career_id}
                className={
                  group.length > 1
                    ? "rounded-2xl border border-dashed border-[#e0cdc6] p-2.5"
                    : ""
                }
              >
                {group.length > 1 && (
                  <p className="px-1.5 pb-2 text-xs font-bold uppercase tracking-[0.06em] text-[#7a635d]">
                    These fit you about equally
                  </p>
                )}
                <div className="space-y-2.5">
                  {group.map((m) => {
                    rank += 1;
                    const c = m.career;
                    return (
                      <Link
                        key={c.career_id}
                        href={`/careers/${c.career_id}`}
                        className="flex items-start gap-3 rounded-xl border border-[#eaded8] bg-[#fffdfa] px-4 py-3.5 transition hover:border-[#B52326]"
                      >
                        <span className="mt-0.5 w-6 shrink-0 text-sm font-bold tabular-nums text-[#b9a39c]">
                          {rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="text-base font-bold text-[#2f2320]">
                              {c.name}
                            </span>
                            <span className="text-sm font-bold tabular-nums text-[#B52326]">
                              {Math.round(m.similarity * 100)}% match
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-[#5c4b46]">
                            {m.reason}
                          </p>
                          <p className="mt-1 text-xs text-[#7a635d]">
                            {c.domain}
                            {c.pay?.start ? ` · Starts at ${c.pay.start}` : ""}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-[#B52326] px-5 py-2.5 text-sm font-bold text-[#B52326] hover:bg-[#fbeeec]"
            >
              <RotateCcw size={16} /> Take the quiz again
            </button>
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#B52326] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#9E1F22]"
            >
              Explore all careers <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Career Quiz - Futures</title>
        <meta
          name="description"
          content="Twenty quick questions about what you enjoy, matched to careers that fit your interests."
        />
      </Head>
      <div className="min-h-screen px-3 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3">
            <BackLink />
          </div>
        </div>
        {error ? (
          <p className="py-10 text-center text-sm text-[#8f2e31]">{error}</p>
        ) : screen === "results" && careers ? (
          renderResults()
        ) : screen === "quiz" && questions?.[step] ? (
          renderQuestion()
        ) : (
          renderIntro()
        )}
      </div>
    </>
  );
}

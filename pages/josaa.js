import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight, Check } from "lucide-react";

// JoSAA landing: a short awareness quiz on how seat allotment works, then
// the mock allotment simulator. Round counts change year to year (2023: 6,
// 2024: 5, 2025: 6 — the official archive our simulator data comes from),
// so the rounds question names the year.
const QUESTIONS = [
  {
    q: "How many rounds did JoSAA seat allotment have in 2025?",
    opts: ["1", "5", "6"],
    correct: 2,
    fb: "JoSAA 2025 ran 6 rounds. In each round you are allotted a seat based on your rank and your choice list. The number can change from year to year.",
  },
  {
    q: "How many choices can you fill?",
    opts: ["Less than 10", "Less than 100", "Unlimited"],
    correct: 2,
    fb: "There is no limit. Fill every college and branch you would be willing to join, in the order you want them.",
  },
  {
    q: "Can you change your choices between rounds?",
    opts: ["Yes", "No"],
    correct: 1,
    fb: "No. You lock your choices before round 1, and after that you cannot change them.",
  },
  {
    lead: "After each round, if you have been allotted a seat, you get 3 options: freeze, float or slide.",
    q: "What does 'freeze' mean?",
    opts: [
      "Accept the seat allotted to me and exit the process",
      "Accept the seat but stay in the process",
    ],
    correct: 0,
    fb: "Freeze means you accept the seat allotted to you and exit the process. You will not be considered in later rounds.",
  },
  {
    q: "What does 'float' mean?",
    opts: [
      "Keep the current seat but stay in the process for a better seat at any college",
      "Keep the current seat but stay in the process for a better seat at the same college",
      "Give up the current seat and wait for a better seat in the next round",
    ],
    correct: 0,
    fb: "Float keeps your current seat while you stay in the process for a better seat at any college.",
  },
  {
    q: "What does 'slide' mean?",
    opts: [
      "Keep the current seat but stay in the process for a better seat at any college",
      "Keep the current seat but stay in the process for a better seat at the same college",
      "Give up the current seat and wait for a better seat in the next round",
    ],
    correct: 1,
    fb: "Slide keeps your current seat while you stay in the process for a better branch at the same college.",
    extra:
      "Don't worry! You won't lose your seat if you choose to float or slide.",
  },
  {
    q: "What if you don't have a seat at the end of the last JoSAA round?",
    opts: [
      "I can't do anything",
      "I can apply for CSAB to try again for any vacant seats",
    ],
    correct: 1,
    fb: "CSAB is a special round after JoSAA's last round, where remaining vacant seats are allotted to eligible candidates. You apply for CSAB separately and fill a fresh set of choices.",
    notes: [
      {
        kind: "plain",
        text: "You can apply for CSAB even if you have frozen your seat in JoSAA.",
      },
      {
        kind: "warn",
        lead: "Be careful",
        text: " — if you are allotted a seat through CSAB, you automatically lose your JoSAA seat!",
      },
      {
        kind: "rec",
        lead: "Our recommendation",
        text: " — take part in CSAB only if you don't have a seat, or if you are applying for a much better seat than your JoSAA seat.",
      },
    ],
  },
];

const shell =
  "mx-auto max-w-2xl rounded-2xl border border-[#eee1d7] bg-white p-5 shadow-sm sm:p-8";
const cta =
  "flex w-full items-center justify-between gap-3 rounded-xl px-5 py-4 text-left text-base font-bold transition";

const Intro = ({ onQuiz }) => (
  <div className={shell}>
    <h1 className="text-2xl font-black leading-snug text-[#2f2320] sm:text-3xl">
      Congrats! You cleared JEE!
    </h1>
    <p className="mt-3 text-lg leading-relaxed text-[#4f403a]">
      The next step is to choose your college and course in the JoSAA seat
      allotment process.
    </p>
    <div className="mt-6 flex flex-col gap-3">
      <button
        type="button"
        onClick={onQuiz}
        className={`${cta} bg-[#B52326] text-white hover:bg-[#9E1F22]`}
      >
        Take this short quiz to understand how JoSAA seat allotment works
        <ArrowRight size={18} className="shrink-0" />
      </button>
      <Link
        href="/mock-allotment"
        className={`${cta} border border-[#e0cdc6] bg-[#fffdfa] text-[#8f2e31] hover:border-[#B52326]/50`}
      >
        Try the JoSAA seat allotment simulation yourself
        <ArrowRight size={18} className="shrink-0" />
      </Link>
    </div>
  </div>
);

const NOTE_STYLE = {
  plain: "text-[#4f403a]",
  warn: "rounded-lg bg-[#fdeceb] px-3 py-2 text-[#8f2e31]",
  rec: "rounded-lg bg-[#eef6ef] px-3 py-2 text-[#2f5d3a]",
};

const Quiz = ({ onExit }) => {
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState(null);
  const total = QUESTIONS.length;

  if (at >= total) {
    return (
      <div className={shell}>
        <h1 className="text-2xl font-black leading-snug text-[#2f2320]">
          Try the JoSAA seat allotment simulation yourself!
        </h1>
        <Link
          href="/mock-allotment"
          className={`${cta} mt-6 bg-[#B52326] text-white hover:bg-[#9E1F22]`}
        >
          Open the JoSAA seat allotment simulator
          <ArrowRight size={18} className="shrink-0" />
        </Link>
        <div className="mt-6 flex justify-between text-sm font-bold">
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setAt(total - 1);
            }}
            className="text-[#6d5550] hover:text-[#8f2e31]"
          >
            ← Back to the last question
          </button>
          <button
            type="button"
            onClick={onExit}
            className="text-[#6d5550] hover:text-[#8f2e31]"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const item = QUESTIONS[at];
  const answered = picked != null;
  const right = answered && picked === item.correct;
  const go = (n) => {
    setPicked(null);
    setAt(n);
  };

  return (
    <div className={shell}>
      <div className="mb-5 flex items-center gap-1.5">
        {QUESTIONS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < at
                ? "bg-[#B52326]"
                : i === at
                ? "bg-[#B52326]/60"
                : "bg-[#eee1d7]"
            }`}
          />
        ))}
      </div>
      <div className="text-xs font-black uppercase tracking-wide text-[#B52326]">
        Question {at + 1} of {total}
      </div>
      {item.lead ? (
        <p className="mt-2 text-sm text-[#4f403a]">{item.lead}</p>
      ) : null}
      <h2 className="mt-1 text-xl font-black leading-tight text-[#2f2320] sm:text-2xl">
        {item.q}
      </h2>

      <div className="mt-4 flex flex-col gap-2">
        {item.opts.map((o, i) => {
          const good = answered && i === item.correct;
          const bad = answered && i === picked && i !== item.correct;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setPicked(i)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition sm:text-base ${
                good
                  ? "border-[#2f7a45] bg-[#eef6ef] text-[#1f4d2c]"
                  : bad
                  ? "border-[#B52326] bg-[#fdeceb] text-[#8f2e31]"
                  : "border-[#e0cdc6] bg-white text-[#2f2320] hover:border-[#B52326]/50"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  good
                    ? "border-[#2f7a45] bg-[#2f7a45] text-white"
                    : "border-[#d8c7c1]"
                }`}
              >
                {good ? <Check size={13} strokeWidth={3} /> : null}
              </span>
              {o}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed ${
            right
              ? "bg-[#eef6ef] text-[#1f4d2c]"
              : "bg-[#fdeceb] text-[#6b2224]"
          }`}
        >
          <div className="font-black">{right ? "Correct" : "Not quite"}</div>
          <p className="mt-1">{item.fb}</p>
          {item.extra ? <p className="mt-1 font-bold">{item.extra}</p> : null}
        </div>
      ) : null}
      {answered && item.notes ? (
        <div className="mt-3 flex flex-col gap-2 text-sm leading-relaxed">
          {item.notes.map((n, i) => (
            <p key={i} className={NOTE_STYLE[n.kind]}>
              {n.lead ? <b>{n.lead}</b> : null}
              {n.text}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (at > 0 ? go(at - 1) : onExit())}
          className="text-sm font-bold text-[#6d5550] hover:text-[#8f2e31]"
        >
          {at > 0 ? "← Previous question" : "← Back"}
        </button>
        <button
          type="button"
          disabled={!answered}
          onClick={() => go(at + 1)}
          className={`inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-black text-white transition ${
            answered
              ? "bg-[#B52326] hover:bg-[#9E1F22]"
              : "cursor-not-allowed bg-[#B52326]/40"
          }`}
        >
          {at === total - 1 ? "Finish" : "Next question"}{" "}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default function JoSAA() {
  const router = useRouter();
  // ?quiz=1 is its own history entry, so Back from the quiz lands on the
  // intro instead of leaving the page
  const inQuiz = router.query.quiz === "1";
  return (
    <>
      <Head>
        <title>JoSAA Quiz and Simulator - Futures</title>
        <meta
          name="description"
          content="How JoSAA seat allotment works: a short quiz on rounds, choices, freeze, float, slide and CSAB, then a mock allotment to try it yourself."
        />
      </Head>
      <div className="min-h-screen px-3 py-6 sm:px-6 sm:py-10">
        {inQuiz ? (
          <Quiz
            onExit={() => router.push("/josaa", undefined, { shallow: true })}
          />
        ) : (
          <Intro
            onQuiz={() =>
              router.push("/josaa?quiz=1", undefined, { shallow: true })
            }
          />
        )}
      </div>
    </>
  );
}

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

// The "learn the process, then simulate it" screens, shared by every
// counselling landing (/josaa, /mhtcet). Each page supplies its own intro
// copy and question list; the quiz chrome, the feedback colours and the
// hand-off into /mock-allotment?exam=<id> are identical, so they live here
// rather than being copy-pasted per exam.

export const shell =
  "mx-auto max-w-2xl rounded-2xl border border-[#eee1d7] bg-white p-5 shadow-sm sm:p-8";
export const cta =
  "flex w-full items-center justify-between gap-3 rounded-xl px-5 py-4 text-left text-base font-bold transition";

export const Intro = ({ onQuiz, heading, lead, quizCta, simCta, simHref }) => (
  <div className={shell}>
    <h1 className="text-2xl font-black leading-snug text-[#2f2320] sm:text-3xl">
      {heading}
    </h1>
    <p className="mt-3 text-lg leading-relaxed text-[#4f403a]">{lead}</p>
    <div className="mt-6 flex flex-col gap-3">
      <button
        type="button"
        onClick={onQuiz}
        className={`${cta} bg-[#B52326] text-white hover:bg-[#9E1F22]`}
      >
        {quizCta}
        <ArrowRight size={18} className="shrink-0" />
      </button>
      <Link
        href={simHref}
        className={`${cta} border border-[#e0cdc6] bg-[#fffdfa] text-[#8f2e31] hover:border-[#B52326]/50`}
      >
        {simCta}
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

export const Quiz = ({ onExit, questions, doneHeading, doneCta, simHref }) => {
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState(null);
  const total = questions.length;

  if (at >= total) {
    return (
      <div className={shell}>
        <h1 className="text-2xl font-black leading-snug text-[#2f2320]">
          {doneHeading}
        </h1>
        <Link
          href={simHref}
          className={`${cta} mt-6 bg-[#B52326] text-white hover:bg-[#9E1F22]`}
        >
          {doneCta}
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

  const item = questions[at];
  const answered = picked != null;
  const right = answered && picked === item.correct;
  const go = (n) => {
    setPicked(null);
    setAt(n);
  };

  return (
    <div className={shell}>
      <div className="mb-5 flex items-center gap-1.5">
        {questions.map((_, i) => (
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

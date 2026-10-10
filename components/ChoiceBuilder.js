import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { BRANCH_FAMILIES, INTERESTS, WORKPLACES } from "../utils/choiceScore";

// College choice builder (JoSAA): a short quiz whose answers order the
// predictor's combined list into a choice list (planFor in
// utils/choiceScore.js). The answers:
//   states     preferred states (college location), or null for none; not
//              part of the order: the results table can put these first
//   families   the one branch family they want (BRANCH_FAMILIES id), or null
//   interest   what they want to do after college (INTERESTS id)
//   workplace  where they see themselves working (WORKPLACES id)

const Choice = ({ on, onClick, children, sub }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`w-full rounded-xl border-[1.5px] px-4 py-3 text-left transition ${
      on
        ? "border-[#B52326] bg-[#B52326] text-white"
        : "border-[#d8c7c1] bg-[#fffdfa] text-[#2f2320] hover:border-[#B52326]"
    }`}
  >
    <span className="block text-[15px] font-bold">{children}</span>
    {sub && (
      <span
        className={`mt-0.5 block text-xs ${
          on ? "text-white/85" : "text-[#6d5550]"
        }`}
      >
        {sub}
      </span>
    )}
  </button>
);

const Chips = ({ options, selected, onToggle }) => (
  <div className="flex max-h-[44vh] flex-wrap gap-2 overflow-y-auto pr-1">
    {options.map(({ value, label }) => {
      const on = selected.includes(value);
      return (
        <button
          key={value}
          type="button"
          onClick={() => onToggle(value)}
          aria-pressed={on}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            on
              ? "border-[#B52326] bg-[#B52326] text-white"
              : "border-[#d8c7c1] bg-white text-[#5b3a34] hover:border-[#B52326]"
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

const ChoiceBuilder = ({ states, branches, initial, onDone, onClose }) => {
  const [answers, setAnswers] = useState(() => ({
    hasState: initial ? !!initial.states?.length : null,
    states: initial?.states || [],
    hasBranch: initial ? !!initial.families?.length : null,
    family: initial?.families?.[0] || null,
    interest: initial?.interest || null,
    workplace: initial?.workplace || null,
  }));
  // branch families with a branch in these results
  const familyOptions = useMemo(
    () =>
      BRANCH_FAMILIES.filter((f) =>
        branches.some((b) => f.parents.includes(b.id))
      ),
    [branches]
  );
  const set = (patch) => setAnswers((a) => ({ ...a, ...patch }));
  const toggleState = (value) =>
    setAnswers((a) => ({
      ...a,
      states: a.states.includes(value)
        ? a.states.filter((v) => v !== value)
        : [...a.states, value],
    }));

  // the questions that apply, given the answers so far
  const steps = useMemo(
    () =>
      [
        "hasState",
        answers.hasState && "states",
        "hasBranch",
        answers.hasBranch && "branch",
        "interest",
        "workplace",
      ].filter(Boolean),
    [answers.hasState, answers.hasBranch]
  );
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const answered = {
    hasState: answers.hasState !== null,
    states: answers.states.length > 0,
    hasBranch: answers.hasBranch !== null,
    branch: !!answers.family,
    interest: !!answers.interest,
    workplace: !!answers.workplace,
  }[step];
  const last = stepIndex >= steps.length - 1;
  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));

  // a "No" clears what its follow-up collected
  const finish = () =>
    onDone({
      states: answers.hasState && answers.states.length ? answers.states : null,
      families: answers.hasBranch && answers.family ? [answers.family] : null,
      branches: null,
      interest: answers.interest,
      workplace: answers.workplace,
    });

  const body = {
    hasState: (
      <>
        <h3 className="choice-q">Do you have a preferred state?</h3>
        <p className="choice-help">For where the college is.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice
            on={answers.hasState === true}
            onClick={() => set({ hasState: true })}
          >
            Yes
          </Choice>
          <Choice
            on={answers.hasState === false}
            onClick={() => set({ hasState: false })}
          >
            No, anywhere is fine
          </Choice>
        </div>
      </>
    ),
    states: (
      <>
        <h3 className="choice-q">Which states? Select all that apply.</h3>
        <p className="choice-help">States with a college in your list.</p>
        <Chips
          options={states.map((s) => ({ value: s, label: s }))}
          selected={answers.states}
          onToggle={toggleState}
        />
      </>
    ),
    hasBranch: (
      <>
        <h3 className="choice-q">Do you have a preferred branch?</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Choice
            on={answers.hasBranch === true}
            onClick={() => set({ hasBranch: true })}
          >
            Yes
          </Choice>
          <Choice
            on={answers.hasBranch === false}
            onClick={() => set({ hasBranch: false })}
          >
            No, I&apos;m open
          </Choice>
        </div>
      </>
    ),
    branch: (
      <>
        <h3 className="choice-q">Which branch?</h3>
        <p className="choice-help">Pick the one you want most.</p>
        <div className="grid gap-2">
          {familyOptions.map((f) => (
            <Choice
              key={f.id}
              on={answers.family === f.id}
              onClick={() => set({ family: f.id })}
              sub={f.hint}
            >
              {f.label}
            </Choice>
          ))}
        </div>
      </>
    ),
    interest: (
      <>
        <h3 className="choice-q">What would you like to do after college?</h3>
        <p className="choice-help">
          Not sure?{" "}
          <a
            href="/career-quiz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#B52326] underline"
          >
            Take the career quiz
          </a>{" "}
          and come back.
        </p>
        <div className="grid gap-2">
          {INTERESTS.map((i) => (
            <Choice
              key={i.id}
              on={answers.interest === i.id}
              onClick={() => set({ interest: i.id })}
              sub={i.hint}
            >
              {i.label}
            </Choice>
          ))}
        </div>
      </>
    ),
    workplace: (
      <>
        <h3 className="choice-q">
          Where do you most likely see yourself working?
        </h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {WORKPLACES.map((w) => (
            <Choice
              key={w.id}
              on={answers.workplace === w.id}
              onClick={() => set({ workplace: w.id })}
            >
              {w.label}
            </Choice>
          ))}
        </div>
      </>
    ),
  }[step];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(36,18,14,.55)] p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Help me choose a college and course"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[20px] bg-white p-5 text-left shadow-[0_24px_56px_rgba(74,42,38,.16)] sm:rounded-[20px] sm:p-6"
      >
        <style>{`.choice-q{font-family:Lato,sans-serif;font-weight:900;font-size:21px;line-height:1.25;color:#2f2320}
          .choice-help{margin:4px 0 14px;font-size:13px;color:#6d5550}`}</style>
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-[#B52326]">
            Question {stepIndex + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[#7a635d] hover:bg-[#f3dcd8]"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#f1e2dd]">
          <div
            className="h-full rounded-full bg-[#B52326] transition-all"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="text-sm font-bold text-[#7a635d] hover:text-[#2f2320] disabled:invisible"
          >
            ← Back
          </button>
          <button
            type="button"
            disabled={!answered}
            onClick={() => (last ? finish() : next())}
            className="rounded-[10px] bg-[#B52326] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#9E1F22] disabled:cursor-not-allowed disabled:bg-[#e0cdc6]"
          >
            {last ? "Build my list" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChoiceBuilder;

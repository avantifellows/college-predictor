import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { BRANCH_FAMILIES, INTERESTS, WORKPLACES } from "../utils/choiceScore";
import Dropdown from "./dropdown";

// College choice builder (JoSAA): a short quiz whose answers order the
// predictor's combined list into a choice list (planFor in
// utils/choiceScore.js). Always four questions; a one-tap answer moves on
// by itself. The answers:
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

const ChoiceBuilder = ({ states, branches, initial, onDone, onClose }) => {
  const [answers, setAnswers] = useState(() => ({
    states: initial?.states || [],
    // null until answered: "any" (I'm open) or a BRANCH_FAMILIES id
    family: initial ? initial.families?.[0] || "any" : null,
    interest: initial?.interest || null,
    workplace: initial?.workplace || null,
    anywhere: initial ? !initial.states?.length : false,
  }));
  // branch families with a branch in these results
  const familyOptions = useMemo(
    () =>
      BRANCH_FAMILIES.filter((f) =>
        branches.some((b) => f.parents.includes(b.id))
      ),
    [branches]
  );
  const STEPS = ["states", "branch", "interest", "workplace"];
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const last = stepIndex === STEPS.length - 1;
  const back = () => setStepIndex((i) => Math.max(0, i - 1));
  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  useEffect(() => {
    // an Escape the states menu used to close itself is not for us
    const onKey = (e) => e.key === "Escape" && !e.defaultPrevented && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const finish = (a) =>
    onDone({
      states: !a.anywhere && a.states.length ? a.states : null,
      families: a.family && a.family !== "any" ? [a.family] : null,
      branches: null,
      interest: a.interest,
      workplace: a.workplace,
    });

  // a one-tap answer: the pick shows for a beat, then the next question (or,
  // on the last one, the list)
  const advancing = useRef(false);
  const choose = (patch) => {
    if (advancing.current) return;
    advancing.current = true;
    const nextAnswers = { ...answers, ...patch };
    setAnswers(nextAnswers);
    setTimeout(() => {
      advancing.current = false;
      if (last) finish(nextAnswers);
      else next();
    }, 200);
  };

  const body = {
    states: (
      <>
        <h3 className="choice-q">Where would you like to study?</h3>
        <div className="mt-4 grid gap-2">
          <Choice
            on={answers.anywhere}
            onClick={() => choose({ anywhere: true, states: [] })}
          >
            Anywhere is fine
          </Choice>
          <div className="pt-2">
            <span className="mb-1.5 block text-xs font-bold text-[#4a3a36]">
              Or pick states
            </span>
            <Dropdown
              isMulti
              options={states.map((st) => ({ value: st, label: st }))}
              selectedValue={answers.states}
              onChange={(opts) =>
                setAnswers((a) => ({
                  ...a,
                  anywhere: false,
                  states: (opts || []).map((o) => o.value),
                }))
              }
              placeholder="Type a state…"
              menuAtPageLevel
            />
          </div>
        </div>
      </>
    ),
    branch: (
      <>
        <h3 className="choice-q">Which branch do you want most?</h3>
        <div className="mt-4 grid gap-2">
          <Choice
            on={answers.family === "any"}
            onClick={() => choose({ family: "any" })}
          >
            I&apos;m open to any branch
          </Choice>
          {familyOptions.map((f) => (
            <Choice
              key={f.id}
              on={answers.family === f.id}
              onClick={() => choose({ family: f.id })}
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
              onClick={() => choose({ interest: i.id })}
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
              onClick={() => choose({ workplace: w.id })}
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
            Question {stepIndex + 1} of {STEPS.length}
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
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={stepIndex === 0}
            className="text-sm font-bold text-[#7a635d] hover:text-[#2f2320] disabled:invisible"
          >
            ← Back
          </button>
          {/* the one question that isn't a single tap: picked states */}
          {step === "states" && answers.states.length > 0 && (
            <button
              type="button"
              onClick={next}
              className="rounded-[10px] bg-[#B52326] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#9E1F22]"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChoiceBuilder;

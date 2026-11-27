import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Lightbulb, X } from "lucide-react";
import { explainOrder } from "../utils/choiceScore";
import { FAQS, OPEN_FAQ_EVENT } from "./PredictorFaq";

// "Why this order": the Help me choose answers as a short walk-through,
// one line per step (explainOrder in utils/choiceScore.js), shown with the
// ordered list in the college predictor and in the mock allotment's picks.
// Next / Back / the dots move through it; Got it (or ×) folds it into a
// "Why this order?" link. New answers open it again at step 1.

const NIRF_Q = "What is NIRF?";
const NIRF_A = FAQS.find((f) => f.q === NIRF_Q)?.a;

const OrderNote = ({ prefs, className = "" }) => {
  const steps = prefs ? explainOrder(prefs) : [];
  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState(0);
  // with no FAQ on the page (the mock), the NIRF answer opens in place
  const [nirfShown, setNirfShown] = useState(false);
  const answersKey = JSON.stringify(prefs || null);
  useEffect(() => {
    setOpen(true);
    setIndex(0);
    setNirfShown(false);
  }, [answersKey]);

  if (!prefs || steps.length === 0) return null;
  const last = index === steps.length - 1;
  const go = (i) => {
    setIndex(Math.max(0, Math.min(steps.length - 1, i)));
    setNirfShown(false);
  };

  if (!open)
    return (
      <button
        type="button"
        onClick={() => {
          setIndex(0);
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 text-sm font-bold text-[#B52326] underline underline-offset-2 ${className}`}
      >
        <Lightbulb size={15} aria-hidden="true" /> Why this order?
      </button>
    );

  const openNirf = () => {
    // the predictor's FAQ takes it and opens at the answer
    const handled = !window.dispatchEvent(
      new CustomEvent(OPEN_FAQ_EVENT, { detail: NIRF_Q, cancelable: true })
    );
    if (!handled) setNirfShown((v) => !v);
  };

  const [before, after] = steps[index].split("{NIRF}");

  return (
    <section
      aria-label="Why this order"
      className={`rounded-2xl border border-[#eaded8] bg-[#fffdfa] px-4 py-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.06em] text-[#B52326]">
          <Lightbulb size={14} aria-hidden="true" />
          Why this order · {index + 1} of {steps.length}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="rounded-md p-0.5 text-[#9a837c] hover:bg-[#f3dcd8] hover:text-[#2f2320]"
        >
          <X size={16} />
        </button>
      </div>

      <p
        key={index}
        className="mt-1.5 min-h-[44px] text-[15px] font-semibold leading-snug text-[#2f2320] motion-safe:animate-[fadeIn_.25s_ease-out]"
      >
        {before}
        {after !== undefined && (
          <>
            NIRF{" "}
            <button
              type="button"
              onClick={openNirf}
              className="font-bold text-[#B52326] underline underline-offset-2"
            >
              (what is NIRF?)
            </button>
            {after}
          </>
        )}
      </p>
      {nirfShown && NIRF_A && (
        <p className="mt-1.5 rounded-lg bg-[#fbeeec] px-3 py-2 text-xs leading-relaxed text-[#5c4b46]">
          {NIRF_A}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Step ${i + 1}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${
                i === index
                  ? "w-5 bg-[#B52326]"
                  : i < index
                  ? "w-2 bg-[#B52326]/40"
                  : "w-2 bg-[#e4d8d2]"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          {index > 0 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="inline-flex items-center gap-1 text-sm font-bold text-[#7a635d] hover:text-[#2f2320]"
            >
              <ArrowLeft size={15} /> Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? setOpen(false) : go(index + 1))}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#B52326] px-3.5 py-1.5 text-sm font-extrabold text-white hover:bg-[#9E1F22]"
          >
            {last ? "Got it" : "Next"}
            {!last && <ArrowRight size={15} />}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}`}</style>
    </section>
  );
};

export default OrderNote;

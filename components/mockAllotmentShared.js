import React, { useRef, useState } from "react";
import { Check, GripVertical } from "lucide-react";
import { cardClass, inputClass } from "./mockAllotmentTheme";

// Exam-agnostic pieces shared by components/JosaaMockAllotment.js and
// components/MhtcetMockAllotment.js — extracted verbatim out of what used to
// be the single components/MockAllotment.js, so both flows look and behave
// identically wherever the exam itself makes no difference (the stepper, the
// drag/reorder preference list, form field wrappers, the loading card).

export const optionValue = (opt) => (typeof opt === "string" ? opt : opt.value);
export const optionLabel = (opt) => (typeof opt === "string" ? opt : opt.label);
export const toOptions = (opts) =>
  opts.map((o) => ({ value: optionValue(o), label: optionLabel(o) }));

export const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-[#5b4a45]">
      {label}
    </span>
    {children}
  </label>
);

// number inputs without the browser's spinner arrows — they crowd the value
export const rankInputClass = `${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

// Shown in place of the current step while a locking/round action fakes a
// beat of "processing" — see runWithDelay in the two flow components.
export const LoadingCard = ({ label }) => (
  <div
    className={`${cardClass} mt-6 flex flex-col items-center justify-center gap-3 py-14 text-center`}
  >
    <div
      className="h-9 w-9 animate-spin rounded-full border-4 border-[#f0e6e1] border-t-[#b52326]"
      aria-hidden="true"
    />
    <p className="text-sm font-semibold text-[#5b4a45]">{label}</p>
  </div>
);

// Only these three get a tab in the bar — Simulation isn't something you
// navigate to directly, it's what you land on after submitting from Review
// & Manage. Internal state can still use a 4th step name ("simulate").
export const NAV_STEPS = ["info", "choices", "review"];
export const STEP_LABELS = {
  info: "1. Your info",
  choices: "2. Choice filling",
  review: "3. Review & lock",
};

// A step's circle turns into a checkmark once it's "done" (info: valid
// profile; choices: at least one pick; review: locked & submitted) — purely
// a progress cue, not a gate; you can still click back into a done step to
// change it (Review & Manage aside, which is read-only once locked).
export const isStepDone = (step, { profileValid, choicesCount, locked }) => {
  if (step === "info") return profileValid;
  if (step === "choices") return choicesCount > 0;
  return locked; // review
};

export const StepBar = ({
  current,
  profileValid,
  choicesCount,
  locked,
  onSelect,
}) => {
  const progress = { profileValid, choicesCount, locked };

  return (
    <div className="mt-6 flex items-start">
      {NAV_STEPS.map((step, idx) => {
        const disabled = step !== "info" && !profileValid;
        const active = current === step;
        const done = isStepDone(step, progress);
        return (
          <React.Fragment key={step}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(step)}
              className="flex w-24 shrink-0 flex-col items-center gap-1.5 disabled:cursor-not-allowed sm:w-32"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition ${
                  active
                    ? "border-[#b52326] bg-[#b52326] text-white"
                    : done
                      ? "border-[#b52326] bg-white text-[#b52326]"
                      : disabled
                        ? "border-[#e4d8d2] bg-[#f8efec] text-[#c9b8b2]"
                        : "border-[#d8c7c1] bg-white text-[#5b4a45]"
                }`}
              >
                {done && !active ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  idx + 1
                )}
              </span>
              <span
                className={`text-center text-sm font-semibold leading-tight ${
                  active
                    ? "text-[#b52326]"
                    : disabled
                      ? "text-[#c9b8b2]"
                      : "text-[#5b4a45]"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </button>
            {idx < NAV_STEPS.length - 1 && (
              <span
                className={`mt-3 h-0.5 flex-1 rounded transition-colors ${
                  done ? "bg-[#b52326]" : "bg-[#e4d8d2]"
                }`}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Reorder controls shared by the Choice Filling and Review & Manage steps —
// drag handle, ↑/↓ buttons, and a type-a-number-to-jump box, all driving the
// same set of handlers. Used any time a choice list needs to be editable.
// `itemKey(item)` lets each caller supply its own unique key shape (JoSAA
// keys on institute+program, MHT-CET the same) without hardcoding field names
// here.
export const ReorderableChoiceList = ({
  choices,
  itemKey,
  onReorder,
  onMoveUp,
  onMoveDown,
  onRemove,
}) => {
  // Pointer Events (not the native HTML5 drag API) so the same handlers drive
  // mouse, touch, and pen — the native drag API doesn't fire on touch at all,
  // which would leave mobile students with no way to reorder.
  const [dragIndex, setDragIndex] = useState(null);
  // A GAP position in the pre-drag array, not an item index: 0..choices.length,
  // where choices.length means "after the last item". onReorder expects this
  // exact shape — see reorderChoices' comment for why a plain index isn't enough.
  const [overGap, setOverGap] = useState(null);
  // Where the pointer currently is, so a floating label can follow it — the
  // browser's native drag API draws its own ghost image automatically;
  // Pointer Events don't, so without this the item being dragged is
  // invisible the whole time it's moving (only the dimmed original row and
  // the drop-target highlight are visible otherwise).
  const [pointerPos, setPointerPos] = useState(null);
  const itemRefs = useRef([]);
  const findGapAtY = (clientY) => {
    for (let i = 0; i < itemRefs.current.length; i += 1) {
      const rect = itemRefs.current[i]?.getBoundingClientRect();
      if (rect && clientY < rect.top + rect.height / 2) return i;
    }
    return choices.length;
  };

  const handlePointerDown = (index) => (e) => {
    e.currentTarget.setPointerCapture(e.pointerId); // routes later move/up here even off-element
    setDragIndex(index);
    setOverGap(index);
    setPointerPos({ x: e.clientX, y: e.clientY });
  };
  const handlePointerMove = (e) => {
    if (dragIndex === null) return;
    setPointerPos({ x: e.clientX, y: e.clientY });
    const target = findGapAtY(e.clientY);
    if (target !== overGap) setOverGap(target);
  };
  const endDrag = () => {
    // A gap equal to fromIndex or fromIndex+1 both mean "drop back where it
    // started" (nothing before/after it actually moves), so only reorder
    // outside that no-op range.
    if (
      dragIndex !== null &&
      overGap !== null &&
      overGap !== dragIndex &&
      overGap !== dragIndex + 1
    ) {
      onReorder(dragIndex, overGap);
    }
    setDragIndex(null);
    setOverGap(null);
    setPointerPos(null);
  };

  // Approximate which row to highlight as the drop target — just the
  // nearest row to the gap, not a true "insert here" line between rows.
  const highlightIndex =
    overGap === null ? null : Math.min(overGap, choices.length - 1);

  return (
    <>
      <ol className="mt-3 space-y-2">
        {choices.map((item, index) => {
          const key = itemKey(item);
          return (
            <li
              key={key}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                highlightIndex === index
                  ? "border-[#b52326] bg-[#fdf3f1]"
                  : "border-[#f0e6e1]"
              } ${dragIndex === index ? "opacity-50" : ""}`}
            >
              <span
                onPointerDown={handlePointerDown(index)}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                style={{ touchAction: "none" }}
                className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
                aria-label="Drag to reorder"
              >
                <GripVertical size={16} className="text-[#c9b8b2]" />
              </span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fbeeec] text-xs font-black text-[#b52326]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#3a2c28]">
                  {item.institute}
                </p>
                <p className="text-xs text-[#7a655f]">{item.program}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onMoveUp(index)}
                  className="rounded-full border border-[#d8c7c1] px-2 py-1 text-xs disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === choices.length - 1}
                  onClick={() => onMoveDown(index)}
                  className="rounded-full border border-[#d8c7c1] px-2 py-1 text-xs disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="rounded-full border border-[#d8c7c1] px-2 py-1 text-xs text-[#b52326]"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {dragIndex !== null && pointerPos && (
        <div
          style={{
            position: "fixed",
            left: pointerPos.x + 16,
            top: pointerPos.y + 16,
            zIndex: 9999,
          }}
          className="pointer-events-none max-w-[240px] rounded-lg border-2 border-[#b52326] bg-white px-3 py-2 text-xs font-semibold text-[#3a2c28] shadow-lg"
        >
          #{dragIndex + 1}. {choices[dragIndex]?.institute}
        </div>
      )}
    </>
  );
};

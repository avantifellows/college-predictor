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
  //
  // The list reorders LIVE while dragging: the dragged row sits where it
  // will land, so there is no "which row does the highlight mean" guess.
  // (The old version highlighted the row below the gap, so the pointer on
  // row 3 lit up row 4 and the drop landed one slot above the highlight.)
  //
  // drag: { from, to, mids } — `from` is the dragged item's index in
  // `choices`, `to` its index in the previewed order, `mids` every row's
  // page-space middle measured once at drag start. Frozen rects keep the
  // target stable while the rows move under the pointer (re-measuring the
  // live, reordered DOM makes the target flicker between two slots).
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  dragRef.current = drag;
  const itemRefs = useRef(new Map());
  const lastClientY = useRef(0);

  const targetFor = (clientY, d) => {
    const y = clientY + window.scrollY;
    let to = 0;
    d.mids.forEach((mid, i) => {
      if (i !== d.from && y > mid) to += 1;
    });
    return to;
  };

  const handlePointerDown = (index) => (e) => {
    if (e.button !== 0) return; // right-click / middle-click: not a drag
    e.preventDefault(); // no text selection, no touch scroll
    const mids = choices.map((item) => {
      const rect = itemRefs.current.get(itemKey(item))?.getBoundingClientRect();
      return rect ? rect.top + window.scrollY + rect.height / 2 : 0;
    });
    lastClientY.current = e.clientY;
    setDrag({ from: index, to: index, mids });
  };

  const dragging = drag !== null;
  // Move/up listen on window, not the handle: the dragged row is moved in
  // the DOM as the preview reorders, and pointer capture on a moved node is
  // dropped by the browser mid-drag.
  React.useEffect(() => {
    if (!dragging) return undefined;
    const update = () => {
      const d = dragRef.current;
      if (!d) return;
      const to = targetFor(lastClientY.current, d);
      if (to !== d.to) setDrag({ ...d, to });
    };
    const onMove = (e) => {
      lastClientY.current = e.clientY;
      update();
    };
    const onUp = () => {
      const d = dragRef.current;
      // onReorder takes a GAP in the original array; moving down, the gap
      // after the item that now sits above the dragged one is `to + 1`
      if (d && d.to !== d.from)
        onReorder(d.from, d.to > d.from ? d.to + 1 : d.to);
      setDrag(null);
    };
    // Auto-scroll near the top/bottom edge so a long list can be dragged
    // past what's on screen.
    let frame;
    const EDGE = 70;
    const tick = () => {
      const y = lastClientY.current;
      let dy = 0;
      if (y < EDGE) dy = -Math.ceil((EDGE - y) / 5);
      else if (y > window.innerHeight - EDGE)
        dy = Math.ceil((y - (window.innerHeight - EDGE)) / 5);
      if (dy) {
        window.scrollBy(0, dy);
        update();
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.userSelect = prevSelect;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("scroll", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  // the order shown: the real one, or, mid-drag, the dragged row at `to`
  const shown = choices.map((item, index) => ({ item, index }));
  if (drag && drag.to !== drag.from) {
    const [moved] = shown.splice(drag.from, 1);
    shown.splice(drag.to, 0, moved);
  }

  return (
    <>
      <ol className="mt-3 space-y-2">
        {shown.map(({ item, index }, position) => {
          const key = itemKey(item);
          const isDragged = drag && drag.from === index;
          return (
            <li
              key={key}
              ref={(el) => {
                if (el) itemRefs.current.set(key, el);
                else itemRefs.current.delete(key);
              }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                isDragged
                  ? "relative z-10 border-[#b52326] bg-[#fdf3f1] shadow-lg ring-2 ring-[#b52326]/20"
                  : "border-[#f0e6e1] bg-white"
              }`}
            >
              <span
                onPointerDown={handlePointerDown(index)}
                style={{ touchAction: "none" }}
                className={`-my-1 -ml-2 flex h-9 w-8 shrink-0 touch-none items-center justify-center rounded-md hover:bg-[#fbeeec] ${
                  isDragged ? "cursor-grabbing" : "cursor-grab"
                }`}
                aria-label="Drag to reorder"
              >
                <GripVertical
                  size={18}
                  className={isDragged ? "text-[#b52326]" : "text-[#b9a39c]"}
                />
              </span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fbeeec] text-xs font-black text-[#b52326]">
                {position + 1}
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
    </>
  );
};

// A completed run is restored from localStorage, so opening the simulator
// fresh — e.g. from /josaa's "try the simulation" button days later — drops
// the student onto an old result with no obvious way back to the start:
// "Start over" sits at the very bottom, below the whole list analysis, well
// off the first screen. This says what they are looking at and puts the
// restart in reach, at the top where they land.
export const RestoredRunNotice = ({ onRestart }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eaded8] bg-[#fdf8f6] px-4 py-3">
    <p className="text-sm text-[#5b4a45]">
      This is the run you finished earlier, saved on this device.
    </p>
    <button
      type="button"
      onClick={onRestart}
      className="shrink-0 rounded-full border border-[#b52326] bg-white px-4 py-1.5 text-xs font-bold text-[#b52326] transition hover:bg-[#fbeeec]"
    >
      Start a new run
    </button>
  </div>
);

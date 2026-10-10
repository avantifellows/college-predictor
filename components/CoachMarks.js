import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

// Coach marks: dims the page, spotlights one part of it and explains it in a
// card, one step at a time. Not skippable: only Next / Got it moves on (no
// skip button, Escape or click-outside). A step's `targets` are two CSS selectors, the
// spotlight covers both (e.g. a column header and the fifth cell under it).
// `clipTo` keeps the spotlight inside a scrolling box, such as a wide table.
const CoachMarks = ({ steps, step, solo, onNext, onClose, clipTo }) => {
  const [rect, setRect] = useState(null);
  const current = steps[step];

  const measure = useCallback(() => {
    if (!current) return;
    const [a, b] = current.targets.map((s) => document.querySelector(s));
    if (!a) return setRect(null);
    const ra = a.getBoundingClientRect();
    const rb = (b || a).getBoundingClientRect();
    // clip only what lives inside the scrolling box (a table column), not a
    // button outside it
    const box = clipTo?.current?.contains(a)
      ? clipTo.current.getBoundingClientRect()
      : null;
    const pad = 6;
    let left = Math.min(ra.left, rb.left);
    let right = Math.max(ra.right, rb.right);
    if (box) {
      left = Math.max(left, box.left);
      right = Math.min(right, box.right);
    }
    setRect({
      top: Math.min(ra.top, rb.top) - pad,
      left: left - pad,
      width: right - left + pad * 2,
      height:
        Math.max(ra.bottom, rb.bottom) - Math.min(ra.top, rb.top) + pad * 2,
    });
  }, [current, clipTo]);

  // bring the step into view, then follow the page as it scrolls or resizes
  useLayoutEffect(() => {
    if (!current) return;
    const el = document.querySelector(current.targets[0]);
    if (el && clipTo?.current?.contains(el)) {
      clipTo.current.scrollLeft = Math.max(0, el.offsetLeft - 60);
    }
    // a fixed element (the sticky Help me choose button) is always in view
    if (
      el &&
      getComputedStyle(el.closest("[class*=fixed]") || el).position !== "fixed"
    ) {
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top - 300), behavior: "smooth" });
    }
    measure();
  }, [current, measure]);

  useEffect(() => {
    let frame = null;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [measure]);

  if (!current || !rect) return null;

  const last = solo || step === steps.length - 1;
  // the card sits above the spotlight, or below it when there is no room
  const cardWidth = Math.min(340, window.innerWidth - 24);
  const above = rect.top > 250;
  const cardLeft = Math.max(
    12,
    Math.min(rect.left, window.innerWidth - cardWidth - 12)
  );
  const arrowLeft = Math.max(
    16,
    Math.min(
      rect.left + Math.min(rect.width / 2, 60) - cardLeft,
      cardWidth - 30
    )
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={current.title}>
      {/* blocks the page until the tips are done */}
      <div className="fixed inset-0 z-50" />
      <div
        className="pointer-events-none fixed z-[51] rounded-xl transition-all duration-300"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow: "0 0 0 3px #fff, 0 0 0 9999px rgba(36,18,14,.62)",
        }}
      />
      <div
        className="fixed z-[52] rounded-[14px] bg-white p-[18px] text-left shadow-[0_16px_40px_rgba(0,0,0,.25)] transition-all duration-300"
        style={{
          width: cardWidth,
          left: cardLeft,
          ...(above
            ? { top: rect.top - 16, transform: "translateY(-100%)" }
            : { top: rect.top + rect.height + 16 }),
        }}
      >
        <div
          className="absolute h-3.5 w-3.5 rotate-45 bg-white"
          style={{
            left: arrowLeft,
            ...(above ? { bottom: -7 } : { top: -7 }),
          }}
        />
        <div className="text-xs font-extrabold uppercase tracking-[0.06em] text-[#B52326]">
          {solo || steps.length === 1
            ? "Tip"
            : `Tip ${step + 1} of ${steps.length}`}
        </div>
        <div className="mt-1.5 font-['Lato',sans-serif] text-[19px] font-black leading-tight text-[#2f2320]">
          {current.title}
        </div>
        <div className="mt-1.5 text-sm leading-normal text-[#5c4b46]">
          {current.body}
        </div>
        <div className="mt-3.5 flex items-center justify-end">
          <button
            type="button"
            onClick={last ? onClose : onNext}
            className="rounded-[10px] bg-[#B52326] px-[18px] py-2.5 text-sm font-extrabold text-white hover:bg-[#9E1F22]"
          >
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachMarks;

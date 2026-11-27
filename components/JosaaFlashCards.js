import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Infinity as InfinityIcon,
  Landmark,
  LifeBuoy,
  ListOrdered,
  Repeat,
  Snowflake,
  Waves,
} from "lucide-react";

// JoSAA in six flash cards, one idea each, instead of a block of text.
// Shown as the first step of the JoSAA mock allotment and on /josaa.
//
// Institute counts are the 2025 round data the simulator runs on
// (public/data/JEE/josaa_2025_all_rounds.json: 128 institutes), grouped the
// way JoSAA groups them: IIEST Shibpur sits with the NITs. Dates are the
// 2025 schedule, rounded to "early / mid / late month" because they move a
// few days every year.

// set once the cards have been read or skipped, in the mock or on /josaa,
// so a new mock run doesn't open on them again ("How JoSAA works" still does)
export const CARDS_SEEN_KEY = "futures:josaaCardsSeen";
export const markCardsSeen = () => {
  try {
    window.localStorage.setItem(CARDS_SEEN_KEY, "1");
  } catch {
    // ignore: worst case the cards show again next time
  }
};

const Tile = ({ value, label, sub }) => (
  <div className="rounded-2xl border border-[#eaded8] bg-[#fdf8f6] px-3 py-3 text-center">
    <p className="text-3xl font-black leading-none text-[#B52326]">{value}</p>
    <p className="mt-1.5 text-sm font-extrabold text-[#2f2320]">{label}</p>
    {sub && <p className="mt-0.5 text-[11px] text-[#7a635d]">{sub}</p>}
  </div>
);

const TIMELINE = [
  ["Early June", "Register and fill your choices"],
  ["Mid-June", "Round 1"],
  ["Late June", "Rounds 2 and 3"],
  ["Early July", "Rounds 4 and 5"],
  ["Mid-July", "Round 6, the last one"],
];

const OPTION_TILES = [
  {
    icon: Snowflake,
    name: "Freeze",
    line: "Take this seat. You're done with JoSAA.",
  },
  {
    icon: Waves,
    name: "Float",
    line: "Keep this seat, but try for a higher choice at any college.",
  },
  {
    icon: Repeat,
    name: "Slide",
    line: "Keep this seat, but try for a better branch at the same college.",
  },
];

export const JOSAA_CARDS = [
  {
    icon: Landmark,
    kicker: "What is JoSAA?",
    title: "One counselling for 128 colleges",
    body: (
      <>
        <p>
          JoSAA hands out seats at the IITs, NITs, IIITs and other
          government-funded colleges (GFTIs).
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Tile value="23" label="IITs" sub="JEE Advanced rank" />
          <Tile value="32" label="NITs" sub="incl. IIEST Shibpur" />
          <Tile value="26" label="IIITs" sub="JEE Main rank" />
          <Tile value="47" label="GFTIs" sub="JEE Main rank" />
        </div>
        <p className="mt-3 text-xs text-[#7a635d]">2025 numbers.</p>
      </>
    ),
  },
  {
    icon: CalendarDays,
    kicker: "When?",
    title: "6 rounds, about a week apart",
    body: (
      <>
        <ol className="relative mt-1 space-y-3 border-l-2 border-[#f1d4d0] pl-5">
          {TIMELINE.map(([when, what], i) => (
            <li key={when} className="relative">
              <span
                className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                  i === 0 ? "bg-[#2f2320]" : "bg-[#B52326]"
                }`}
              />
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#B52326]">
                {when}
              </p>
              <p className="text-[15px] font-bold text-[#2f2320]">{what}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-[#7a635d]">
          Rough dates from 2025. Check josaa.nic.in for this year&apos;s
          schedule.
        </p>
      </>
    ),
  },
  {
    icon: ListOrdered,
    kicker: "Before Round 1",
    title: "Fill in your choices first",
    body: (
      <>
        <p>
          Before Round 1 begins, you list every college and branch you would
          join, best first. Your list is locked once Round 1 starts.
        </p>
        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-[#2f2320] px-4 py-4 text-white">
          <InfinityIcon size={40} className="shrink-0 text-[#ffb4ad]" />
          <div>
            <p className="text-lg font-black leading-tight">
              No limit on choices
            </p>
            <p className="mt-0.5 text-sm text-white/80">
              A longer list never hurts you. A short one can leave you with no
              seat.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    icon: ArrowUpRight,
    kicker: "After every round",
    title: "Freeze, float or slide",
    body: (
      <>
        <p>When you are offered a seat, you pick one of three.</p>
        <div className="mt-4 space-y-2.5">
          {OPTION_TILES.map(({ icon: Icon, name, line }) => (
            <div
              key={name}
              className="flex items-start gap-3 rounded-2xl border border-[#eaded8] bg-[#fdf8f6] px-3.5 py-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#B52326] shadow-sm">
                <Icon size={18} />
              </span>
              <div>
                <p className="font-black text-[#2f2320]">{name}</p>
                <p className="text-sm text-[#4f403a]">{line}</p>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    icon: LifeBuoy,
    kicker: "After Round 6",
    title: "No seat? Apply for CSAB",
    body: (
      <>
        <p>
          Seats left empty after JoSAA are filled by CSAB in its own rounds,
          usually late July to August.
        </p>
        <div className="mt-4 rounded-2xl border border-[#eaded8] bg-[#fdf8f6] px-4 py-3.5">
          <p className="text-sm font-extrabold text-[#2f2320]">
            It&apos;s separate from JoSAA
          </p>
          <p className="mt-1 text-sm text-[#4f403a]">
            You register for CSAB and fill your choices again. Your JoSAA list
            doesn&apos;t carry over.
          </p>
        </div>
      </>
    ),
  },
  {
    icon: AlertTriangle,
    warning: true,
    kicker: "Warning",
    title: "A CSAB seat cancels your JoSAA seat",
    body: (
      <>
        <p>
          If CSAB gives you a seat, the seat you held from JoSAA is gone. You
          can&apos;t go back to it.
        </p>
        <div className="mt-4 space-y-2">
          <p className="rounded-xl bg-white/70 px-3.5 py-2.5 text-sm font-bold text-[#2f2320]">
            ✓ Apply if you have no seat
          </p>
          <p className="rounded-xl bg-white/70 px-3.5 py-2.5 text-sm font-bold text-[#2f2320]">
            ✓ Apply if CSAB could give you a much better seat
          </p>
          <p className="rounded-xl bg-white/70 px-3.5 py-2.5 text-sm font-bold text-[#8f2e31]">
            ✗ Don&apos;t apply just to try your luck
          </p>
        </div>
      </>
    ),
  },
];

// One card at a time: Next / Back, the dots, ←/→ keys and a swipe all move
// through them. The last card's button hands off (onDone).
const JosaaFlashCards = ({ onDone, doneLabel = "Start the mock", onSkip }) => {
  const [index, setIndex] = useState(0);
  const last = index === JOSAA_CARDS.length - 1;
  const go = (i) => setIndex(Math.max(0, Math.min(JOSAA_CARDS.length - 1, i)));
  const next = () => (last ? onDone() : go(index + 1));

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // horizontal swipe on touch screens
  const swipeStart = useRef(null);
  const onPointerDown = (e) => {
    if (e.pointerType === "mouse") return;
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
      go(index + (dx < 0 ? 1 : -1));
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1.5" role="tablist" aria-label="Cards">
          {JOSAA_CARDS.map((c, i) => (
            <button
              key={c.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Card ${i + 1}: ${c.title}`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-[#B52326]"
                  : i < index
                  ? "w-2 bg-[#B52326]/40"
                  : "w-2 bg-[#e4d8d2]"
              }`}
            />
          ))}
        </div>
        {onSkip && !last && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-bold text-[#7a635d] underline hover:text-[#B52326]"
          >
            Skip
          </button>
        )}
      </div>

      <div
        className="overflow-hidden rounded-[22px]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {JOSAA_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <section
                key={card.title}
                aria-hidden={i !== index}
                className={`flex min-h-[460px] w-full shrink-0 flex-col rounded-[22px] border p-6 ${
                  card.warning
                    ? "border-[#f0c9c9] bg-[#fbeeec]"
                    : "border-[#eaded8] bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      card.warning
                        ? "bg-[#B52326] text-white"
                        : "bg-[#fbeeec] text-[#B52326]"
                    }`}
                  >
                    <Icon size={22} />
                  </span>
                  <span className="text-xs font-bold text-[#9a837c]">
                    {i + 1} / {JOSAA_CARDS.length}
                  </span>
                </div>
                <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.08em] text-[#B52326]">
                  {card.kicker}
                </p>
                <h2 className="mt-1 text-[24px] font-black leading-tight text-[#2f2320]">
                  {card.title}
                </h2>
                <div className="mt-3 text-[15px] leading-relaxed text-[#4f403a]">
                  {card.body}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(index - 1)}
          className={`inline-flex items-center gap-1.5 text-sm font-bold text-[#7a635d] hover:text-[#2f2320] ${
            index === 0 ? "invisible" : ""
          }`}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          type="button"
          onClick={next}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[#B52326] px-5 py-3 text-base font-black text-white transition hover:bg-[#9E1F22]"
        >
          {last ? doneLabel : "Next"} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default JosaaFlashCards;

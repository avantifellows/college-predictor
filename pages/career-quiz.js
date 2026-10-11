import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  RotateCcw,
} from "lucide-react";
import BackLink from "../components/BackLink";
import { loadCareers } from "../components/careerShared";
import {
  RIASEC,
  RIASEC_TYPES,
  adjustedProfile,
  isFlat,
  matchCareers,
  ordered,
  profileOf,
  tiebreakersFor,
} from "../utils/careerMatch";

// The Career Quiz (data from riasec_quiz.xlsx, built by
// scripts/build_career_quiz.py):
//   1. 30 statements, 5 per RIASEC interest type, Strongly disagree ..
//      Strongly agree, six to a screen
//   2. up to 5 "would you rather" tie-breakers, only when the student's top
//      types come out close
//   3. three favourite subjects, then (next screen) those three in order
// The answers become an interest profile matched to every career's RIASEC
// scores, with a small boost for careers that use the picked subjects
// (utils/careerMatch.js).

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

const STORE = "futures:careerQuiz2";
// the Careers page's class-12 streams; each career belongs to one (its
// parent stream, careers.json parent_stream)
const STREAMS = ["All", "Science (PCM)", "Science (PCB)", "Commerce", "Arts"];
const PER_PAGE = 6;
const TYPE_COLOUR = {
  R: "#a24b3f",
  I: "#3f6e8a",
  A: "#8a5fa2",
  S: "#3f8a5c",
  E: "#b8862f",
  C: "#5c5346",
};

// The sheet lists statements R, I, A, S, E, C in turn; a fixed shuffle hides
// the pattern and keeps the order the same on every visit.
const shuffled = (items, seed) => {
  const out = [...items];
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

// pay as rupee symbols: High 3, Mid 2, Low 1 (the rest faint, so the
// column lines up)
const PAY_LEVEL = { High: 3, Mid: 2, Low: 1 };
const PayTier = ({ tier }) => {
  const n = PAY_LEVEL[tier] || 0;
  return (
    <span
      className="font-bold tracking-[0.08em]"
      title={`${tier} pay`}
      aria-label={`${tier} pay`}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={i <= n ? "text-[#2f2320]" : "text-[#e3d4ce]"}
        >
          ₹
        </span>
      ))}
    </span>
  );
};

const card =
  "mx-auto max-w-3xl rounded-2xl border border-[#eee1d7] bg-white p-5 shadow-sm sm:p-8";
const primaryBtn =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[#B52326] px-6 text-base font-bold text-white transition hover:bg-[#9E1F22] disabled:cursor-not-allowed disabled:bg-[#e0cdc6]";
const backBtn =
  "inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-[#7a635d] hover:text-[#2f2320]";

const EMPTY = {
  screen: "intro",
  step: 0,
  ratings: {},
  tieIds: [],
  tiePicks: {},
  picked: [],
  ranked: [],
};

export default function CareerQuiz() {
  const [quiz, setQuiz] = useState(null);
  const [careers, setCareers] = useState(null);
  const [error, setError] = useState(null);
  const [state, setState] = useState(EMPTY);
  const { screen, step, ratings, tieIds, tiePicks, picked, ranked } = state;
  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  // a quick double tap must not answer the next tie-breaker too
  const advancing = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/careers/quiz.json").then((r) => r.json()),
      loadCareers(),
    ])
      .then(([q, c]) => {
        setQuiz(q);
        setCareers(c);
      })
      .catch(() => setError("Couldn't load the quiz. Please refresh."));
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORE) || "null");
      if (saved) setState({ ...EMPTY, ...saved });
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORE, JSON.stringify(state));
    } catch (e) {}
  }, [state]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen, step]);

  const statements = useMemo(
    () => (quiz ? shuffled(quiz.statements, 7) : []),
    [quiz]
  );
  const ratePages = Math.ceil(statements.length / PER_PAGE) || 5;
  const ties = useMemo(
    () =>
      tieIds
        .map((id) => quiz?.tiebreakers.find((t) => t.id === id))
        .filter(Boolean),
    [tieIds, quiz]
  );
  // every screen of the quiz, in order
  const steps = useMemo(
    () => [
      ...Array.from({ length: ratePages }, (_, page) => ({
        kind: "rate",
        page,
      })),
      ...ties.map((pair, i) => ({ kind: "tie", pair, i })),
      { kind: "pick" },
      { kind: "rank" },
    ],
    [ratePages, ties]
  );
  const current = steps[Math.min(step, steps.length - 1)];

  const rawProfile = useMemo(
    () => (quiz ? profileOf(ratings, quiz.statements) : null),
    [ratings, quiz]
  );
  const profile = useMemo(
    () => rawProfile && adjustedProfile(rawProfile, tiePicks),
    [rawProfile, tiePicks]
  );
  const router = useRouter();
  // the results table's stream filter: careers whose parent stream it is
  const [stream, setStream] = useState("All");
  const result = useMemo(
    () =>
      screen === "results" && careers && profile
        ? matchCareers({
            profile,
            subjects: ranked,
            careers:
              stream === "All"
                ? careers
                : careers.filter((c) => c.parent_stream === stream),
            careerSubjects: quiz.careerSubjects,
          })
        : null,
    [screen, careers, profile, ranked, quiz, stream]
  );

  const start = () => setState({ ...EMPTY, screen: "quiz" });
  const goBack = () =>
    step === 0 ? set({ screen: "intro" }) : set({ step: step - 1 });

  // leaving the statements: settle which tie-breakers to ask, from the
  // ratings as they now stand (an answer changed later asks afresh)
  const finishRatings = () => {
    const ids = tiebreakersFor(rawProfile, quiz.tiebreakers).map((t) => t.id);
    set({
      step: step + 1,
      tieIds: ids,
      tiePicks: Object.fromEntries(
        Object.entries(tiePicks).filter(([id]) => ids.includes(Number(id)))
      ),
    });
  };

  const rate = (s, v, pageItems) => {
    setState((st) => ({ ...st, ratings: { ...st.ratings, [s.id]: v } }));
    // bring the next unanswered statement on this screen into view
    const nextItem = pageItems.find((x) => x.id !== s.id && !ratings[x.id]);
    if (nextItem) {
      setTimeout(() => {
        document
          .getElementById(`st-${nextItem.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    }
  };

  const pickTie = (pair, type) => {
    if (advancing.current) return;
    advancing.current = true;
    // the screen after this one, however often the advance below runs
    const after = step + 1;
    setState((st) => ({
      ...st,
      tiePicks: { ...st.tiePicks, [pair.id]: type },
    }));
    // a short beat so the student sees their pick land
    setTimeout(() => {
      advancing.current = false;
      setState((st) => ({ ...st, step: Math.max(st.step, after) }));
    }, 200);
  };

  // functional updates: taps in quick succession each see the last one
  const togglePick = (subject) =>
    setState((st) => {
      if (st.picked.includes(subject))
        return {
          ...st,
          picked: st.picked.filter((x) => x !== subject),
          ranked: st.ranked.filter((x) => x !== subject),
        };
      if (st.picked.length >= 3) return st;
      return { ...st, picked: [...st.picked, subject] };
    });
  const toRank = () =>
    setState((st) => {
      if (st.picked.length !== 3) return st;
      // keep an order already set for the same three; else the pick order
      const same =
        st.ranked.length === 3 && st.ranked.every((x) => st.picked.includes(x));
      return {
        ...st,
        step: st.step + 1,
        ranked: same ? st.ranked : [...st.picked],
      };
    });
  const move = (i, d) =>
    setState((st) => {
      const r = [...st.ranked];
      [r[i], r[i + d]] = [r[i + d], r[i]];
      return { ...st, ranked: r };
    });
  // the ranking screen needs exactly the three picks; anything else sends
  // the student back to picking
  useEffect(() => {
    if (
      screen === "quiz" &&
      current?.kind === "rank" &&
      (picked.length !== 3 || ranked.length !== 3)
    )
      setState((st) => ({
        ...st,
        step: steps.findIndex((x) => x.kind === "pick"),
      }));
  }, [screen, current, picked, ranked, steps]);

  // past the statements (or on the results) with some unanswered, as a
  // restored session can be: back to the first screen that has a gap
  useEffect(() => {
    if (!quiz || screen === "intro") return;
    if (screen === "quiz" && current?.kind === "rate") return;
    const gap = statements.findIndex((x) => !ratings[x.id]);
    if (gap >= 0)
      setState((st) => ({
        ...st,
        screen: "quiz",
        step: Math.floor(gap / PER_PAGE),
      }));
  }, [quiz, screen, current, statements, ratings]);

  // by questions answered, not screens: the statements are most of the quiz
  const Progress = ({ label }) => {
    const units = steps.map((x) => (x.kind === "rate" ? PER_PAGE : 1));
    const done = units.slice(0, step).reduce((a, b) => a + b, 0);
    const pct = Math.round((done / units.reduce((a, b) => a + b, 0)) * 100);
    return (
      <>
        <div className="flex items-center justify-between text-sm font-semibold text-[#7a635d]">
          <span>{label}</span>
          <span className="tabular-nums">{pct}%</span>
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
      </>
    );
  };

  const renderIntro = () => {
    const started = Object.keys(ratings).length > 0;
    return (
      <div className={card}>
        <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#B52326]">
          Career Quiz
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-[#2f2320] sm:text-4xl">
          Find careers that fit what you enjoy
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#5c4b46]">
          Tell us how much you agree with {quiz?.statements.length || 30} short
          statements about what you like doing, then pick your favourite
          subjects. There are no right answers: be honest, not ambitious. We
          match you to {careers?.length || "150+"} careers.
        </p>
        <ul className="mt-5 grid gap-2 text-sm text-[#5c4b46] sm:grid-cols-3">
          <li className="rounded-xl bg-[#fbeeec] px-4 py-3">
            <b className="block text-[#2f2320]">About 6 minutes</b>
            Six statements a screen
          </li>
          <li className="rounded-xl bg-[#fbeeec] px-4 py-3">
            <b className="block text-[#2f2320]">Your 3 favourite subjects</b>
            Picked, then put in order
          </li>
          <li className="rounded-xl bg-[#fbeeec] px-4 py-3">
            <b className="block text-[#2f2320]">Your top 10 careers</b>
            With why each one fits
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="button"
            onClick={start}
            disabled={!quiz || !careers}
            className={primaryBtn}
          >
            {quiz && careers ? "Start the quiz" : "Loading…"}
            <ArrowRight size={18} />
          </button>
          {started && (
            <button
              type="button"
              onClick={() => set({ screen: "quiz" })}
              className="text-sm font-bold text-[#B52326] underline underline-offset-2"
            >
              Continue where you left off
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderRatings = (page) => {
    const items = statements.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    const done = items.every((s) => ratings[s.id]);
    const first = page * PER_PAGE + 1;
    return (
      <div className={card}>
        <Progress
          label={`Statements ${first}–${first + items.length - 1} of ${
            statements.length
          }`}
        />
        <h2 className="mt-6 text-xl font-black leading-snug text-[#2f2320] sm:text-2xl">
          How much do you agree?
        </h2>
        <div className="mt-4 space-y-3">
          {items.map((s) => (
            <fieldset
              key={s.id}
              id={`st-${s.id}`}
              className="rounded-xl bg-[#fbf6f3] px-3.5 py-3.5 sm:px-4"
            >
              <legend className="sr-only">{s.text}</legend>
              <p
                aria-hidden="true"
                className="text-[15px] leading-snug text-[#2f2320] sm:text-base"
              >
                {s.text}
              </p>
              <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
                {quiz.scale.map((label, i) => {
                  const v = i + 1;
                  const on = ratings[s.id] === v;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => rate(s, v, items)}
                      aria-pressed={on}
                      aria-label={label}
                      className={`flex min-h-[48px] items-center justify-center rounded-lg border-[1.5px] px-1 text-center text-[11px] font-bold leading-tight transition sm:text-xs ${
                        on
                          ? "border-[#B52326] bg-[#B52326] text-white"
                          : "border-[#e0cdc6] bg-white text-[#5c4b46] hover:border-[#B52326]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={goBack} className={backBtn}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            {!done && (
              <span className="hidden text-xs text-[#7a635d] sm:inline">
                Answer all {items.length} to continue
              </span>
            )}
            <button
              type="button"
              disabled={!done}
              onClick={() =>
                page === ratePages - 1
                  ? finishRatings()
                  : set({ step: step + 1 })
              }
              className={primaryBtn}
            >
              Next <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTie = ({ pair, i }) => {
    // the pair's own order would put the sheet's type A first every time
    const options = pair.id % 2 ? [pair.a, pair.b] : [pair.b, pair.a];
    return (
      <div className={card}>
        <Progress label={`Quick tie-breaker ${i + 1} of ${ties.length}`} />
        <h2 className="mt-6 text-xl font-black leading-snug text-[#2f2320] sm:text-2xl">
          Which would you rather do?
        </h2>
        <p className="mt-1.5 text-sm text-[#6d5550]">
          Your answers put some interests neck and neck. One quick choice
          settles it.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {options.map((o) => {
            const on = tiePicks[pair.id] === o.type;
            return (
              <button
                key={o.type}
                type="button"
                onClick={() => pickTie(pair, o.type)}
                aria-pressed={on}
                className={`min-h-[96px] rounded-xl border-[1.5px] px-4 py-4 text-left text-base leading-snug transition ${
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
        <div className="mt-6">
          <button type="button" onClick={goBack} className={backBtn}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>
    );
  };

  const renderPick = () => (
    <div className={card}>
      <Progress label="Your favourite subjects" />
      <h2 className="mt-6 text-xl font-black leading-snug text-[#2f2320] sm:text-2xl">
        Pick your three favourite subjects
      </h2>
      <p className="mt-1.5 text-sm text-[#6d5550]">
        The ones you enjoy most, not the ones you score best in. You&apos;ll put
        them in order next.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {quiz.subjects.map((sub) => {
          const on = picked.includes(sub);
          const full = picked.length === 3 && !on;
          return (
            <button
              key={sub}
              type="button"
              onClick={() => togglePick(sub)}
              aria-pressed={on}
              aria-disabled={full}
              className={`flex min-h-[52px] items-center gap-2 rounded-xl border-[1.5px] px-3.5 py-2.5 text-left text-[15px] font-semibold leading-tight transition ${
                on
                  ? "border-[#B52326] bg-[#B52326] text-white"
                  : full
                  ? "cursor-not-allowed border-[#eee1d7] bg-[#faf6f3] text-[#b9a39c]"
                  : "border-[#e0cdc6] bg-[#fffdfa] text-[#2f2320] hover:border-[#B52326]"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  on ? "border-white bg-white text-[#B52326]" : "border-current"
                }`}
              >
                {on && <Check size={13} strokeWidth={3} />}
              </span>
              {sub}
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={goBack} className={backBtn}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tabular-nums text-[#7a635d]">
            {picked.length} of 3
          </span>
          <button
            type="button"
            disabled={picked.length !== 3}
            onClick={toRank}
            className={primaryBtn}
          >
            Next <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderRank = () => (
    <div className={card}>
      <Progress label="Your favourite subjects" />
      <h2 className="mt-6 text-xl font-black leading-snug text-[#2f2320] sm:text-2xl">
        Now put them in order
      </h2>
      <p className="mt-1.5 text-sm text-[#6d5550]">
        Your favourite at the top. Use the arrows to move a subject.
      </p>
      <ol className="mt-5 space-y-2.5">
        {ranked.map((sub, i) => (
          <li
            key={sub}
            className="flex items-center gap-3 rounded-xl border-[1.5px] border-[#e0cdc6] bg-[#fffdfa] py-2 pl-3 pr-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B52326] text-sm font-black text-white">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-base font-bold text-[#2f2320]">
              {sub}
            </span>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Move ${sub} up`}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[#7a635d] transition hover:bg-[#fbeeec] hover:text-[#B52326] disabled:opacity-25 disabled:hover:bg-transparent"
            >
              <ArrowUp size={20} />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === ranked.length - 1}
              aria-label={`Move ${sub} down`}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[#7a635d] transition hover:bg-[#fbeeec] hover:text-[#B52326] disabled:opacity-25 disabled:hover:bg-transparent"
            >
              <ArrowDown size={20} />
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={goBack} className={backBtn}>
          <ArrowLeft size={16} /> Back
        </button>
        <button
          type="button"
          onClick={() => set({ screen: "results" })}
          className={primaryBtn}
        >
          See my careers <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!result) return null;
    const order = ordered(profile);
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className={card}>
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#B52326]">
            Your interest profile
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#2f2320]">
            {order
              .slice(0, 3)
              .filter((k) => profile[k] > 0)
              .map((k) => RIASEC_TYPES[k].name)
              .join(", ") || "No strong interests yet"}
          </h1>
          <p className="mt-2 text-sm text-[#6d5550]">
            Your three strongest interest types. Career counsellors use these
            six types to describe what people enjoy at work.
          </p>
          {isFlat(profile) && (
            <p className="mt-4 rounded-xl border border-[#eaded8] bg-[#fffdfa] px-4 py-3 text-sm leading-relaxed text-[#5c4b46]">
              Your interests are broad: no single type stands out, so your
              favourite subjects shaped these results more than usual. Explore
              widely, and take the quiz again later if your interests sharpen.
            </p>
          )}
          <div className="mt-5 space-y-2.5">
            {order.map((k) => (
              <div key={k} className="flex items-center gap-3">
                <TypeBadge k={k} />
                <div className="w-24 shrink-0 text-sm font-semibold text-[#2f2320] sm:w-28">
                  {RIASEC_TYPES[k].name}
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#f1e2dd]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, profile[k])}%`,
                      background: TYPE_COLOUR[k],
                    }}
                  />
                </div>
                <div className="w-10 text-right text-sm tabular-nums text-[#7a635d]">
                  {Math.round(Math.min(100, profile[k]))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-[#5c4b46]">
            <b className="text-[#2f2320]">Favourite subjects:</b>{" "}
            {ranked.join(", ")}
          </p>
          <details className="mt-3 text-sm text-[#5c4b46]">
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
          <p className="mt-1 text-sm leading-relaxed text-[#6d5550]">
            Match is how closely a career fits your interests. Among your
            closest matches, careers that use your favourite subjects come
            first. Pay is a rough guide: ₹₹₹ high, ₹₹ mid, ₹ lower. Open a
            career to see the work, pay and the exams that lead there.
          </p>
          <label className="mt-5 block max-w-xs">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#7a635d]">
              Stream
            </span>
            <Dropdown
              options={STREAMS.map((st) => ({
                value: st,
                label: st === "All" ? "All streams" : st,
              }))}
              selectedValue={stream}
              onChange={(o) => setStream(o.value)}
              isSearchable={false}
            />
          </label>
          {result.matches.length === 0 ? (
            <p className="mt-5 text-sm text-[#6d5550]">
              No careers for this stream.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-[#eaded8]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#fbeeec] text-xs font-bold uppercase tracking-[0.04em] text-[#7a635d]">
                  <tr>
                    <th scope="col" className="w-8 py-2.5 pl-3 pr-1 sm:pl-4">
                      #
                    </th>
                    <th scope="col" className="px-2 py-2.5">
                      Career
                    </th>
                    <th
                      scope="col"
                      className="hidden px-2 py-2.5 sm:table-cell"
                    >
                      Stream
                    </th>
                    <th scope="col" className="px-2 py-2.5">
                      Pay
                    </th>
                    <th
                      scope="col"
                      className="py-2.5 pl-2 pr-3 text-right sm:pr-4"
                    >
                      Match
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.matches.map((m, i) => {
                    const c = m.career;
                    const href = `/careers/${c.career_id}`;
                    return (
                      <tr
                        key={c.career_id}
                        onClick={() => router.push(href)}
                        className="cursor-pointer border-t border-[#f1e6e0] align-top transition hover:bg-[#fffaf6]"
                      >
                        <td className="py-3 pl-3 pr-1 font-bold tabular-nums text-[#b9a39c] sm:pl-4">
                          {i + 1}
                        </td>
                        <td className="px-2 py-3">
                          <Link
                            href={href}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-[#2f2320] hover:text-[#B52326] hover:underline"
                          >
                            {c.name}
                          </Link>
                          {/* phones: the stream sits under the name */}
                          <div className="mt-0.5 text-xs text-[#7a635d] sm:hidden">
                            {c.parent_stream}
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-2 py-3 text-[#5c4b46] sm:table-cell">
                          {c.parent_stream}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3">
                          <PayTier tier={c.pay_tier} />
                        </td>
                        <td className="whitespace-nowrap py-3 pl-2 pr-3 text-right font-bold tabular-nums text-[#B52326] sm:pr-4">
                          {Math.round(m.match)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={start}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border-[1.5px] border-[#B52326] px-5 text-sm font-bold text-[#B52326] hover:bg-[#fbeeec]"
            >
              <RotateCcw size={16} /> Take the quiz again
            </button>
            <button
              type="button"
              onClick={() => set({ screen: "quiz" })}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-3 text-sm font-bold text-[#7a635d] hover:text-[#2f2320]"
            >
              <ArrowLeft size={16} /> Change my answers
            </button>
            <Link
              href="/careers"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[#B52326] px-5 text-sm font-bold text-white hover:bg-[#9E1F22]"
            >
              Explore all careers <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    if (current.kind === "rate") return renderRatings(current.page);
    if (current.kind === "tie") return renderTie(current);
    if (current.kind === "pick") return renderPick();
    return renderRank();
  };

  return (
    <>
      <Head>
        <title>Career Quiz - Futures</title>
        <meta
          name="description"
          content="Thirty quick statements about what you enjoy and your favourite subjects, matched to careers that fit your interests."
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
        ) : screen === "results" && careers && quiz ? (
          renderResults()
        ) : screen === "quiz" && quiz ? (
          renderStep()
        ) : (
          renderIntro()
        )}
      </div>
    </>
  );
}

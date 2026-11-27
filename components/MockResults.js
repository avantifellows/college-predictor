import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { analyzeList } from "../utils/listAnalyzer";
import { buildOrder, compareKeys } from "../utils/choiceScore";
import { examSpaceFor } from "../utils/josaaSimulator";
import ChoiceBuilder from "./ChoiceBuilder";
import OrderNote from "./OrderNote";
import { formatRank, formatSalary } from "./mockAllotmentTheme";

// The end of a JoSAA mock run: the student's list sorted into High /
// Moderate / Low chance cards, one line on its balance, and "Help me
// improve my list", which runs the predictor's Help me choose quiz
// (ChoiceBuilder) and answers with 20 college + course picks ordered by
// those answers (utils/choiceScore.js), each with NIRF rank and salary.
//
// Chances are the list analyzer's tags against last year's final-round
// closing rank (utils/listAnalyzer.js): safety → High, match → Moderate,
// reach → Low.

const BUCKETS = [
  {
    tag: "safety",
    title: "High Chance",
    line: "Closed well past your rank last year",
    box: "border-[#bfe0cd] bg-[#f2faf5]",
    accent: "text-[#1f8a5b]",
    badge: "bg-[#e8f5ee] text-[#1f8a5b]",
  },
  {
    tag: "match",
    title: "Moderate Chance",
    line: "Closed close to your rank last year",
    box: "border-[#ecdcb4] bg-[#fdf9ef]",
    accent: "text-[#8a6d1f]",
    badge: "bg-[#fbf1da] text-[#8a6d1f]",
  },
  {
    tag: "reach",
    title: "Low Chance",
    line: "Closed before your rank last year",
    box: "border-[#f0c9c9] bg-[#fdf4f3]",
    accent: "text-[#b52326]",
    badge: "bg-[#fbeeec] text-[#8f2e31]",
  },
];
const BUCKET_OF = Object.fromEntries(BUCKETS.map((b) => [b.tag, b]));

// same key the predictor's Help me choose saves under, so answers given in
// either place are already filled in the other
const PREFS_KEY = "futures:josaaChoices";
const PICKS = 20;

const pairKey = (c) => `${c.institute}|${c.program}`;

const ChanceCard = ({ bucket, items }) => {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, 4);
  return (
    <div className={`flex flex-col rounded-2xl border p-4 ${bucket.box}`}>
      <p
        className={`text-sm font-black uppercase tracking-wide ${bucket.accent}`}
      >
        {bucket.title}
      </p>
      <p className="mt-1 text-4xl font-black leading-none text-[#2f2320]">
        {items.length}
      </p>
      <p className="mt-1 text-xs text-[#6d5550]">{bucket.line}</p>
      {items.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {shown.map((c) => (
            <li
              key={pairKey(c)}
              className="rounded-lg bg-white/80 px-2.5 py-1.5 text-xs"
            >
              <p className="font-bold text-[#3a2c28]">
                <span className={`mr-1 ${bucket.accent}`}>#{c.pref}</span>
                {c.institute}
              </p>
              <p className="text-[#7a655f]">{c.program}</p>
            </li>
          ))}
        </ol>
      )}
      {items.length > 4 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`mt-2 self-start text-xs font-bold underline ${bucket.accent}`}
        >
          {open ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
};

// the one line on balance
const feedbackFor = ({ nReach, nMatch, nSafety }) => {
  if (nReach + nMatch + nSafety === 0) return null;
  if (nSafety === 0)
    return {
      tone: "border-[#f0c9c9] bg-[#fbeeec] text-[#8f2e31]",
      text: "Your list lacks a safety net.",
    };
  if (nReach === 0)
    return {
      tone: "border-[#ecdcb4] bg-[#fdf9ef] text-[#6b5414]",
      text: "You can get better options at your rank.",
    };
  return {
    tone: "border-[#bfe0cd] bg-[#e8f5ee] text-[#1a6b47]",
    text: "Your list is well balanced: dream picks on top, safe ones below.",
  };
};

const nirfLabel = (college) => {
  const nirf = college?.nirf;
  if (!nirf?.rank) return "Not ranked";
  return nirf.category === "Engineering"
    ? `#${nirf.rank}`
    : `#${nirf.rank} (${nirf.category})`;
};

const PickRow = ({ pick, n }) => {
  const bucket = BUCKET_OF[pick.tag];
  return (
    <li className="flex gap-3 rounded-xl border border-[#f0e6e1] bg-white px-3 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fbeeec] text-xs font-black text-[#B52326]">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <p className="text-sm font-bold text-[#2f2320]">{pick.institute}</p>
          <div className="flex shrink-0 gap-1">
            {pick.onList && (
              <span className="rounded-full bg-[#f5ece8] px-2 py-0.5 text-[10px] font-bold text-[#5b4a45]">
                On your list
              </span>
            )}
            {bucket && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bucket.badge}`}
              >
                {bucket.title}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-[#6d5550]">{pick.program}</p>
        <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          <div className="flex gap-1">
            <dt className="text-[#8a6d63]">Closing rank</dt>
            <dd className="font-bold text-[#2f2320]">
              {formatRank(pick.closingRank)}{" "}
              <span className="font-normal text-[#8a6d63]">
                ({pick.exam === "JEE Advanced" ? "Advanced" : "Main"})
              </span>
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-[#8a6d63]">NIRF</dt>
            <dd className="font-bold text-[#2f2320]">{pick.nirf}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-[#8a6d63]">Median salary</dt>
            <dd className="font-bold text-[#2f2320]">
              {pick.salary == null ? "Not reported" : formatSalary(pick.salary)}
            </dd>
          </div>
        </dl>
      </div>
    </li>
  );
};

const MockResults = ({
  choices,
  catalog,
  seatIndex,
  collegesByName,
  profile,
}) => {
  const analysis = useMemo(
    () => analyzeList({ choices, catalog, seatIndex, collegesByName, profile }),
    [choices, catalog, seatIndex, collegesByName, profile]
  );

  const byTag = useMemo(() => {
    const out = { safety: [], match: [], reach: [] };
    analysis.evaluated.forEach((c, i) => {
      if (c.tag) out[c.tag].push({ ...c, pref: i + 1 });
    });
    return out;
  }, [analysis]);
  const unrated = analysis.evaluated.filter((c) => !c.tag).length;
  const feedback = feedbackFor(analysis);

  // Help me improve my list: the quiz, then 20 picks
  const [prefs, setPrefs] = useState(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [branchParents, setBranchParents] = useState(null);
  useEffect(() => {
    fetch("/data/JEE/josaa_branch_parents.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setBranchParents)
      .catch(() => setBranchParents({}));
  }, []);
  const savedPrefs = useMemo(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PREFS_KEY));
      return saved?.interest && saved.workplace ? saved : null;
    } catch {
      return null;
    }
  }, []);

  // everything this student could be offered (not Low Chance), on the list
  // or not, in the predictor's row shape so buildOrder can score it
  const pool = useMemo(() => {
    const onList = new Set(choices.map(pairKey));
    return [...analysis.evaluated, ...analysis.candidates]
      .filter((c) => c.tag && c.tag !== "reach")
      .map((c) => {
        const college = collegesByName.get(c.institute);
        return {
          institute: c.institute,
          program: c.program,
          tag: c.tag,
          onList: onList.has(pairKey(c)),
          state: college?.state || null,
          nirf: nirfLabel(college),
          salary: college?.placement?.median_salary ?? null,
          closingRank: c.closingRank,
          exam: examSpaceFor(c.institute, collegesByName),
          row: {
            Institute: c.institute,
            Exam: examSpaceFor(c.institute, collegesByName),
            "Closing Rank": c.closingRank,
            "NIRF List": college?.nirf?.category || null,
            "NIRF Rank": college?.nirf?.rank ?? null,
            "Academic Program Name": c.program,
          },
        };
      });
  }, [analysis, choices, collegesByName]);

  const quizStates = useMemo(
    () => Array.from(new Set(pool.map((p) => p.state).filter(Boolean))).sort(),
    [pool]
  );
  const quizBranches = useMemo(() => {
    if (!branchParents) return [];
    const seen = new Map();
    pool.forEach((p) => {
      const parent = branchParents[p.program];
      if (parent) seen.set(parent.id, parent);
    });
    return [...seen.values()];
  }, [pool, branchParents]);

  const picks = useMemo(() => {
    if (!prefs || !branchParents) return null;
    const key = buildOrder(
      pool.map((p) => p.row),
      { ...prefs, families: prefs.families || [] },
      branchParents
    );
    const states = new Set(prefs.states || []);
    const keyed = pool.map((p) => ({
      p,
      // their states first, then the quiz's order
      k: [states.size && !states.has(p.state) ? 1 : 0, ...key(p.row)],
    }));
    keyed.sort((a, b) => compareKeys(a.k, b.k));
    return keyed.slice(0, PICKS).map((x) => x.p);
  }, [prefs, branchParents, pool]);

  const onQuizDone = (answers) => {
    setPrefs(answers);
    setQuizOpen(false);
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(answers));
    } catch {
      // ignore: the picks still show for this visit
    }
    setTimeout(
      () =>
        document
          .getElementById("mock-picks")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      60
    );
  };

  return (
    <div>
      <h2 className="pt-2 text-center text-lg font-black text-[#2f2320]">
        How strong was your list?
      </h2>
      <p className="mt-1 text-center text-xs text-[#7a635d]">
        Each choice against last year&apos;s final-round closing rank
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {BUCKETS.map((b) => (
          <ChanceCard key={b.tag} bucket={b} items={byTag[b.tag]} />
        ))}
      </div>
      {unrated > 0 && (
        <p className="mt-2 text-xs text-[#7a635d]">
          {unrated} choice{unrated === 1 ? " has" : "s have"} no seat for your
          category last year, so {unrated === 1 ? "it isn't" : "they aren't"}{" "}
          counted.
        </p>
      )}

      {feedback && (
        <p
          className={`mt-4 rounded-xl border px-4 py-3 text-center text-[15px] font-bold ${feedback.tone}`}
        >
          {feedback.text}
        </p>
      )}

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setQuizOpen(true)}
          disabled={!branchParents}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[#B52326] px-6 py-3 text-base font-black text-white transition hover:bg-[#9E1F22] disabled:opacity-50"
        >
          <Sparkles size={18} />
          {picks ? "Change my answers" : "Help me improve my list"}
        </button>
      </div>

      {picks && (
        <section id="mock-picks" className="mt-6 scroll-mt-4">
          <h3 className="text-lg font-black text-[#2f2320]">
            {picks.length} picks for you
          </h3>
          <p className="mt-0.5 text-sm text-[#6d5550]">
            Seats you could get at your rank, in the order that suits your
            answers.
          </p>
          <OrderNote prefs={prefs} className="mt-3" />
          {picks.length === 0 ? (
            <p className="mt-3 text-sm text-[#7a655f]">
              No seat closed near your rank last year for your category.
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {picks.map((p, i) => (
                <PickRow key={pairKey(p)} pick={p} n={i + 1} />
              ))}
            </ol>
          )}
        </section>
      )}

      {quizOpen && (
        <ChoiceBuilder
          states={quizStates}
          branches={quizBranches}
          initial={prefs || savedPrefs}
          onDone={onQuizDone}
          onClose={() => setQuizOpen(false)}
        />
      )}
    </div>
  );
};

export default MockResults;

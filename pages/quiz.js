import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Check, CheckCircle2, Search, X } from "lucide-react";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The Career Quiz, following the futures-v2 demo's design on shipped data:
// Career -> Degree -> College -> Exam -> Rank (guess, then a Reality Check
// screen) -> Path. Data: careers.json for names, colleges.json for
// programmes/NIRF/fees, per-category JoSAA files for the cutoff reveal.
// The guess-first steps exist because surveyed students underestimate
// cutoffs by ~25%; guessing before seeing makes the answer stick.

const STAGES = ["Career", "Degree", "College", "Exam", "Rank", "Path"];

// wrong answers for the degree guess — none of these admit through JoSAA
const DEGREE_DISTRACTORS = [
  "Diploma (Polytechnic)",
  "Bachelor of Vocation",
  "Certificate Course",
];

const CATEGORIES = ["OPEN", "EWS", "OBC-NCL", "SC", "ST"];
const GENDERS = ["Gender-Neutral", "Female-only (including Supernumerary)"];

const fmtL = (n) => (n == null ? null : `₹${(n / 100000).toFixed(1)} L`);
const programString = (p) =>
  p.years && p.degree
    ? `${p.branch} (${p.years} Years, ${p.degree})`
    : p.branch;

const StagePills = ({ stageIdx }) => (
  <div className="flex flex-wrap items-center justify-center gap-2">
    {STAGES.map((s, i) => (
      <span
        key={s}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
          i === stageIdx
            ? "border-[#B52326] bg-white text-[#B52326]"
            : i < stageIdx
            ? "border-[#eaded8] bg-white text-[#2f2320]"
            : "border-[#eaded8] bg-white text-[#a89a94]"
        }`}
      >
        {i < stageIdx ? (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1f8a5b] text-white">
            <Check size={11} />
          </span>
        ) : (
          <span
            className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
              i === stageIdx
                ? "bg-[#B52326] text-white"
                : "bg-[#f0e6e1] text-[#a89a94]"
            }`}
          >
            {i + 1}
          </span>
        )}
        {s}
      </span>
    ))}
  </div>
);

const StepHead = ({ kicker, title, sub }) => (
  <div className="mb-4">
    <div className="text-xs font-black uppercase tracking-wide text-[#B52326]">
      {kicker}
    </div>
    <h2 className="mt-1 text-xl font-black leading-tight text-[#2f2320] sm:text-2xl">
      {title}
    </h2>
    {sub ? <p className="mt-1 text-sm text-[#7a635d]">{sub}</p> : null}
  </div>
);

const BigButton = ({ onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-black text-white transition ${
      disabled
        ? "cursor-not-allowed bg-[#B52326]/40"
        : "bg-[#B52326] hover:bg-[#9E1F22]"
    }`}
  >
    {children}
  </button>
);

const BackButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-[10px] border border-[#e0cdc6] bg-white px-4 py-2.5 text-sm font-bold text-[#4f403a] transition hover:border-[#B52326]/50"
  >
    Back
  </button>
);

const McqOption = ({ letter, label, on, revealed, correct, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
      revealed
        ? correct
          ? "border-[#1f8a5b] bg-[#e8f5ee] text-[#1f8a5b]"
          : on
          ? "border-[#B52326] bg-[#fbeeec] text-[#8f2e31] line-through"
          : "border-[#eaded8] text-[#a89a94]"
        : on
        ? "border-[#B52326] bg-[#fbeeec] text-[#8f2e31]"
        : "border-[#eaded8] bg-white text-[#4a3a36] hover:border-[#B52326]/50"
    }`}
  >
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
        revealed
          ? correct
            ? "border-[#1f8a5b] text-[#1f8a5b]"
            : "border-current"
          : on
          ? "border-[#B52326] bg-[#B52326] text-white"
          : "border-[#e0cdc6] text-[#7a635d]"
      }`}
    >
      {revealed ? (
        correct ? (
          <Check size={14} />
        ) : on ? (
          <X size={14} />
        ) : (
          letter
        )
      ) : (
        letter
      )}
    </span>
    {label}
  </button>
);

export default function Quiz() {
  const [colleges, setColleges] = useState([]);
  const [careerNames, setCareerNames] = useState({});
  const [error, setError] = useState(null);

  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [careerId, setCareerId] = useState(null);
  const [degreeGuesses, setDegreeGuesses] = useState([]);
  const [degreeRevealed, setDegreeRevealed] = useState(false);
  const [degreePick, setDegreePick] = useState(null);
  const [collegeId, setCollegeId] = useState(null);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [showHelper, setShowHelper] = useState(false);
  const [prefState, setPrefState] = useState(null);
  const [prefSort, setPrefSort] = useState("nirf");
  const [examGuess, setExamGuess] = useState(null);
  const [category, setCategory] = useState("OPEN");
  const [gender, setGender] = useState("Gender-Neutral");
  const [homeState, setHomeState] = useState(null);
  const [rankGuess, setRankGuess] = useState("");
  const [actual, setActual] = useState(undefined);

  // a short beat between steps so a step change reads as a step change
  const goTo = (n) => {
    setBusy(true);
    setTimeout(() => {
      setStage(n);
      setBusy(false);
    }, 450);
  };

  // restore the walk after coming back from a linked page
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("quizState") || "null");
      if (saved) {
        setStage(saved.stage ?? 0);
        setCareerId(saved.careerId ?? null);
        setDegreeGuesses(saved.degreeGuesses ?? []);
        setDegreeRevealed(saved.degreeRevealed ?? false);
        setDegreePick(saved.degreePick ?? null);
        setCollegeId(saved.collegeId ?? null);
        setExamGuess(saved.examGuess ?? null);
        setCategory(saved.category ?? "OPEN");
        setGender(saved.gender ?? "Gender-Neutral");
        setHomeState(saved.homeState ?? null);
        setRankGuess(saved.rankGuess ?? "");
        setActual(saved.actual);
      }
    } catch (e) {
      /* fresh start */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        "quizState",
        JSON.stringify({
          stage,
          careerId,
          degreeGuesses,
          degreeRevealed,
          degreePick,
          collegeId,
          examGuess,
          category,
          gender,
          homeState,
          rankGuess,
          actual,
        })
      );
    } catch (e) {
      /* storage unavailable */
    }
  }, [
    hydrated,
    stage,
    careerId,
    degreeGuesses,
    degreeRevealed,
    degreePick,
    collegeId,
    examGuess,
    category,
    gender,
    homeState,
    rankGuess,
    actual,
  ]);

  useEffect(() => {
    Promise.all([
      fetch("/data/colleges/colleges.json").then((r) => r.json()),
      fetch("/data/careers/careers.json").then((r) => r.json()),
    ])
      .then(([cols, cars]) => {
        setColleges(cols);
        setCareerNames(
          Object.fromEntries(cars.map((c) => [c.career_id, c.name]))
        );
      })
      .catch(() => setError("Could not load the quiz data right now."));
  }, []);

  const careers = useMemo(() => {
    const count = {};
    for (const c of colleges)
      for (const p of c.programs.list)
        if (p.career_id) count[p.career_id] = (count[p.career_id] || 0) + 1;
    return Object.entries(count)
      .filter(([id]) => careerNames[id])
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => ({ value: id, label: careerNames[id] }));
  }, [colleges, careerNames]);

  const pairs = useMemo(() => {
    if (!careerId) return [];
    const out = [];
    for (const c of colleges)
      for (const p of c.programs.list)
        if (p.career_id === careerId) out.push({ college: c, program: p });
    return out;
  }, [colleges, careerId]);

  const realDegrees = useMemo(
    () => [
      ...new Set(pairs.map(({ program }) => program.degree).filter(Boolean)),
    ],
    [pairs]
  );

  const collegeOptions = useMemo(() => {
    let rows = pairs.filter(
      ({ program }) => !degreePick || program.degree === degreePick
    );
    if (showHelper && prefState)
      rows = rows.filter(({ college }) => college.state === prefState);
    const q = collegeSearch.trim().toLowerCase();
    if (q)
      rows = rows.filter(({ college }) =>
        college.display_name.toLowerCase().includes(q)
      );
    // Help-me-choose never sorts by cutoff — guessing it is a later step
    const score =
      showHelper && prefSort === "salary"
        ? ({ college }) => -(college.placement?.median_salary ?? 0)
        : ({ college }) => college.nirf?.engineering_rank ?? 9999;
    return rows.slice().sort((a, b) => score(a) - score(b));
  }, [pairs, degreePick, collegeSearch, showHelper, prefState, prefSort]);

  const picked = pairs.find(({ college }) => college.college_id === collegeId);
  const correctExam = picked?.college.entrance_exams?.[0] || "JEE Main";

  const states = useMemo(
    () => [...new Set(colleges.map((c) => c.state).filter(Boolean))].sort(),
    [colleges]
  );

  const revealRank = async () => {
    setBusy(true);
    const rows = await fetch(
      `/data/JEE/${encodeURIComponent(category)}.json`
    ).then((r) => r.json());
    const progStr = programString(picked.program);
    const wantQuota =
      correctExam === "JEE Advanced"
        ? "AI"
        : homeState === picked.college.state
        ? "HS"
        : "OS";
    const match = rows.filter(
      (r) =>
        r.Institute === picked.college.display_name &&
        r["Academic Program Name"] === progStr &&
        r.Gender === gender
    );
    const row =
      match.find((r) => r.Quota === wantQuota) ||
      match.find((r) => r.Quota === "AI") ||
      match[0];
    setActual(
      row
        ? {
            rank: parseInt(String(row["Closing Rank"]).replace(/\D/g, ""), 10),
            quota: row.Quota,
          }
        : null
    );
    setTimeout(() => {
      setStage(5);
      setBusy(false);
    }, 450);
  };

  const reset = () => {
    try {
      sessionStorage.removeItem("quizState");
    } catch (e) {
      /* noop */
    }
    setStage(0);
    setCareerId(null);
    setDegreeGuesses([]);
    setDegreeRevealed(false);
    setDegreePick(null);
    setCollegeId(null);
    setCollegeSearch("");
    setShowHelper(false);
    setExamGuess(null);
    setRankGuess("");
    setActual(undefined);
  };

  const guessNum = Number(rankGuess);
  const quotaLabel =
    actual?.quota === "AI"
      ? "All India"
      : actual?.quota === "HS"
      ? "Home-state quota"
      : "Other-state quota";

  // the breadcrumb of what's locked in so far
  const crumb = [
    careerId && careerNames[careerId],
    stage >= 2 && degreePick,
    stage >= 3 && picked?.college.display_name,
    stage >= 4 && correctExam,
  ]
    .filter(Boolean)
    .join(" → ");

  return (
    <>
      <Head>
        <title>Career Quiz - Avanti Fellows</title>
        <meta
          name="description"
          content="The path to a career: degree, college, exam and cutoff. Guess each step, then see the answer."
        />
      </Head>
      <div className="min-h-screen px-3 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-center text-3xl font-bold text-[#332724]">
            Career Quiz
          </h1>
          <p className="mt-2 text-center text-sm text-[#6d5550]">
            The path to a career: degree, college, exam and cutoff.
          </p>
          <div className="mt-5">
            <StagePills
              stageIdx={
                Math.min(stage, 5) === 5 && actual === undefined
                  ? 4
                  : Math.min(stage, 5)
              }
            />
          </div>

          <div className="mt-6 rounded-2xl border border-[#eee1d7] bg-white p-5 shadow-sm sm:p-8">
            {stage >= 1 && stage <= 4 && crumb ? (
              <div className="mb-5 rounded-r-lg border-l-4 border-[#B52326] bg-[#fbeeec] px-4 py-3">
                <div className="text-[11px] font-black uppercase tracking-wide text-[#B52326]">
                  Your path
                </div>
                <div className="mt-0.5 text-sm font-semibold text-[#4a3a36]">
                  {crumb}
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="py-8 text-center text-sm text-[#8f2e31]">{error}</p>
            ) : colleges.length === 0 || busy ? (
              <div className="flex items-center justify-center gap-3 py-12 text-sm text-[#7a635d]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#eaded8] border-t-[#B52326]" />
                {colleges.length === 0 ? "Loading…" : ""}
              </div>
            ) : stage === 0 ? (
              <>
                <StepHead
                  kicker="Step 1 · Career"
                  title="Which engineering career do you want to explore?"
                  sub="Biggest seat pools first."
                />
                <Dropdown
                  options={careers}
                  selectedValue={careerId}
                  onChange={(o) => setCareerId(o.value)}
                  placeholder="Pick a career…"
                  hideValueWhileSearching
                />
                <div className="mt-5 flex justify-end">
                  <BigButton disabled={!careerId} onClick={() => goTo(1)}>
                    Continue <ArrowRight size={16} />
                  </BigButton>
                </div>
              </>
            ) : stage === 1 ? (
              <>
                <StepHead
                  kicker="Step 2 · Degree"
                  title={`Which degrees can take you into ${careerNames[careerId]}?`}
                  sub="Pick all you think are right, then check your answer."
                />
                <div className="space-y-2">
                  {[...realDegrees, ...DEGREE_DISTRACTORS].map((d, di) => (
                    <McqOption
                      key={d}
                      letter={String.fromCharCode(65 + di)}
                      label={d}
                      on={degreeGuesses.includes(d)}
                      revealed={degreeRevealed}
                      correct={realDegrees.includes(d)}
                      onClick={() =>
                        !degreeRevealed &&
                        setDegreeGuesses((g) =>
                          g.includes(d) ? g.filter((x) => x !== d) : [...g, d]
                        )
                      }
                    />
                  ))}
                </div>
                {!degreeRevealed ? (
                  <div className="mt-5 flex items-center justify-between">
                    <BackButton onClick={() => goTo(0)} />
                    <BigButton
                      disabled={degreeGuesses.length === 0}
                      onClick={() => setDegreeRevealed(true)}
                    >
                      Check my answer
                    </BigButton>
                  </div>
                ) : (
                  <div className="mt-5">
                    <p className="mb-4 text-sm leading-6 text-[#5f514c]">
                      Pick one to continue.
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <BackButton onClick={() => goTo(0)} />
                      <div className="flex flex-wrap justify-end gap-2">
                      {realDegrees.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDegreePick(d);
                            setCollegeId(null);
                            goTo(2);
                          }}
                          className="rounded-[10px] bg-[#B52326] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#9E1F22]"
                        >
                          {d} <ArrowRight size={14} className="inline" />
                        </button>
                      ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : stage === 2 ? (
              <>
                <StepHead
                  kicker="Step 3 · College"
                  title="Pick a college to aim for"
                />
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-[#d8c7c1] bg-[#fffdfa] px-3">
                    <Search size={15} className="shrink-0 text-[#a89a94]" />
                    <input
                      value={collegeSearch}
                      onChange={(e) => {
                        setCollegeSearch(e.target.value);
                        if (e.target.value) setShowHelper(false);
                      }}
                      placeholder="Search a college…"
                      className="w-full bg-transparent text-sm text-[#2f2320] outline-none placeholder:text-[#a89a94]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHelper((v) => !v);
                      setCollegeSearch("");
                    }}
                    className={`h-11 shrink-0 rounded-xl border px-3.5 text-xs font-bold transition ${
                      showHelper
                        ? "border-[#B52326] bg-[#B52326] text-white"
                        : "border-[#B52326] bg-white text-[#B52326] hover:bg-[#fbeeec]"
                    }`}
                  >
                    Help me choose
                  </button>
                </div>
                {showHelper ? (
                  <div className="mb-3 grid gap-2 rounded-xl border border-[#eaded8] bg-[#fdf8f6] p-3 sm:grid-cols-2">
                    <Dropdown
                      options={[
                        { value: null, label: "Any state" },
                        ...states.map((s) => ({ value: s, label: s })),
                      ]}
                      selectedValue={prefState}
                      onChange={(o) => setPrefState(o.value)}
                      placeholder="Any state"
                      hideValueWhileSearching
                    />
                    <Dropdown
                      options={[
                        { value: "nirf", label: "Order by NIRF rank" },
                        { value: "salary", label: "Order by median package" },
                      ]}
                      selectedValue={prefSort}
                      onChange={(o) => setPrefSort(o.value)}
                      isSearchable={false}
                    />
                  </div>
                ) : null}
                <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                  {collegeOptions.map(({ college, program }) => (
                    <button
                      key={college.college_id + program.branch}
                      type="button"
                      onClick={() => {
                        setCollegeId(college.college_id);
                        setExamGuess(null);
                        goTo(3);
                      }}
                      className="block w-full rounded-xl border border-[#eaded8] bg-white p-3.5 text-left transition hover:border-[#B52326]/50 hover:bg-[#fdf8f6]"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-bold text-[#2f2320]">
                          {college.display_name}
                        </span>
                        {college.nirf?.engineering_rank ? (
                          <span className="shrink-0 text-xs font-bold text-[#8f2e31]">
                            NIRF #{college.nirf.engineering_rank}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-[#7a635d]">
                        {program.branch} · {college.state}
                        {college.fees?.annual_fee
                          ? ` · ${fmtL(college.fees.annual_fee)}/yr fee`
                          : ""}
                        {showHelper &&
                        prefSort === "salary" &&
                        college.placement?.median_salary
                          ? ` · median ${fmtL(college.placement.median_salary)}`
                          : ""}
                      </div>
                    </button>
                  ))}
                  {collegeOptions.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#d8c8c0] p-4 text-sm text-[#7a635d]">
                      No colleges match. Clear the search or widen the state.
                    </p>
                  ) : null}
                </div>
                <div className="mt-4">
                  <BackButton onClick={() => goTo(1)} />
                </div>
              </>
            ) : stage === 3 ? (
              <>
                <StepHead
                  kicker="Step 4 · Exam"
                  title={`Which exam gets you into ${picked?.college.display_name}?`}
                  sub="Guess first."
                />
                <div className="space-y-2">
                  {["JEE Main", "JEE Advanced"].map((e, ei) => (
                    <McqOption
                      key={e}
                      letter={String.fromCharCode(65 + ei)}
                      label={e}
                      on={examGuess === e}
                      revealed={Boolean(examGuess)}
                      correct={e === correctExam}
                      onClick={() => !examGuess && setExamGuess(e)}
                    />
                  ))}
                </div>
                {examGuess ? (
                  <p className="mt-5 rounded-xl border border-[#eaded8] bg-[#fdf8f6] p-4 text-base leading-7 text-[#2f2320]">
                    <span className="font-bold">
                      {examGuess === correctExam
                        ? `Right, it's ${correctExam}.`
                        : `It's ${correctExam}.`}
                    </span>{" "}
                    {correctExam === "JEE Advanced"
                      ? "IITs admit through JEE Advanced, which you qualify for via JEE Main."
                      : "NITs, IIITs and GFTIs admit on the JEE Main rank."}
                  </p>
                ) : null}
                <div className="mt-5 flex items-center justify-between">
                  <BackButton onClick={() => goTo(2)} />
                  {examGuess ? (
                    <BigButton onClick={() => goTo(4)}>
                      Continue <ArrowRight size={16} />
                    </BigButton>
                  ) : null}
                </div>
              </>
            ) : stage === 4 ? (
              <>
                <StepHead
                  kicker="Step 5 · Rank"
                  title={`Guess the closing rank for ${picked?.program.branch} at ${picked?.college.display_name}`}
                  sub="Your category, gender and home state change the cutoff."
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Dropdown
                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                    selectedValue={category}
                    onChange={(o) => setCategory(o.value)}
                    isSearchable={false}
                  />
                  <Dropdown
                    options={GENDERS.map((g) => ({
                      value: g,
                      label:
                        g === "Gender-Neutral"
                          ? "Gender-Neutral"
                          : "Female-only",
                    }))}
                    selectedValue={gender}
                    onChange={(o) => setGender(o.value)}
                    isSearchable={false}
                  />
                  <Dropdown
                    options={states.map((s) => ({ value: s, label: s }))}
                    selectedValue={homeState}
                    onChange={(o) => setHomeState(o.value)}
                    placeholder="Your home state…"
                    hideValueWhileSearching
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={rankGuess}
                    onChange={(e) => setRankGuess(e.target.value)}
                    placeholder={`Closing ${correctExam} rank…`}
                    className="h-12 w-56 rounded-xl border border-[#d8c7c1] bg-[#fffdfa] px-3 text-[#2f2320] outline-none transition placeholder:text-[#7a6159] focus:border-[#b52326] focus:ring-[3px] focus:ring-[#b52326]/[0.12]"
                  />
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <BackButton onClick={() => goTo(3)} />
                  <BigButton
                    disabled={!(guessNum > 0) || !homeState}
                    onClick={revealRank}
                  >
                    Reveal the cutoff <ArrowRight size={16} />
                  </BigButton>
                </div>
              </>
            ) : stage === 5 ? (
              <>
                <StepHead
                  kicker="Reality check"
                  title={`${picked?.program.branch} at ${picked?.college.display_name}`}
                />
                {actual ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[#eaded8] bg-[#fdf8f6] p-4">
                        <div className="text-xs font-bold uppercase tracking-wide text-[#7a635d]">
                          Actual closing rank
                        </div>
                        <div className="mt-1 text-3xl font-black tabular-nums text-[#B52326]">
                          {actual.rank.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#eaded8] bg-[#fdf8f6] p-4">
                        <div className="text-xs font-bold uppercase tracking-wide text-[#7a635d]">
                          Your guess
                        </div>
                        <div className="mt-1 text-3xl font-black tabular-nums text-[#2f2320]">
                          {guessNum > 0
                            ? guessNum.toLocaleString("en-IN")
                            : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#eaded8] bg-white p-4 text-sm font-semibold text-[#2f2320]">
                      <CheckCircle2
                        size={18}
                        className={`mt-0.5 shrink-0 ${
                          guessNum <= actual.rank
                            ? "text-[#1f8a5b]"
                            : "text-[#B52326]"
                        }`}
                      />
                      <span>
                        {(() => {
                          const off = Math.round(
                            ((actual.rank - guessNum) / actual.rank) * 100
                          );
                          if (Math.abs(off) <= 10)
                            return "Your guess was within 10% of the answer.";
                          return guessNum <= actual.rank
                            ? `Your guessed rank is inside this cutoff. In fact the seat closes ${off}% later than your guess.`
                            : `Your guessed rank is outside this cutoff. The seat closes ${Math.abs(
                                off
                              )}% earlier than your guess. Worth planning backup options.`;
                        })()}
                      </span>
                    </div>
                    <div className="mt-4 rounded-xl border border-[#eaded8] bg-white p-4 text-sm text-[#5f514c]">
                      {category} ·{" "}
                      {gender === "Gender-Neutral"
                        ? "Gender-Neutral"
                        : "Female-only"}{" "}
                      · {quotaLabel} · {correctExam} · JoSAA 2025
                    </div>
                  </>
                ) : (
                  <p className="rounded-xl border border-dashed border-[#d8c8c0] p-4 text-sm leading-6 text-[#5f514c]">
                    No closing rank was published for this exact combination in
                    JoSAA 2025. That can mean very few seats. Go back and try
                    another category or college.
                  </p>
                )}
                <div className="mt-6 flex items-center justify-between">
                  <BackButton onClick={() => goTo(4)} />
                  {actual ? (
                    <BigButton onClick={() => goTo(6)}>
                      See full path <ArrowRight size={16} />
                    </BigButton>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <StepHead
                  kicker="Path complete"
                  title={`Your path into ${careerNames[careerId]}`}
                />
                {/* chronological: the order the student will live it */}
                <ol className="relative ml-2 border-l-2 border-[#eaded8]">
                  {[
                    ["Entrance exam", correctExam],
                    actual && [
                      "Closing rank",
                      `${actual.rank.toLocaleString(
                        "en-IN"
                      )} (${category}, ${quotaLabel.toLowerCase()}, JoSAA 2025)`,
                    ],
                    [
                      "College",
                      `${picked?.college.display_name}${
                        picked?.college.fees?.annual_fee
                          ? ` · ${fmtL(picked.college.fees.annual_fee)}/yr fee`
                          : ""
                      }`,
                    ],
                    ["Degree", `${degreePick} in ${picked?.program.branch}`],
                    ["Career", careerNames[careerId]],
                  ]
                    .filter(Boolean)
                    .map(([label, value]) => (
                      <li key={label} className="relative mb-5 pl-6 last:mb-0">
                        <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#B52326]" />
                        <div className="text-xs font-semibold uppercase tracking-wide text-[#8a6d63]">
                          {label}
                        </div>
                        <div className="mt-0.5 break-words text-base font-bold text-[#2f2320]">
                          {value}
                        </div>
                      </li>
                    ))}
                </ol>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                  <BackButton onClick={() => goTo(5)} />
                  <Link
                    href={`/careers#${careerId}`}
                    className="rounded-full bg-[#f5ece8] px-3.5 py-1.5 text-xs font-bold text-[#8f2e31] transition hover:bg-[#f3dfd9]"
                  >
                    More about this career
                  </Link>
                  <Link
                    href={`/colleges?q=${encodeURIComponent(
                      picked?.college.display_name || ""
                    )}`}
                    className="rounded-full bg-[#f5ece8] px-3.5 py-1.5 text-xs font-bold text-[#8f2e31] transition hover:bg-[#f3dfd9]"
                  >
                    More about this college
                  </Link>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-xs text-[#7a635d] underline hover:text-[#B52326]"
                  >
                    Start over
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

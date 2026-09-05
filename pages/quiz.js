import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Check, X } from "lucide-react";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The Career Quiz: a guess-then-reveal walk — Career -> Degree -> College ->
// Exam -> Rank -> Path. Ported from the futures-v2 demo onto shipped data:
// careers.json for names, colleges.json for programmes/NIRF/fees/placement,
// and the per-category JoSAA files for the rank reveal. The rank-guess step
// exists because surveyed students underestimate cutoffs by ~25% — guessing
// first makes the answer stick.

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
            ? "border-[#B52326] bg-[#B52326] text-white"
            : i < stageIdx
            ? "border-[#B52326]/40 bg-[#fbeeec] text-[#8f2e31]"
            : "border-[#eaded8] bg-white text-[#a89a94]"
        }`}
      >
        <span className="tabular-nums">{i + 1}</span> {s}
      </span>
    ))}
  </div>
);

const StepHead = ({ n, title, sub }) => (
  <div className="mb-4">
    <div className="text-xs font-black uppercase tracking-wide text-[#B52326]">
      Step {n} · {STAGES[n - 1]}
    </div>
    <h2 className="mt-1 text-xl font-black text-[#2f2320] sm:text-2xl">
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

// one MCQ answer row: letter badge, then check/cross on reveal
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
  const [careerId, setCareerId] = useState(null);
  const [degreeGuesses, setDegreeGuesses] = useState([]);
  const [degreeRevealed, setDegreeRevealed] = useState(false);
  const [degreePick, setDegreePick] = useState(null);
  const [collegeId, setCollegeId] = useState(null);
  const [examGuess, setExamGuess] = useState(null);
  const [category, setCategory] = useState("OPEN");
  const [gender, setGender] = useState("Gender-Neutral");
  const [homeState, setHomeState] = useState(null);
  const [rankGuess, setRankGuess] = useState("");
  const [actual, setActual] = useState(undefined);

  // browser back from a linked page remounts this component — restore the
  // walk so "Full career profile" and back doesn't restart the quiz
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
      /* storage unavailable — the quiz still works, it just won't survive back */
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

  // careers with at least one JoSAA programme, biggest seat pools first
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

  // every (college, programme) pair for the chosen career
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

  const collegeOptions = useMemo(
    () =>
      pairs
        .filter(({ program }) => !degreePick || program.degree === degreePick)
        .sort(
          (a, b) =>
            (a.college.nirf?.engineering_rank ?? 999) -
            (b.college.nirf?.engineering_rank ?? 999)
        ),
    [pairs, degreePick]
  );

  const picked = collegeOptions.find(
    ({ college }) => college.college_id === collegeId
  );
  const correctExam = picked?.college.entrance_exams?.[0] || "JEE Main";

  const states = useMemo(
    () => [...new Set(colleges.map((c) => c.state).filter(Boolean))].sort(),
    [colleges]
  );

  // fetch the chosen category's JoSAA file and find the row for this college
  // + programme + gender, on the quota the student's home state earns (IITs
  // admit all-India; NITs/IIITs/GFTIs split home-state / other-state)
  const revealRank = async () => {
    setActual(undefined);
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
    setStage(5);
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
    setExamGuess(null);
    setRankGuess("");
    setActual(undefined);
  };

  const guessNum = Number(rankGuess);
  const offBy =
    actual?.rank && guessNum > 0
      ? Math.round(((guessNum - actual.rank) / actual.rank) * 100)
      : null;

  return (
    <>
      <Head>
        <title>Career Quiz - Avanti Fellows</title>
        <meta
          name="description"
          content="From career to degree to college to cutoff: guess each step, then see the answer."
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
            <StagePills stageIdx={stage} />
          </div>

          <div className="mt-6 rounded-2xl border border-[#eee1d7] bg-white p-5 shadow-sm sm:p-8">
            {error ? (
              <p className="py-8 text-center text-sm text-[#8f2e31]">{error}</p>
            ) : colleges.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6d5550]">
                Loading…
              </p>
            ) : stage === 0 ? (
              <>
                <StepHead
                  n={1}
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
                <div className="mt-5">
                  <BigButton disabled={!careerId} onClick={() => setStage(1)}>
                    Continue <ArrowRight size={16} />
                  </BigButton>
                </div>
              </>
            ) : stage === 1 ? (
              <>
                <StepHead
                  n={2}
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
                  <div className="mt-5">
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
                      {realDegrees.length === 1
                        ? `One route: ${realDegrees[0]}.`
                        : `The routes: ${realDegrees.join(", ")}.`}{" "}
                      Pick one to continue.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {realDegrees.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDegreePick(d);
                            setCollegeId(null);
                            setStage(2);
                          }}
                          className="rounded-[10px] bg-[#B52326] px-4 py-2 text-sm font-black text-white transition hover:bg-[#9E1F22]"
                        >
                          {d} <ArrowRight size={14} className="inline" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : stage === 2 ? (
              <>
                <StepHead n={3} title="Pick a college to aim for" sub={null} />
                <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                  {collegeOptions.map(({ college, program }) => (
                    <button
                      key={college.college_id + program.branch}
                      type="button"
                      onClick={() => {
                        setCollegeId(college.college_id);
                        setExamGuess(null);
                        setStage(3);
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
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : stage === 3 ? (
              <>
                <StepHead
                  n={4}
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
                  <div className="mt-5">
                    <p className="mb-4 text-sm leading-6 text-[#5f514c]">
                      {examGuess === correctExam
                        ? `Right — ${correctExam}.`
                        : `It's ${correctExam}.`}{" "}
                      {correctExam === "JEE Advanced"
                        ? "IITs admit through JEE Advanced, which you qualify for via JEE Main."
                        : "NITs, IIITs and GFTIs admit on the JEE Main rank."}
                    </p>
                    <BigButton onClick={() => setStage(4)}>
                      Continue <ArrowRight size={16} />
                    </BigButton>
                  </div>
                ) : null}
              </>
            ) : stage === 4 ? (
              <>
                <StepHead
                  n={5}
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
                  <BigButton
                    disabled={!(guessNum > 0) || !homeState}
                    onClick={revealRank}
                  >
                    Reveal the cutoff
                  </BigButton>
                </div>
              </>
            ) : (
              <>
                <StepHead
                  n={6}
                  title={
                    actual
                      ? `Closing rank: ${actual.rank.toLocaleString("en-IN")}`
                      : "No published cutoff for that exact combination"
                  }
                  sub={
                    actual
                      ? `${category}, ${
                          gender === "Gender-Neutral"
                            ? "gender-neutral"
                            : "female-only"
                        } seats, ${
                          actual.quota === "AI"
                            ? "all-India quota"
                            : actual.quota === "HS"
                            ? "home-state quota"
                            : "other-state quota"
                        } · JoSAA 2025`
                      : "That seat pool published no closing rank in JoSAA 2025 — it can mean very few seats. Try another category or college."
                  }
                />
                {actual && offBy != null ? (
                  <p className="text-sm leading-6 text-[#5f514c]">
                    You guessed {guessNum.toLocaleString("en-IN")} —{" "}
                    {Math.abs(offBy) <= 10 ? (
                      <span className="font-bold text-[#1f8a5b]">
                        within 10% of the answer.
                      </span>
                    ) : offBy > 0 ? (
                      <span className="font-bold text-[#8f2e31]">
                        the seat closes {offBy}% earlier than your guess.
                        Worth planning backup options.
                      </span>
                    ) : (
                      <span className="font-bold text-[#2f2320]">
                        the cutoff is {Math.abs(offBy)}% easier than your
                        guess.
                      </span>
                    )}
                  </p>
                ) : null}

                <div className="mt-6 rounded-xl border border-[#eaded8] bg-[#fdf8f6] p-4">
                  <div className="mb-3 text-xs font-black uppercase tracking-wide text-[#B52326]">
                    Your path
                  </div>
                  <ol className="space-y-2.5 text-sm text-[#4a3a36]">
                    {[
                      ["Career", careerNames[careerId]],
                      ["Degree", `${degreePick} in ${picked?.program.branch}`],
                      [
                        "College",
                        `${picked?.college.display_name}${
                          picked?.college.fees?.annual_fee
                            ? ` (${fmtL(
                                picked.college.fees.annual_fee
                              )}/yr fee)`
                            : ""
                        }`,
                      ],
                      ["Exam", correctExam],
                      actual && [
                        "Cutoff",
                        `closes near rank ${actual.rank.toLocaleString(
                          "en-IN"
                        )}`,
                      ],
                      picked?.college.placement?.median_salary && [
                        "After college",
                        `median package ${fmtL(
                          picked.college.placement.median_salary
                        )} (whole college, NIRF)`,
                      ],
                    ]
                      .filter(Boolean)
                      .map(([label, value], i) => (
                        <li key={label} className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B52326] text-[11px] font-black text-white">
                            {i + 1}
                          </span>
                          <span>
                            <span className="font-bold text-[#2f2320]">
                              {label}:
                            </span>{" "}
                            {value}
                          </span>
                        </li>
                      ))}
                  </ol>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    href={`/careers#${careerId}`}
                    className="rounded-full bg-[#f5ece8] px-3.5 py-1.5 text-xs font-bold text-[#8f2e31] transition hover:bg-[#f3dfd9]"
                  >
                    Full career profile
                  </Link>
                  <Link
                    href={`/colleges?q=${encodeURIComponent(
                      picked?.college.display_name || ""
                    )}`}
                    className="rounded-full bg-[#f5ece8] px-3.5 py-1.5 text-xs font-bold text-[#8f2e31] transition hover:bg-[#f3dfd9]"
                  >
                    College details
                  </Link>
                  <Link
                    href="/predictor?exam=JoSAA"
                    className="rounded-full bg-[#f5ece8] px-3.5 py-1.5 text-xs font-bold text-[#8f2e31] transition hover:bg-[#f3dfd9]"
                  >
                    Check your own rank
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

          {stage > 0 && stage < 5 ? (
            <button
              type="button"
              onClick={() => setStage(stage - 1)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#e0cdc6] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a34] transition hover:border-[#B52326]/50 hover:text-[#8f2e31]"
            >
              ← Back
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

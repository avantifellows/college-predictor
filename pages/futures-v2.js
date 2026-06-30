import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Search,
} from "lucide-react";

const CATEGORY_OPTIONS = ["OPEN", "EWS", "OBC-NCL", "SC", "ST"];
const GENDER_OPTIONS = [
  "Gender-Neutral",
  "Female-only (including Supernumerary)",
];

const DEGREE_SHORT = {
  "4yr BTech": "B.Tech",
  "5yr BTech+MTech": "Integrated B.Tech + M.Tech",
  "5yr BTech+MBA": "Integrated B.Tech + MBA",
  "4yr BSc": "B.Sc",
};
const degreeShort = (label) => (label ? DEGREE_SHORT[label] || label : "");

const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const byRank = (a, b) =>
  (a.closing_rank || Number.MAX_SAFE_INTEGER) -
  (b.closing_rank || Number.MAX_SAFE_INTEGER);

const selectBestCutoffs = (cutoffs, limit = 8) => {
  const preferred = cutoffs.filter(
    (cutoff) =>
      cutoff.seat_type === "OPEN" && cutoff.gender_pool === "Gender-Neutral"
  );
  return uniqueBy((preferred.length ? preferred : cutoffs).sort(byRank), (row) =>
    [row.college_id, row.branch_id, row.rank_space].join("|")
  ).slice(0, limit);
};

// Quota choices the student sees, mapped to the quota codes in the cutoff data.
// AI = All India (IITs and the all-India pool); HS/OS = Home / Other state
// (matters for NITs, IIITs and other state-quota institutes).
const QUOTA_OPTIONS = [
  { value: "AI", label: "All India" },
  { value: "HS", label: "Home state" },
  { value: "OS", label: "Other state" },
];

const getCutoffForFilters = (cutoffs, category, gender, quota) => {
  const tiers = [
    (row) =>
      row.seat_type === category &&
      row.gender_pool === gender &&
      (!quota || row.quota === quota),
    (row) => row.seat_type === category && (!quota || row.quota === quota),
    (row) => row.seat_type === category && row.gender_pool === gender,
    (row) => row.seat_type === category,
  ];
  for (const match of tiers) {
    const hit = cutoffs.filter(match).sort(byRank);
    if (hit.length) return hit[0];
  }
  return cutoffs.slice().sort(byRank)[0] || null;
};

// Which quota codes actually exist for a given set of cutoffs, in display order.
const availableQuotas = (cutoffs) => {
  const present = new Set(cutoffs.map((row) => row.quota));
  return QUOTA_OPTIONS.filter((option) => present.has(option.value));
};

// Friendly, demo-fixed wrong answers for the degree quiz. These do not exist in
// the JoSAA engineering data, which is the point — they teach what does NOT lead
// to an engineering seat. Correct answers are derived from real cutoff data.
const DEGREE_DISTRACTORS = ["3yr B.Sc", "5yr B.Sc + M.Sc"];

// Degrees that genuinely have JoSAA cutoffs for a career, most-offered first.
const degreesForCareer = (lookups, careerId) => {
  const links = lookups.careerBranchesByCareer[careerId] || [];
  const counts = {};
  links.forEach((link) => {
    const branch = lookups.branchesById[link.branch_id];
    const rows = (lookups.cutoffsByBranch[link.branch_id] || []).length;
    if (!branch || !branch.degree_label || !rows) return;
    counts[branch.degree_label] = (counts[branch.degree_label] || 0) + rows;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);
};

// Branch ids for a career that match the chosen degree (all variants merged).
const branchIdsForCareerDegree = (lookups, careerId, degreeLabel) =>
  (lookups.careerBranchesByCareer[careerId] || [])
    .filter(
      (link) =>
        lookups.branchesById[link.branch_id]?.degree_label === degreeLabel
    )
    .map((link) => link.branch_id);

const MetricCard = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="min-w-0 rounded-lg border border-[#eaded8] bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#8a6d63]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-bold text-[#2f2320]">
        {value}
      </div>
    </div>
  );
};

const EmptyState = ({ children }) => (
  <div className="rounded-lg border border-dashed border-[#d8c8c0] bg-white/70 p-6 text-sm text-[#6b5a53]">
    {children}
  </div>
);

const CareerList = ({ careers, selectedCareerId, onSelect, search, setSearch }) => (
  <aside className="hidden min-w-0 rounded-lg border border-[#eaded8] bg-white p-4 shadow-sm lg:block">
    <div className="mb-3 flex items-center gap-2 rounded-md border border-[#eaded8] bg-[#fdf8f6] px-3 py-2">
      <Search size={16} className="text-[#8a6d63]" />
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full bg-transparent text-sm outline-none"
        placeholder="Search careers"
      />
    </div>
    <div className="max-h-[360px] space-y-2 overflow-auto pr-1 md:max-h-[620px]">
      {careers.map((career) => (
        <button
          key={career.id}
          onClick={() => onSelect(career.id)}
          className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
            selectedCareerId === career.id
              ? "border-[#B52326] bg-[#fff4f0] text-[#2f2320]"
              : "border-transparent hover:border-[#eaded8] hover:bg-[#fdf8f6]"
          }`}
        >
          <span className="block font-semibold">{career.name}</span>
          <span className="mt-0.5 block truncate text-xs text-[#7d6b64]">
            {career.parent_branch || "Engineering"}
          </span>
        </button>
      ))}
    </div>
  </aside>
);

const MobileCareerPicker = ({ careers, selectedCareerId, onSelect }) => (
  <div className="rounded-lg border border-[#eaded8] bg-white p-4 shadow-sm lg:hidden">
    <label className="text-sm font-bold text-[#2f2320]">Explore another career</label>
    <select
      value={selectedCareerId}
      onChange={(event) => onSelect(event.target.value)}
      className="mt-2 w-full rounded-md border border-[#d8c8c0] bg-white px-3 py-3 text-sm"
    >
      {careers.map((career) => (
        <option key={career.id} value={career.id}>
          {career.name}
        </option>
      ))}
    </select>
  </div>
);

const ProfileRow = ({ number, title, children }) => (
  <section className="grid gap-3 border-t border-[#eaded8] py-6 md:grid-cols-[180px_1fr] md:gap-8">
    <div>
      <div className="text-xs font-black uppercase tracking-wide text-[#B52326]">
        {number}
      </div>
      <h3 className="mt-1 text-base font-black text-[#2f2320]">{title}</h3>
    </div>
    <div className="min-w-0 text-sm leading-7 text-[#5f514c]">{children}</div>
  </section>
);

const CareerDetail = ({ career, branches, colleges }) => (
  <section className="min-w-0 rounded-lg border border-[#eaded8] bg-white p-5 shadow-sm md:p-8">
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
          Engineering career
        </div>
        <h2 className="mt-2 break-words text-3xl font-black leading-tight text-[#2f2320] md:text-4xl">
          {career.name}
        </h2>
        {career.parent_branch && (
          <p className="mt-2 text-sm font-semibold text-[#6b5a53]">
            {career.parent_branch}
          </p>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 md:min-w-[300px] md:grid-cols-1">
        <MetricCard label="Entry pay" value={career.pay_entry_lpa} />
        <MetricCard label="Mid-career" value={career.pay_mid_lpa} />
      </div>
    </div>

    <div className="mt-7">
      <ProfileRow number="01" title="Day in the life">
        <p>{career.day_in_the_life}</p>
      </ProfileRow>

      <ProfileRow number="02" title="Real-world impact">
        <p>{career.real_world_impact}</p>
      </ProfileRow>

      <ProfileRow number="03" title="Career outlook">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Stability" value={career.stability_outlook} />
          <MetricCard label="Automation risk" value={career.automation_risk} />
          <MetricCard label="Location" value={career.geo_flexibility} />
        </div>
      </ProfileRow>

      <ProfileRow number="04" title="Possible branch paths">
        <div className="flex flex-wrap gap-3">
          {branches.length ? (
            branches.map((branch) => (
              <span
                key={branch.id}
                className="rounded-full bg-[#f5ece8] px-3 py-1.5 text-xs font-bold text-[#4f403a]"
              >
                {branch.name}
                {degreeShort(branch.degree_label)
                  ? ` · ${degreeShort(branch.degree_label)}`
                  : ""}
              </span>
            ))
          ) : (
            <span className="text-sm text-[#7d6b64]">No branch path found yet.</span>
          )}
        </div>
      </ProfileRow>

      <ProfileRow number="05" title="Top recruiters">
        <div className="flex flex-wrap gap-3">
          {career.top_recruiters.slice(0, 8).map((name) => (
            <span
              key={name}
              className="rounded-full border border-[#eaded8] bg-white px-3 py-1.5 text-xs font-bold text-[#4f403a]"
            >
              {name}
            </span>
          ))}
        </div>
      </ProfileRow>

      <ProfileRow number="06" title="JoSAA college options">
      {colleges.length ? (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-[#eaded8] md:block">
            <table className="w-full text-left text-sm">
            <thead className="bg-[#f8efec] text-xs uppercase text-[#6b5a53]">
              <tr>
                <th className="px-3 py-2">College</th>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">Exam</th>
                <th className="px-3 py-2">Closing rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaded8]">
              {colleges.map((cutoff) => (
                <tr key={cutoff.id}>
                  <td className="px-3 py-2 font-semibold text-[#2f2320]">
                    {cutoff.college_name}
                  </td>
                  <td className="px-3 py-2 text-[#5f514c]">{cutoff.branch_name}</td>
                  <td className="px-3 py-2 text-[#5f514c]">{cutoff.exam}</td>
                  <td className="px-3 py-2 font-bold text-[#2f2320]">
                    {cutoff.closing_rank?.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {colleges.map((cutoff) => (
              <div
                key={cutoff.id}
                className="rounded-lg border border-[#eaded8] bg-[#fdf8f6] p-3"
              >
                <div className="break-words text-sm font-bold text-[#2f2320]">
                  {cutoff.college_name}
                </div>
                <div className="mt-1 break-words text-sm text-[#5f514c]">
                  {cutoff.branch_name}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <MetricCard label="Exam" value={cutoff.exam} />
                  <MetricCard
                    label="Closing rank"
                    value={cutoff.closing_rank?.toLocaleString("en-IN")}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState>No JoSAA college options found yet.</EmptyState>
      )}
      </ProfileRow>
    </div>
  </section>
);

const QuizPanel = ({
  data,
  selectedCareerId,
  setSelectedCareerId,
  selectedCollegeId,
  setSelectedCollegeId,
  onLearnMore,
}) => {
  const [stage, setStage] = useState("career");
  const [category, setCategory] = useState("OPEN");
  const [gender, setGender] = useState("Gender-Neutral");
  const [quota, setQuota] = useState("AI");
  const [rankGuess, setRankGuess] = useState("");
  const [examGuess, setExamGuess] = useState("");
  const [examRevealed, setExamRevealed] = useState(false);
  const [degreeGuesses, setDegreeGuesses] = useState([]);
  const [degreeRevealed, setDegreeRevealed] = useState(false);
  const [selectedDegree, setSelectedDegree] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");
  const [showHelper, setShowHelper] = useState(false);
  const [prefState, setPrefState] = useState("");
  const [prefType, setPrefType] = useState("");
  const [prefPriority, setPrefPriority] = useState("nirf");
  const cardRef = useRef(null);
  const didMountRef = useRef(false);

  const lookups = useLookups(data);
  const career = lookups.careersById[selectedCareerId];

  // Degrees that actually have JoSAA cutoffs for this career (the real answers).
  const careerDegrees = degreesForCareer(lookups, selectedCareerId);
  // The degree the student picked drives which branches (merged) we resolve.
  const activeDegree =
    selectedDegree && careerDegrees.includes(selectedDegree)
      ? selectedDegree
      : careerDegrees[0] || "";
  const activeBranchIds = branchIdsForCareerDegree(
    lookups,
    selectedCareerId,
    activeDegree
  );
  // Pool cutoffs across every branch variant of the chosen career + degree.
  const pooledCutoffs = activeBranchIds.flatMap(
    (id) => lookups.cutoffsByBranch[id] || []
  );
  // One best (OPEN / Gender-Neutral) row per college, sorted by closing rank.
  const collegeOptions = selectBestCutoffs(pooledCutoffs, 200);

  // Enrich each college option with NIRF / state / salary for the chooser.
  const enrichedColleges = collegeOptions.map((cutoff) => ({
    ...cutoff,
    college: lookups.collegesById[cutoff.college_id] || {},
  }));

  const collegeTypes = uniqueBy(
    enrichedColleges
      .map((row) => row.college.type)
      .filter(Boolean)
      .map((type) => ({ type })),
    (row) => row.type
  ).map((row) => row.type);
  const collegeStates = uniqueBy(
    enrichedColleges
      .map((row) => row.college.state)
      .filter(Boolean)
      .map((state) => ({ state })),
    (row) => row.state
  )
    .map((row) => row.state)
    .sort();

  const searchedColleges = enrichedColleges.filter((row) => {
    const q = collegeSearch.trim().toLowerCase();
    if (!q) return true;
    return [row.college_name, row.college.state, row.college.type]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const selectedCollege =
    enrichedColleges.find((row) => row.college_id === selectedCollegeId) || null;
  const selectedCollegeCutoffs = selectedCollege
    ? pooledCutoffs.filter(
        (cutoff) =>
          cutoff.college_id === selectedCollege.college_id &&
          cutoff.rank_space === selectedCollege.rank_space
      )
    : [];
  const quotaOptions = availableQuotas(selectedCollegeCutoffs);
  const actualCutoff = getCutoffForFilters(
    selectedCollegeCutoffs,
    category,
    gender,
    quota
  );
  const numericGuess = Number(rankGuess);
  const resultText =
    stage === "reveal" && actualCutoff && rankGuess
      ? numericGuess <= actualCutoff.closing_rank
        ? "Your guessed rank is inside this cutoff."
        : "Your guessed rank is above this cutoff."
      : null;
  const stages = ["Career", "Degree", "College", "Exam", "Rank", "Path"];
  const stageIndex = {
    career: 0,
    degree: 1,
    college: 2,
    review: 2,
    exam: 3,
    rank: 4,
    reveal: 4,
    final: 5,
  }[stage];
  // Don't reveal the degree in the path banner while the student is still on the
  // degree-guess step — that would spoil the answer. Show it from college onward.
  const shouldShowDegreeInPath = stageIndex >= 2;
  const shouldShowCollegeInPath = stageIndex >= 2;

  // Clear the college if it's no longer valid for the current options (e.g. the
  // career or degree changed). We do NOT auto-pick one — the student chooses.
  useEffect(() => {
    if (
      selectedCollegeId &&
      !collegeOptions.find((cutoff) => cutoff.college_id === selectedCollegeId)
    ) {
      setSelectedCollegeId("");
    }
  }, [collegeOptions, selectedCollegeId, setSelectedCollegeId]);

  // Keep quota valid for the current college's available quotas.
  useEffect(() => {
    if (quotaOptions.length && !quotaOptions.find((q) => q.value === quota)) {
      setQuota(quotaOptions[0].value);
    }
  }, [quotaOptions, quota]);

  // Changing career resets the quiz back to the degree step.
  useEffect(() => {
    setRankGuess("");
    setSelectedDegree("");
    setDegreeGuesses([]);
    setDegreeRevealed(false);
    if (stage !== "career") setStage("degree");
  }, [selectedCareerId]);

  useEffect(() => {
    if (stage === "reveal") setStage("rank");
    setExamGuess("");
    setExamRevealed(false);
  }, [selectedDegree, selectedCollegeId, category, gender, quota]);

  // On each step change, bring the top of the quiz card into view so the new
  // step's heading is visible without manual scrolling (mobile especially).
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage]);

  if (!career) return null;

  // Degree quiz options: real answers (have cutoffs) + fixed wrong distractors.
  const degreeOptions = uniqueBy(
    [
      ...careerDegrees.map((label) => ({ label: degreeShort(label), correct: true })),
      ...DEGREE_DISTRACTORS.map((label) => ({ label, correct: false })),
    ],
    (option) => option.label
  );

  const toggleDegreeGuess = (label) =>
    setDegreeGuesses((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );

  // "Select all that apply" is right only if every picked option is correct and
  // every correct option was picked.
  const degreeAllCorrect =
    degreeGuesses.length > 0 &&
    degreeGuesses.every(
      (label) => degreeOptions.find((o) => o.label === label)?.correct
    ) &&
    degreeOptions.filter((o) => o.correct).every((o) => degreeGuesses.includes(o.label));

  const optionClass = (isSelected) =>
    `flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
      isSelected
        ? "border-[#B52326] bg-[#fbeeec] text-[#2f2320]"
        : "border-[#e0cdc6] bg-white hover:border-[#B52326] hover:bg-[#fbeeec]"
    }`;

  const back = () => {
    const next = {
      degree: "career",
      college: "degree",
      review: "college",
      exam: "review",
      rank: "exam",
      reveal: "rank",
      final: "reveal",
    }[stage];
    if (next) setStage(next);
  };

  const restart = () => {
    setStage("career");
    setRankGuess("");
    setExamGuess("");
    setExamRevealed(false);
    setDegreeGuesses([]);
    setDegreeRevealed(false);
    setSelectedDegree("");
    setCollegeSearch("");
    setShowHelper(false);
    setPrefState("");
    setPrefType("");
    setCategory("OPEN");
    setGender("Gender-Neutral");
    setQuota("AI");
  };

  // "Help me choose" ranks the full college set by the student's preference.
  // It never ranks by cutoff — guessing the cutoff is the point of a later step.
  const helperResults = (() => {
    let rows = enrichedColleges;
    if (prefState) rows = rows.filter((r) => r.college.state === prefState);
    if (prefType) rows = rows.filter((r) => r.college.type === prefType);
    const score = (r) =>
      prefPriority === "salary"
        ? -(r.college.median_salary ?? 0)
        : r.college.nirf_rank ?? Number.MAX_SAFE_INTEGER;
    return rows.slice().sort((a, b) => score(a) - score(b)).slice(0, 6);
  })();

  return (
    <section ref={cardRef} className="mx-auto max-w-[760px] scroll-mt-4">
      <div className="mb-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {stages.map((label, index) => (
          <span
            key={label}
            className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-[11px] font-bold sm:justify-start sm:gap-2 sm:px-3 sm:text-xs ${
              index === stageIndex
                ? "border-[#B52326] bg-[#fbeeec] text-[#B52326]"
                : index < stageIndex
                ? "border-[#d8c8c0] bg-white text-[#4f403a]"
                : "border-[#eaded8] bg-white text-[#8a6d63]"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                index === stageIndex
                  ? "bg-[#B52326] text-white"
                  : index < stageIndex
                  ? "bg-[#1f8a5b] text-white"
                  : "bg-[#f5ece8]"
              }`}
            >
              {index < stageIndex ? "✓" : index + 1}
            </span>
            <span className="truncate">{label}</span>
          </span>
        ))}
      </div>

      <div className="rounded-2xl border border-[#eaded8] bg-white p-5 shadow-sm md:p-8">
        {stage !== "career" && (
          <div className="mb-5 rounded-lg border border-[#eaded8] border-l-4 border-l-[#B52326] bg-[#fbeeec] p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#B52326]">
              Your path
            </div>
            <div className="mt-1 text-sm text-[#4f403a]">
              {career.name}
              {shouldShowDegreeInPath && activeDegree
                ? ` → ${degreeShort(activeDegree)}`
                : ""}
              {shouldShowCollegeInPath && selectedCollege
                ? ` → ${selectedCollege.college_name}`
                : ""}
            </div>
          </div>
        )}

        {stage === "career" && (
          <>
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
                Step 1 · Career
              </div>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#2f2320]">
                Which engineering career do you want to explore?
              </h2>
              <p className="mt-2 text-sm text-[#7a635d]">
                Pick a career and walk the path from degree to college to cutoff.
              </p>
            </div>
            <div className="grid gap-3">
              {data.careers.slice(0, 12).map((item, index) => (
                <button
                  key={item.id}
                  className={optionClass(item.id === selectedCareerId)}
                  onClick={() => setSelectedCareerId(item.id)}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e0cdc6] text-xs font-black text-[#7a635d]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-black text-[#2f2320]">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#7a635d]">
                      {item.parent_branch || "Engineering"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={onLearnMore}
                className="rounded-lg border border-[#eaded8] px-4 py-3 text-sm font-bold text-[#4f403a]"
              >
                Learn more
              </button>
              <span className="flex-1" />
              <button
                onClick={() => setStage("degree")}
                className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {stage === "degree" && (
          <>
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
                Step 2 · Degree
              </div>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#2f2320]">
                Which degree leads to a career in {career.name}?
              </h2>
              <p className="mt-2 text-sm text-[#7a635d]">
                Select every degree you think leads there — more than one can be
                right — then reveal the answer.
              </p>
            </div>
            <div className="space-y-3">
              {degreeOptions.map((option) => {
                const isPicked = degreeGuesses.includes(option.label);
                const showCorrect = degreeRevealed && option.correct;
                const showWrong = degreeRevealed && isPicked && !option.correct;
                const showMissed = degreeRevealed && option.correct && !isPicked;
                return (
                  <button
                    key={option.label}
                    disabled={degreeRevealed}
                    onClick={() => toggleDegreeGuess(option.label)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      showCorrect
                        ? "border-[#1f8a5b] bg-[#e8f5ee]"
                        : showWrong
                        ? "border-[#B52326] bg-[#fbeeec]"
                        : isPicked
                        ? "border-[#B52326] bg-[#fbeeec]"
                        : "border-[#e0cdc6] bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                          showCorrect
                            ? "bg-[#1f8a5b] text-white"
                            : showWrong || isPicked
                            ? "bg-[#B52326] text-white"
                            : "bg-[#f5ece8] text-[#7a635d]"
                        }`}
                      >
                        {showCorrect ? "✓" : showWrong ? "✕" : isPicked ? "✓" : "•"}
                      </span>
                      <span className="font-black text-[#2f2320]">{option.label}</span>
                      {showMissed && (
                        <span className="ml-auto text-xs font-bold text-[#1f8a5b]">
                          also correct
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {degreeRevealed && (
              <div
                className={`mt-4 rounded-lg border p-3 text-sm text-[#2f2320] ${
                  degreeAllCorrect
                    ? "border-[#1f8a5b] bg-[#e8f5ee]"
                    : "border-[#B52326] bg-[#fbeeec]"
                }`}
              >
                <div className="font-black">
                  {degreeAllCorrect ? "Correct" : "Not quite"}
                </div>
                <div className="mt-1 text-[#5f514c]">
                  {career.name} is reached through{" "}
                  {careerDegrees.map((label) => degreeShort(label)).join(" or ")}.
                  A B.Sc route does not lead to a JoSAA engineering seat.
                </div>
              </div>
            )}
            <div className="mt-6 flex items-center gap-3">
              <button onClick={back} className="rounded-lg border border-[#eaded8] px-4 py-3 text-sm font-bold text-[#4f403a]">
                Back
              </button>
              <span className="flex-1" />
              {!degreeRevealed ? (
                <button
                  disabled={!degreeGuesses.length}
                  onClick={() => setDegreeRevealed(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white disabled:bg-[#d8aaa3]"
                >
                  Reveal answer <ArrowRight size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  {careerDegrees.length > 1 && (
                    <select
                      value={activeDegree}
                      onChange={(event) => setSelectedDegree(event.target.value)}
                      className="rounded-lg border border-[#d8c8c0] px-3 py-3 text-sm"
                    >
                      {careerDegrees.map((label) => (
                        <option key={label} value={label}>
                          {degreeShort(label)}
                        </option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => setStage("college")} className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white">
                    Choose college <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {stage === "college" && (
          <>
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
                Step 3 · College
              </div>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#2f2320]">
                Choose a college
              </h2>
            </div>

            {/* Current pick, or a prompt to make one */}
            {selectedCollege ? (
              <div className="rounded-xl border-2 border-[#B52326] bg-[#fbeeec] p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#B52326]">
                  Selected college
                </div>
                <div className="mt-1 break-words text-lg font-black text-[#2f2320]">
                  {selectedCollege.college_name}
                </div>
                <div className="mt-0.5 text-xs text-[#7a635d]">
                  {[
                    selectedCollege.college.type,
                    selectedCollege.college.state,
                    selectedCollege.college.nirf_rank
                      ? `NIRF #${selectedCollege.college.nirf_rank}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d8c8c0] bg-white/70 p-4 text-sm text-[#6b5a53]">
                No college chosen yet. Search for one, or tap{" "}
                <span className="font-bold text-[#B52326]">Help me choose</span>.
              </div>
            )}

            {/* Change it: search or guided helper */}
            <div className="mt-4 flex items-center gap-2 rounded-md border border-[#eaded8] bg-[#fdf8f6] px-3 py-2">
              <Search size={16} className="text-[#8a6d63]" />
              <input
                value={collegeSearch}
                onChange={(event) => {
                  setCollegeSearch(event.target.value);
                  if (event.target.value) setShowHelper(false);
                }}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Search to change college"
              />
              <button
                onClick={() => {
                  setShowHelper((value) => !value);
                  setCollegeSearch("");
                }}
                className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-bold ${
                  showHelper
                    ? "border-[#B52326] bg-[#B52326] text-white"
                    : "border-[#B52326] text-[#B52326]"
                }`}
              >
                Help me choose
              </button>
            </div>

            {/* Search results — only while typing */}
            {collegeSearch.trim() && (
              <div className="mt-3 grid max-h-[300px] gap-2 overflow-auto pr-1">
                {searchedColleges.slice(0, 8).map((row) => (
                  <button
                    key={row.id}
                    className={optionClass(row.college_id === selectedCollege?.college_id)}
                    onClick={() => {
                      setSelectedCollegeId(row.college_id);
                      setCollegeSearch("");
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-black text-[#2f2320]">
                        {row.college_name}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#7a635d]">
                        {[row.college.type, row.college.state]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </button>
                ))}
                {!searchedColleges.length && (
                  <EmptyState>No colleges match your search.</EmptyState>
                )}
              </div>
            )}

            {/* Guided helper — pick closes it */}
            {showHelper && (
              <div className="mt-3 rounded-lg border border-[#eaded8] bg-[#fdf8f6] p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-bold text-[#2f2320]">State</span>
                    <select
                      value={prefState}
                      onChange={(event) => setPrefState(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#d8c8c0] px-3 py-2 text-sm"
                    >
                      <option value="">Any state</option>
                      {collegeStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-[#2f2320]">Type</span>
                    <select
                      value={prefType}
                      onChange={(event) => setPrefType(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#d8c8c0] px-3 py-2 text-sm"
                    >
                      <option value="">Any type</option>
                      {collegeTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-[#2f2320]">Rank by</span>
                    <select
                      value={prefPriority}
                      onChange={(event) => setPrefPriority(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#d8c8c0] px-3 py-2 text-sm"
                    >
                      <option value="nirf">NIRF rank</option>
                      <option value="salary">Median salary</option>
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-xs text-[#8a6d63]">
                  NIRF and salary aren&apos;t available for every college; those
                  are listed last.
                </p>
                <div className="mt-3 grid gap-2">
                  {helperResults.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => {
                        setSelectedCollegeId(row.college_id);
                        setShowHelper(false);
                      }}
                      className={optionClass(row.college_id === selectedCollege?.college_id)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-black text-[#2f2320]">
                          {row.college_name}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#7a635d]">
                          {[
                            row.college.type,
                            row.college.state,
                            row.college.nirf_rank
                              ? `NIRF #${row.college.nirf_rank}`
                              : null,
                            prefPriority === "salary" && row.college.median_salary
                              ? `₹${(row.college.median_salary / 100000).toFixed(1)}L median`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </button>
                  ))}
                  {!helperResults.length && (
                    <EmptyState>No colleges match those preferences.</EmptyState>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button onClick={back} className="rounded-lg border border-[#eaded8] px-4 py-3 text-sm font-bold text-[#4f403a]">
                Back
              </button>
              <span className="flex-1" />
              <button
                disabled={!selectedCollege}
                onClick={() => setStage("review")}
                className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white disabled:bg-[#d8aaa3]"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {stage === "review" && selectedCollege && (
          <>
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
                Step 3 · Review
              </div>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#2f2320]">
                Your selected path
              </h2>
            </div>
            <div className="space-y-3">
              <MetricCard label="Career" value={career.name} />
              <MetricCard label="Degree" value={degreeShort(activeDegree)} />
              <MetricCard label="College" value={selectedCollege.college_name} />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={back} className="rounded-lg border border-[#eaded8] px-4 py-3 text-sm font-bold text-[#4f403a]">
                Change college
              </button>
              <span className="flex-1" />
              <button onClick={() => setStage("exam")} className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white">
                Guess the exam <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {stage === "exam" && selectedCollege && (
          <>
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
                Step 4 · Exam
              </div>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#2f2320]">
                Which exam gets you into {selectedCollege.college_name}?
              </h2>
            </div>
            <div className="space-y-3">
              {["JEE Main", "JEE Advanced", "BITSAT", "State CET"].map((exam) => {
                const isCorrect = exam === selectedCollege.exam;
                const isPicked = examGuess === exam;
                const showCorrect = examRevealed && isCorrect;
                const showWrong = examRevealed && isPicked && !isCorrect;
                return (
                  <button
                    key={exam}
                    disabled={examRevealed}
                    onClick={() => setExamGuess(exam)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      showCorrect
                        ? "border-[#1f8a5b] bg-[#e8f5ee]"
                        : showWrong
                        ? "border-[#B52326] bg-[#fbeeec]"
                        : isPicked
                        ? "border-[#B52326] bg-[#fbeeec]"
                        : "border-[#e0cdc6] bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                          showCorrect
                            ? "bg-[#1f8a5b] text-white"
                            : showWrong || isPicked
                            ? "bg-[#B52326] text-white"
                            : "bg-[#f5ece8] text-[#7a635d]"
                        }`}
                      >
                        {showCorrect ? "✓" : showWrong ? "✕" : "•"}
                      </span>
                      <span className="font-black text-[#2f2320]">{exam}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {examRevealed && (
              <div
                className={`mt-4 rounded-lg border p-3 text-sm ${
                  examGuess === selectedCollege.exam
                    ? "border-[#1f8a5b] bg-[#e8f5ee] text-[#2f2320]"
                    : "border-[#B52326] bg-[#fbeeec] text-[#2f2320]"
                }`}
              >
                <div className="font-black">
                  {examGuess === selectedCollege.exam
                    ? `Correct — ${selectedCollege.exam}`
                    : `It's ${selectedCollege.exam}`}
                </div>
                <div className="mt-1 text-[#5f514c]">
                  JoSAA fills seats here using your {selectedCollege.exam} rank.
                  BITSAT and state CET counselling are run separately and don't
                  apply to this seat.
                </div>
              </div>
            )}
            <div className="mt-6 flex items-center gap-3">
              <button onClick={back} className="rounded-lg border border-[#eaded8] px-4 py-3 text-sm font-bold text-[#4f403a]">
                Back
              </button>
              <span className="flex-1" />
              {!examRevealed ? (
                <button
                  disabled={!examGuess}
                  onClick={() => setExamRevealed(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white disabled:bg-[#d8aaa3]"
                >
                  Reveal answer <ArrowRight size={16} />
                </button>
              ) : (
                <button onClick={() => setStage("rank")} className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white">
                  Guess cutoff <ArrowRight size={16} />
                </button>
              )}
            </div>
          </>
        )}

        {stage === "rank" && selectedCollege && (
          <>
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
                Step 5 · Cutoff guess
              </div>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#2f2320]">
                What rank gets you into {selectedCollege.college_name}?
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <label className="block">
                <span className="text-sm font-bold text-[#2f2320]">Category</span>
                <select className="mt-2 w-full rounded-lg border border-[#d8c8c0] px-3 py-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
                  {CATEGORY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-[#2f2320]">Gender pool</span>
                <select className="mt-2 w-full rounded-lg border border-[#d8c8c0] px-3 py-3 text-sm" value={gender} onChange={(event) => setGender(event.target.value)}>
                  {GENDER_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-[#2f2320]">Home state?</span>
                <select
                  className="mt-2 w-full rounded-lg border border-[#d8c8c0] px-3 py-3 text-sm disabled:bg-[#f5ece8]"
                  value={quota}
                  disabled={quotaOptions.length <= 1}
                  onChange={(event) => setQuota(event.target.value)}
                >
                  {quotaOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-[#2f2320]">Your guess</span>
                <input className="mt-2 w-full rounded-lg border border-[#d8c8c0] px-3 py-3 text-sm" type="number" min="1" value={rankGuess} onChange={(event) => setRankGuess(event.target.value)} placeholder="e.g. 5000" />
              </label>
            </div>
            {quotaOptions.length > 1 && (
              <p className="mt-3 text-xs text-[#8a6d63]">
                This college has separate home-state and other-state cutoffs, so
                where you live changes the rank you need.
              </p>
            )}
            <div className="mt-6 flex items-center gap-3">
              <button onClick={back} className="rounded-lg border border-[#eaded8] px-4 py-3 text-sm font-bold text-[#4f403a]">
                Back
              </button>
              <span className="flex-1" />
              <button disabled={!rankGuess || !actualCutoff} onClick={() => setStage("reveal")} className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white disabled:bg-[#d8aaa3]">
                Reveal actual cutoff <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {stage === "reveal" && actualCutoff && selectedCollege && (
          <>
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
                Reality check
              </div>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#2f2320]">
                {career.name} at {selectedCollege.college_name}
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[#eaded8] bg-[#fdf8f6] p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-[#7a635d]">Actual closing rank</div>
                <div className="mt-1 text-3xl font-black text-[#B52326]">{actualCutoff.closing_rank?.toLocaleString("en-IN")}</div>
              </div>
              <div className="rounded-xl border border-[#eaded8] bg-[#fdf8f6] p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-[#7a635d]">Your guess</div>
                <div className="mt-1 text-3xl font-black text-[#2f2320]">{Number(rankGuess).toLocaleString("en-IN")}</div>
              </div>
            </div>
            {resultText && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#eaded8] bg-white p-4 text-sm font-semibold text-[#2f2320]">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#1f8a5b]" />
                <span>{resultText}</span>
              </div>
            )}
            <div className="mt-4 rounded-lg border border-[#eaded8] bg-white p-4 text-sm text-[#5f514c]">
              {category} · {gender} ·{" "}
              {QUOTA_OPTIONS.find((q) => q.value === actualCutoff.quota)?.label ||
                actualCutoff.quota}{" "}
              · {selectedCollege.exam} · JoSAA {actualCutoff.year} Round{" "}
              {actualCutoff.round}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={back} className="rounded-lg border border-[#eaded8] px-4 py-3 text-sm font-bold text-[#4f403a]">
                Back
              </button>
              <span className="flex-1" />
              <button onClick={() => setStage("final")} className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white">
                See full path <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {stage === "final" && selectedCollege && (
          <>
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
                Path complete
              </div>
              <h2 className="mt-1 text-3xl font-black leading-tight text-[#2f2320]">
                Your path into {career.name}
              </h2>
            </div>
            <ol className="relative ml-2 border-l-2 border-[#eaded8]">
              {[
                { label: "Degree", value: degreeShort(activeDegree) },
                { label: "College", value: selectedCollege.college_name },
                { label: "Entrance exam", value: selectedCollege.exam },
                {
                  label: "Closing rank",
                  value: actualCutoff?.closing_rank?.toLocaleString("en-IN"),
                },
              ]
                .filter((step) => step.value)
                .map((step) => (
                  <li key={step.label} className="relative mb-5 pl-6 last:mb-0">
                    <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#B52326]" />
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#8a6d63]">
                      {step.label}
                    </div>
                    <div className="mt-0.5 break-words text-base font-bold text-[#2f2320]">
                      {step.value}
                    </div>
                  </li>
                ))}
            </ol>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={restart} className="rounded-lg border border-[#eaded8] px-4 py-3 text-sm font-bold text-[#4f403a]">
                Start again
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

const useLookups = (data) =>
  useMemo(() => {
    if (!data) {
      return {
        careersById: {},
        branchesById: {},
        collegesById: {},
        careerBranchesByCareer: {},
        cutoffsByBranch: {},
      };
    }
    return {
      careersById: Object.fromEntries(data.careers.map((item) => [item.id, item])),
      branchesById: Object.fromEntries(data.branches.map((item) => [item.id, item])),
      collegesById: Object.fromEntries(data.colleges.map((item) => [item.id, item])),
      careerBranchesByCareer: data.career_branch.reduce((acc, item) => {
        acc[item.career_id] ||= [];
        acc[item.career_id].push(item);
        acc[item.career_id].sort((a, b) => b.relevance_weight - a.relevance_weight);
        return acc;
      }, {}),
      cutoffsByBranch: data.cutoffs.reduce((acc, item) => {
        acc[item.branch_id] ||= [];
        acc[item.branch_id].push(item);
        return acc;
      }, {}),
    };
  }, [data]);

export default function FuturesV2Page() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("careers");
  const [search, setSearch] = useState("");
  const [selectedCareerId, setSelectedCareerId] = useState("");
  const [selectedCollegeId, setSelectedCollegeId] = useState("");

  useEffect(() => {
    fetch("/data/futures-v2/demo-data.json")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load Futures right now.");
        return response.json();
      })
      .then((payload) => {
        setData(payload);
        setSelectedCareerId(payload.careers[0]?.id || "");
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const lookups = useLookups(data);
  const filteredCareers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.careers;
    return data.careers.filter((career) =>
      [career.name, career.parent_branch, career.entry_exams.join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, search]);

  const selectedCareer =
    lookups.careersById[selectedCareerId] || filteredCareers[0] || null;
  const selectedCareerBranches = selectedCareer
    ? (lookups.careerBranchesByCareer[selectedCareer.id] || [])
        .map((link) => lookups.branchesById[link.branch_id])
        .filter(Boolean)
    : [];
  const selectedCareerColleges = selectedCareerBranches.flatMap((branch) =>
    selectBestCutoffs(lookups.cutoffsByBranch[branch.id] || [], 3)
  );
  const selectedCareerTopColleges = uniqueBy(
    selectedCareerColleges.sort(byRank),
    (cutoff) => cutoff.college_id
  ).slice(0, 8);

  useEffect(() => {
    if (selectedCareer && selectedCareer.id !== selectedCareerId) {
      setSelectedCareerId(selectedCareer.id);
    }
  }, [selectedCareer, selectedCareerId]);

  return (
    <>
      <Head>
        <title>Futures V2 Demo | Avanti Fellows</title>
      </Head>
      <main className="min-h-screen overflow-x-hidden bg-[#fdf8f6]">
        <section className="border-b border-[#eaded8] bg-white">
          <div className="mx-auto w-full max-w-7xl px-4 py-7 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="break-words text-3xl font-black uppercase tracking-wide text-[#B52326] md:text-5xl">
                  Futures v2 demo
                </h1>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab("careers")}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  activeTab === "careers"
                    ? "bg-[#B52326] text-white"
                    : "bg-[#f5ece8] text-[#4f403a]"
                }`}
              >
                Career information
              </button>
              <button
                onClick={() => setActiveTab("quiz")}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  activeTab === "quiz"
                    ? "bg-[#B52326] text-white"
                    : "bg-[#f5ece8] text-[#4f403a]"
                }`}
              >
                Career quiz
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
          {error && <EmptyState>{error}</EmptyState>}
          {!data && !error && <EmptyState>Loading Futures...</EmptyState>}

          {data && activeTab === "careers" && selectedCareer && (
            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-8">
              <CareerList
                careers={filteredCareers}
                selectedCareerId={selectedCareer.id}
                onSelect={setSelectedCareerId}
                search={search}
                setSearch={setSearch}
              />
              <div className="min-w-0 space-y-5">
                <MobileCareerPicker
                  careers={data.careers}
                  selectedCareerId={selectedCareer.id}
                  onSelect={setSelectedCareerId}
                />
                <CareerDetail
                  career={selectedCareer}
                  branches={selectedCareerBranches}
                  colleges={selectedCareerTopColleges}
                />
              </div>
            </div>
          )}

          {data && activeTab === "quiz" && (
            <QuizPanel
              data={data}
              selectedCareerId={selectedCareerId}
              setSelectedCareerId={setSelectedCareerId}
              selectedCollegeId={selectedCollegeId}
              setSelectedCollegeId={setSelectedCollegeId}
              onLearnMore={() => setActiveTab("careers")}
            />
          )}
        </section>
      </main>
    </>
  );
}

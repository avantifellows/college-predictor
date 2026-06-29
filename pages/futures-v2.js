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

const getCutoffForFilters = (cutoffs, category, gender) => {
  const exact = cutoffs
    .filter((row) => row.seat_type === category && row.gender_pool === gender)
    .sort(byRank);
  if (exact.length) return exact[0];

  const categoryOnly = cutoffs
    .filter((row) => row.seat_type === category)
    .sort(byRank);
  if (categoryOnly.length) return categoryOnly[0];

  return cutoffs.slice().sort(byRank)[0] || null;
};

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
  selectedBranchId,
  setSelectedBranchId,
  selectedCollegeId,
  setSelectedCollegeId,
  onLearnMore,
}) => {
  const [stage, setStage] = useState("career");
  const [category, setCategory] = useState("OPEN");
  const [gender, setGender] = useState("Gender-Neutral");
  const [rankGuess, setRankGuess] = useState("");
  const [examGuess, setExamGuess] = useState("");
  const [examRevealed, setExamRevealed] = useState(false);
  const cardRef = useRef(null);
  const didMountRef = useRef(false);

  const lookups = useLookups(data);
  const career = lookups.careersById[selectedCareerId];
  const branchLinks = lookups.careerBranchesByCareer[selectedCareerId] || [];
  const branches = branchLinks
    .map((link) => lookups.branchesById[link.branch_id])
    .filter(Boolean);
  const selectedBranch = lookups.branchesById[selectedBranchId] || branches[0];
  const branchCutoffs = selectedBranch
    ? lookups.cutoffsByBranch[selectedBranch.id] || []
    : [];
  const collegeOptions = selectBestCutoffs(branchCutoffs, 12);
  const selectedCollege =
    collegeOptions.find((cutoff) => cutoff.college_id === selectedCollegeId) ||
    collegeOptions[0] ||
    null;
  const selectedCollegeCutoffs = selectedCollege
    ? branchCutoffs.filter(
        (cutoff) =>
          cutoff.college_id === selectedCollege.college_id &&
          cutoff.rank_space === selectedCollege.rank_space
      )
    : [];
  const actualCutoff = getCutoffForFilters(
    selectedCollegeCutoffs,
    category,
    gender
  );
  const numericGuess = Number(rankGuess);
  const resultText =
    stage === "reveal" && actualCutoff && rankGuess
      ? numericGuess <= actualCutoff.closing_rank
        ? "Your guessed rank is inside this cutoff."
        : "Your guessed rank is above this cutoff."
      : null;
  const stages = ["Career", "Branch", "College", "Exam", "Rank", "Path"];
  const stageIndex = {
    career: 0,
    branch: 1,
    college: 2,
    review: 2,
    exam: 3,
    rank: 4,
    reveal: 4,
    final: 5,
  }[stage];
  const shouldShowBranchInPath = stageIndex >= 1;
  const shouldShowCollegeInPath = stageIndex >= 2;

  useEffect(() => {
    if (!branches.find((branch) => branch.id === selectedBranchId)) {
      setSelectedBranchId(branches[0]?.id || "");
    }
  }, [branches, selectedBranchId, setSelectedBranchId]);

  useEffect(() => {
    if (!collegeOptions.find((cutoff) => cutoff.college_id === selectedCollegeId)) {
      setSelectedCollegeId(collegeOptions[0]?.college_id || "");
    }
  }, [collegeOptions, selectedCollegeId, setSelectedCollegeId]);

  useEffect(() => {
    setRankGuess("");
    if (stage !== "career") setStage("branch");
  }, [selectedCareerId]);

  useEffect(() => {
    if (stage === "reveal") setStage("rank");
    setExamGuess("");
    setExamRevealed(false);
  }, [selectedBranchId, selectedCollegeId, category, gender]);

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

  const optionClass = (isSelected) =>
    `flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
      isSelected
        ? "border-[#B52326] bg-[#fbeeec] text-[#2f2320]"
        : "border-[#e0cdc6] bg-white hover:border-[#B52326] hover:bg-[#fbeeec]"
    }`;

  const back = () => {
    const next = {
      branch: "career",
      college: "branch",
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
    setCategory("OPEN");
    setGender("Gender-Neutral");
  };

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
              {shouldShowBranchInPath && selectedBranch
                ? ` -> ${selectedBranch.name}`
                : ""}
              {shouldShowCollegeInPath && selectedCollege
                ? ` -> ${selectedCollege.college_name}`
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
                Pick a career and explore possible branch paths and JoSAA colleges.
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
                onClick={() => setStage("branch")}
                className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {stage === "branch" && (
          <>
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
                Step 2 · Branch
              </div>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#2f2320]">
                Which branch path should lead to {career.name}?
              </h2>
            </div>
            <div className="grid gap-3">
              {branches.slice(0, 8).map((branch, index) => (
                <button
                  key={branch.id}
                  className={optionClass(branch.id === selectedBranch?.id)}
                  onClick={() => setSelectedBranchId(branch.id)}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e0cdc6] text-xs font-black text-[#7a635d]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-black text-[#2f2320]">
                      {branch.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#7a635d]">
                      {degreeShort(branch.degree_label)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={back} className="rounded-lg border border-[#eaded8] px-4 py-3 text-sm font-bold text-[#4f403a]">
                Back
              </button>
              <span className="flex-1" />
              <button onClick={() => setStage("college")} className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white">
                Choose colleges <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {stage === "college" && (
          <>
            <div className="mb-5">
              <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
                Step 3 · Colleges
              </div>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#2f2320]">
                Pick a college
              </h2>
              <p className="mt-2 text-sm text-[#7a635d]">
                These colleges offer this branch through JoSAA.
              </p>
            </div>
            <div className="grid gap-3">
              {collegeOptions.slice(0, 8).map((cutoff, index) => (
                <button
                  key={cutoff.id}
                  className={optionClass(cutoff.college_id === selectedCollege?.college_id)}
                  onClick={() => setSelectedCollegeId(cutoff.college_id)}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e0cdc6] text-xs font-black text-[#7a635d]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-black text-[#2f2320]">
                      {cutoff.college_name}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={back} className="rounded-lg border border-[#eaded8] px-4 py-3 text-sm font-bold text-[#4f403a]">
                Back
              </button>
              <span className="flex-1" />
              <button onClick={() => setStage("review")} className="inline-flex items-center gap-2 rounded-lg bg-[#B52326] px-5 py-3 text-sm font-bold text-white">
                Review path <ArrowRight size={16} />
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
              <MetricCard
                label="Branch"
                value={
                  selectedBranch
                    ? `${selectedBranch.name}${
                        degreeShort(selectedBranch.degree_label)
                          ? ` · ${degreeShort(selectedBranch.degree_label)}`
                          : ""
                      }`
                    : ""
                }
              />
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
            <div className="grid gap-4 md:grid-cols-3">
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
                <span className="text-sm font-bold text-[#2f2320]">Your guess</span>
                <input className="mt-2 w-full rounded-lg border border-[#d8c8c0] px-3 py-3 text-sm" type="number" min="1" value={rankGuess} onChange={(event) => setRankGuess(event.target.value)} placeholder="e.g. 5000" />
              </label>
            </div>
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
              {category} · {gender} · {selectedCollege.exam} · JoSAA {actualCutoff.year} Round {actualCutoff.round}
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
                How to become a {career.name}
              </h2>
            </div>
            <ol className="relative ml-2 border-l-2 border-[#eaded8]">
              {[
                {
                  label: "Branch",
                  value: `${degreeShort(selectedBranch?.degree_label) || ""}${
                    selectedBranch?.degree_label && selectedBranch?.name ? " · " : ""
                  }${selectedBranch?.name || ""}`,
                },
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
  const [selectedBranchId, setSelectedBranchId] = useState("");
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
              selectedBranchId={selectedBranchId}
              setSelectedBranchId={setSelectedBranchId}
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

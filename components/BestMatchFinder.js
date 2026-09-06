import React, { useEffect, useMemo, useState } from "react";
import {
  BRANCH_GROUPS,
  getAvailableStates,
  findBestMatches,
  scoreMatches,
} from "../utils/bestMatchFinder";
import { cardClass, inputClass, primaryBtn, secondaryBtn } from "./mockAllotmentTheme";
import { MatchStats } from "./InstituteRankedList";

// A standalone discovery search, separate from the round-by-round mock —
// three questions (branches, location, fees), then a scored results screen.
// Doesn't need a locked/simulated run at all, just a valid profile + catalog.
// Lives on its own page (pages/mock-allotment/best-match.js), same as My
// Choices / Rounds History, rather than a popup — a real URL + a proper
// full page, not a floating card fighting for space against everything else.
const QUESTION_STEPS = [
  { key: "branches", label: "Branches" },
  { key: "location", label: "Location" },
  { key: "fees", label: "Fees" },
];
// Just these two — a "By Closing Rank / NIRF / CTC / Fees" set of tabs used
// to sit alongside these, but every one of those numbers is already shown
// inline on each result in Best Overall and Best Per Branch, so they were a
// duplicate view of the same data, just re-sorted.
const RESULTS_TABS = [
  { key: "overall", label: "Best Overall" },
  { key: "perBranch", label: "Best Per Branch" },
];

// Answers are saved per mock-allotment session (cleared together with the
// rest of it — see MockAllotment.js's restart()) so returning to this page
// doesn't throw the student back to question 1 every time; results reopen
// straight away, with "Edit answers" to change them.
export const BEST_MATCH_STORAGE_KEY = "josaaBestMatchAnswers_v1";

function loadSavedAnswers() {
  try {
    const raw = window.localStorage.getItem(BEST_MATCH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      selectedBranches: new Set(parsed.selectedBranches || []),
      locationMode: parsed.locationMode || "all",
      selectedStates: new Set(parsed.selectedStates || []),
      feeWaiverAnswer: parsed.feeWaiverAnswer || "unsure",
      feeBudget: parsed.feeBudget ?? "",
    };
  } catch {
    return null;
  }
}

// Same numbered-circle-with-label shape as the main mock's own StepBar
// (see MockAllotment.js) — one stepper look across the whole feature,
// instead of a second, icon-based style just for this popup-turned-page.
const StepDots = ({ steps, currentIndex }) => (
  <div className="mt-3 flex items-start">
    {steps.map((s, i) => (
      <React.Fragment key={s.key}>
        <div className="flex w-20 shrink-0 flex-col items-center gap-1">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
              i === currentIndex
                ? "bg-[#b52326] text-white"
                : i < currentIndex
                  ? "border-2 border-[#b52326] bg-white text-[#b52326]"
                  : "border border-[#d8c7c1] text-[#5b4a45]"
            }`}
          >
            {i + 1}
          </span>
          <span
            className={`text-center text-xs font-semibold ${
              i === currentIndex ? "text-[#b52326]" : "text-[#5b4a45]"
            }`}
          >
            {s.label}
          </span>
        </div>
        {i < steps.length - 1 && (
          <span
            className={`mt-3 h-0.5 flex-1 rounded ${i < currentIndex ? "bg-[#b52326]" : "bg-[#e4d8d2]"}`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// A checkbox/radio row that visibly highlights when selected — a plain
// border doesn't read as "chosen" at a glance the way a filled background
// does, especially across a whole grid of these.
const OptionRow = ({ checked, onChange, type = "checkbox", name, children }) => (
  <label
    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
      checked
        ? "border-[#b52326] bg-[#fdf3f1] text-[#3a2c28]"
        : "border-[#d8c7c1] text-[#3a2c28] hover:bg-[#f8efec]"
    }`}
  >
    <input type={type} name={name} checked={checked} onChange={onChange} />
    {children}
  </label>
);

// A small "i" button that reveals an explanation on click — used to keep
// the scoring methodology available without a permanent paragraph of text
// sitting on screen the whole time.
const InfoTooltip = ({ text }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="How matches are ranked"
        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold transition ${
          open
            ? "border-[#b52326] bg-[#b52326] text-white"
            : "border-[#d8c7c1] text-[#5b4a45] hover:bg-[#f8efec]"
        }`}
      >
        i
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-10 w-72 rounded-lg border border-[#d8c7c1] bg-white p-3 text-xs leading-relaxed text-[#3a2c28] shadow-lg">
          {text}
        </div>
      )}
    </span>
  );
};

const BestMatchFinder = ({ catalog, seatIndex, collegesByName, profile }) => {
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0); // index into QUESTION_STEPS, or "results"
  const [selectedBranches, setSelectedBranches] = useState(new Set());
  const [locationMode, setLocationMode] = useState("all"); // "all" | "custom"
  const [selectedStates, setSelectedStates] = useState(new Set());
  const [feeWaiverAnswer, setFeeWaiverAnswer] = useState("unsure");
  const [feeBudget, setFeeBudget] = useState("");
  const [resultsTab, setResultsTab] = useState("overall");

  // Reopen straight into results if this session already answered once.
  useEffect(() => {
    const saved = loadSavedAnswers();
    if (saved) {
      setSelectedBranches(saved.selectedBranches);
      setLocationMode(saved.locationMode);
      setSelectedStates(saved.selectedStates);
      setFeeWaiverAnswer(saved.feeWaiverAnswer);
      setFeeBudget(saved.feeBudget);
      setStep("results");
    }
    setHydrated(true);
  }, []);

  const availableStates = useMemo(
    () => getAvailableStates(catalog, collegesByName),
    [catalog, collegesByName]
  );

  const budget =
    feeBudget !== "" && Number.isFinite(Number(feeBudget)) && Number(feeBudget) > 0
      ? Number(feeBudget)
      : null;
  const stateFilter = locationMode === "all" ? "all" : selectedStates;
  const showingResults = step === "results";

  const matches = useMemo(() => {
    if (!showingResults) return [];
    const raw = findBestMatches({
      catalog,
      seatIndex,
      collegesByName,
      profile,
      branchGroupKeys: selectedBranches,
      stateFilter,
      feeWaiverAnswer,
      feeBudget: budget,
    });
    return scoreMatches(raw);
  }, [
    showingResults,
    catalog,
    seatIndex,
    collegesByName,
    profile,
    selectedBranches,
    stateFilter,
    feeWaiverAnswer,
    budget,
  ]);

  const toggleInSet = (setter) => (value) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  const toggleBranch = toggleInSet(setSelectedBranches);
  const toggleState = toggleInSet(setSelectedStates);

  const canProceed =
    step === 0
      ? selectedBranches.size > 0
      : step === 1
        ? locationMode === "all" || selectedStates.size > 0
        : true; // fees step has no required answer

  const saveAnswers = () => {
    try {
      window.localStorage.setItem(
        BEST_MATCH_STORAGE_KEY,
        JSON.stringify({
          selectedBranches: [...selectedBranches],
          locationMode,
          selectedStates: [...selectedStates],
          feeWaiverAnswer,
          feeBudget,
        })
      );
    } catch {
      // best-effort — a save failure just means answers won't be
      // remembered next visit, nothing worth surfacing to the student.
    }
  };

  const goNext = () => {
    if (step === QUESTION_STEPS.length - 1) {
      saveAnswers();
      setStep("results");
    } else {
      setStep((s) => s + 1);
    }
  };
  const goBack = () => {
    if (showingResults) setStep(QUESTION_STEPS.length - 1);
    else setStep((s) => Math.max(0, s - 1));
  };

  if (!hydrated) return null;

  return (
    <div>
      {!showingResults && (
        <p className="mt-1 text-sm text-[#5b4a45]">
          Step {step + 1} of {QUESTION_STEPS.length}
        </p>
      )}

      {!showingResults && <StepDots steps={QUESTION_STEPS} currentIndex={step} />}

      {!showingResults && step === 0 && (
        <div className="mt-4">
          <h3 className="text-base font-bold text-[#3a2c28]">
            Which branches would you like to take?
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BRANCH_GROUPS.map((g) => (
              <OptionRow
                key={g.key}
                checked={selectedBranches.has(g.key)}
                onChange={() => toggleBranch(g.key)}
              >
                {g.label}
              </OptionRow>
            ))}
          </div>
        </div>
      )}

      {!showingResults && step === 1 && (
        <div className="mt-4">
          <h3 className="text-base font-bold text-[#3a2c28]">
            Which location are you okay with?
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <OptionRow
              type="radio"
              name="locationMode"
              checked={locationMode === "all"}
              onChange={() => setLocationMode("all")}
            >
              All States
            </OptionRow>
            <OptionRow
              type="radio"
              name="locationMode"
              checked={locationMode === "custom"}
              onChange={() => setLocationMode("custom")}
            >
              Choose specific states
            </OptionRow>
          </div>

          {locationMode === "custom" && (
            <div className="mt-3">
              {profile.homeState && (
                <button
                  type="button"
                  className={`${secondaryBtn} mb-2`}
                  onClick={() => setSelectedStates(new Set([profile.homeState]))}
                >
                  Just my home state ({profile.homeState})
                </button>
              )}
              <div className="grid max-h-64 gap-1.5 overflow-y-auto rounded-lg border border-[#f0e6e1] p-2 sm:grid-cols-2 lg:grid-cols-3">
                {availableStates.map((s) => (
                  <OptionRow
                    key={s}
                    checked={selectedStates.has(s)}
                    onChange={() => toggleState(s)}
                  >
                    {s}
                  </OptionRow>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!showingResults && step === 2 && (
        <div className="mt-4">
          <h3 className="text-base font-bold text-[#3a2c28]">What about fees?</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#5b4a45]">
                Eligible for a fee waiver?
              </span>
              <select
                className={inputClass}
                value={feeWaiverAnswer}
                onChange={(e) => setFeeWaiverAnswer(e.target.value)}
              >
                <option value="unsure">Not sure — go by my category</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#5b4a45]">
                Maximum annual fees you can pay (₹, optional)
              </span>
              <input
                type="number"
                min="0"
                className={inputClass}
                placeholder="Leave blank for no limit"
                value={feeBudget}
                onChange={(e) => setFeeBudget(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      {showingResults && (
        <ResultsScreen
          matches={matches}
          resultsTab={resultsTab}
          setResultsTab={setResultsTab}
        />
      )}

      <div className="mt-6 flex flex-wrap justify-between gap-2">
        {!showingResults && step > 0 ? (
          <button type="button" className={secondaryBtn} onClick={goBack}>
            ← Back
          </button>
        ) : showingResults ? (
          <button type="button" className={secondaryBtn} onClick={goBack}>
            ← Edit answers
          </button>
        ) : (
          <span />
        )}
        {!showingResults && (
          <button
            type="button"
            className={primaryBtn}
            disabled={!canProceed}
            onClick={goNext}
          >
            {step === QUESTION_STEPS.length - 1 ? "See Results →" : "Next →"}
          </button>
        )}
      </div>
    </div>
  );
};

const SCORE_EXPLAINER =
  "Ranked by a weighted score — 50% closing rank, 25% NIRF, 25% median CTC — not a plain average, since closing rank is the one field every institute has and the one real market signal (thousands of students' own choices), while NIRF/CTC are secondary checks with patchier coverage. Missing NIRF or CTC doesn't penalize an institute — its weight shifts to whichever of the three it does have.";

const ResultsScreen = ({ matches, resultsTab, setResultsTab }) => (
  <div>
    <div className="flex flex-wrap items-center gap-1">
      {RESULTS_TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setResultsTab(t.key)}
          className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
            resultsTab === t.key
              ? "bg-[#b52326] text-white"
              : "border border-[#d8c7c1] text-[#5b4a45] hover:bg-[#f8efec]"
          }`}
        >
          {t.label}
        </button>
      ))}
      {matches.length > 0 && <InfoTooltip text={SCORE_EXPLAINER} />}
    </div>

    {matches.length === 0 && (
      <p className="mt-3 text-base text-[#5b4a45]">
        No reachable institute matches your filters. Try widening your
        branches, location, or fee budget.
      </p>
    )}

    {matches.length > 0 && resultsTab === "overall" && (
      <BestOverallSection matches={matches} />
    )}

    {matches.length > 0 && resultsTab === "perBranch" && (
      <BestPerBranchSection matches={matches} />
    )}
  </div>
);

// One match, everywhere it appears: institute name (with its rank badge)
// first, program right under it — not sharing a line with the institute,
// where it used to get squeezed to one side — then the same colored stat
// chips (MatchStats) the Mock Allotment's own missed-options panel uses,
// so the two features never look like they belong to different apps.
const MatchCard = ({ match, rank }) => (
  <div>
    <p className="font-bold text-[#3a2c28]">
      {rank && <span className="mr-1.5 text-[#b52326]">#{rank}</span>}
      {match.institute}
    </p>
    <p className="text-sm font-medium text-[#5b4a45]">{match.program}</p>
    <MatchStats item={match} />
  </div>
);

// Top 3 by composite score (closing rank + NIRF + median CTC, see
// utils/bestMatchFinder.js's scoreMatches), irrespective of branch.
const BestOverallSection = ({ matches }) => {
  const top3 = [...matches].sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  return (
    <div className="mt-3 space-y-3">
      {top3.map((m, i) => (
        <div key={`${m.institute}|${m.program}`} className={cardClass}>
          <MatchCard match={m} rank={i + 1} />
        </div>
      ))}
    </div>
  );
};

// Top 3 by composite score WITHIN each branch family that has at least one
// match — one section per branch, so "best per branch" actually means per
// branch rather than a single global top-3 that happens to skew toward
// whichever branch has the loosest cutoffs. Each branch gets a solid header
// band (not just bold text) so it reads unmistakably as a section divider,
// not another institute row.
const BestPerBranchSection = ({ matches }) => {
  const groups = BRANCH_GROUPS.map((g) => ({
    group: g,
    items: matches
      .filter((m) => m.branchGroup === g.key)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3),
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <p className="mt-3 text-base text-[#5b4a45]">
        No reachable options match your filters.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {groups.map(({ group, items }) => (
        <div key={group.key} className="overflow-hidden rounded-xl border border-[#d8c7c1]">
          <p className="bg-[#3a2c28] px-3 py-1.5 text-sm font-bold text-white">
            {group.label}
          </p>
          <div className="divide-y divide-[#f0e6e1] bg-white">
            {items.map((m, i) => (
              <div key={`${m.institute}|${m.program}`} className="px-3 py-2.5">
                <MatchCard match={m} rank={i + 1} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BestMatchFinder;

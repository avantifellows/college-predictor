import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, CheckCircle2 } from "lucide-react";
import { josaaConfig, statesList } from "../examConfig";
import {
  loadAllRoundsData,
  loadCollegesData,
  buildSeatIndex,
  buildCatalog,
  getRoundOneResult,
  advanceRound,
  annualFeeForCategory,
  TOTAL_ROUNDS,
} from "../utils/josaaSimulator";
import Dropdown from "./dropdown";
import {
  formatRank,
  cardClass,
  inputClass,
  primaryBtn,
  secondaryBtn,
} from "./mockAllotmentTheme";
import {
  optionValue,
  optionLabel,
  toOptions,
  Field,
  rankInputClass,
  LoadingCard,
  StepBar,
  ReorderableChoiceList,
} from "./mockAllotmentShared";
import { MatchStats } from "./InstituteRankedList";
import ListAnalyzer from "./ListAnalyzer";

// Practice JoSAA choice-filling + locking + a round-by-round freeze/float mock,
// built entirely on data already in this repo (see docs/SIMULATION_DATA.md).
// No backend: everything lives in component state + localStorage, mirroring
// how the rest of this app has no database either.
//
// This used to be the entire components/MockAllotment.js. It moved here
// unchanged (aside from importing the exam-agnostic stepper/reorder/loading
// pieces from ./mockAllotmentShared instead of defining them locally) when
// components/MockAllotment.js became the JoSAA/MHT-CET exam chooser — see
// components/MhtcetMockAllotment.js for the sibling flow.

// v2: replaced the precomputed 6-round trace (roundPointer into it) with an
// interactive trail, so freeze/float/slide can each change what's checked
// next round instead of all 6 rounds being decided upfront.
export const STORAGE_KEY = "josaaMockAllotmentState_v2";

const categoryField = josaaConfig.fields.find((f) => f.name === "category");
const genderField = josaaConfig.fields.find((f) => f.name === "gender");
const qualifiedField = josaaConfig.fields.find(
  (f) => f.name === "qualifiedJeeAdv"
);

// A reminder of who this run is — category, gender, home state, rank —
// shown the same way everywhere in Mock Allotment: the Simulation results,
// and (since none of My Choices / Rounds History / Find Your Best Match /
// Analyse Your List have the Student Info tab available either) each of
// their standalone pages too. Exported so those pages can import it
// straight from here instead of re-deriving the category label lookup.
export const ProfileChips = ({ profile }) => {
  const rows = [
    [
      "Category",
      optionLabel(
        categoryField.options.find((o) => optionValue(o) === profile.category)
      ) || profile.category,
    ],
    ["Seat pool", profile.gender],
    ["Home state", profile.homeState],
    ["JEE Main rank", formatRank(profile.mainRank)],
    profile.qualifiedJeeAdv === "Yes"
      ? ["JEE Advanced rank", formatRank(profile.advRank)]
      : null,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-[#eaded8] bg-white px-4 py-3">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#8a6d63]">
              {label}
            </dt>
            <dd className="mt-0.5 truncate text-sm font-bold text-[#2f2320]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const defaultProfile = {
  category: "",
  gender: "",
  homeState: "",
  mainRank: "",
  qualifiedJeeAdv: "No",
  advRank: "",
};

const defaultState = {
  step: "info",
  profile: defaultProfile,
  choices: [],
  locked: false,
  trail: [], // [{round, provisional, mode}], built up as rounds are revealed
  frozen: false,
};

export function loadPersistedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      profile: { ...defaultProfile, ...parsed.profile },
    };
  } catch {
    return defaultState;
  }
}

const matchesProgramType = (programName, type) => {
  const lower = (programName || "").toLowerCase();
  if (type === "architecture") return lower.includes("architecture");
  if (type === "planning") return lower.includes("planning");
  if (type === "engineering") {
    return !lower.includes("architecture") && !lower.includes("planning");
  }
  return true; // "all"
};

const JosaaMockAllotment = ({ onChangeExam }) => {
  const [state, setState] = useState(defaultState);
  const [hydrated, setHydrated] = useState(false);

  const [rows, setRows] = useState(null);
  const [collegesByName, setCollegesByName] = useState(null);
  const [dataError, setDataError] = useState("");
  const [dataLoading, setDataLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [programType, setProgramType] = useState("all");

  // Load any in-progress mock from localStorage once, on mount.
  useEffect(() => {
    setState(loadPersistedState());
    setHydrated(true);
  }, []);

  // Persist after every change, once hydrated (so we don't overwrite a saved
  // session with the defaults during the very first render).
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  // Load the JoSAA round data + college enrichment once the student needs it.
  useEffect(() => {
    if (state.step === "info" || rows || dataLoading) return;
    setDataLoading(true);
    setDataError("");
    Promise.all([loadAllRoundsData(), loadCollegesData()])
      .then(([rowsData, colleges]) => {
        setRows(rowsData);
        setCollegesByName(colleges);
      })
      .catch((err) => setDataError(err.message || "Could not load JoSAA data."))
      .finally(() => setDataLoading(false));
  }, [state.step, rows, dataLoading]);

  const seatIndex = useMemo(() => (rows ? buildSeatIndex(rows) : null), [rows]);

  const catalog = useMemo(() => {
    if (
      !rows ||
      !collegesByName ||
      !state.profile.category ||
      !state.profile.gender
    ) {
      return [];
    }
    return buildCatalog(rows, state.profile, collegesByName);
  }, [rows, collegesByName, state.profile]);

  const filteredCatalog = useMemo(() => {
    // Tokenized AND-match across institute + program together, so "mesra
    // computer science" finds BIT Mesra's CSE row — a whole-phrase substring
    // match against each field separately can never span the two fields.
    // Abbreviations expand the way students type them ("nit trichy"), same
    // list the Colleges tab search uses.
    const ABBREV = {
      nit: "national institute of technology",
      iiit: "indian institute of information technology",
      iit: "indian institute of technology",
      spa: "school of planning and architecture",
    };
    const raw = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const tokens = raw.flatMap((t) => (ABBREV[t] || t).split(" "));
    return catalog.filter((item) => {
      if (!matchesProgramType(item.program, programType)) return false;
      if (tokens.length === 0) return true;
      const haystack = `${item.institute} ${item.program}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [catalog, search, programType]);

  const chosenKeys = useMemo(
    () => new Set(state.choices.map((c) => `${c.institute}|${c.program}`)),
    [state.choices]
  );

  // Round 1 has no prior state, so it's computed once, automatically, as soon
  // as the student locks in and the data is ready. Every later round is only
  // computed when the student actually chooses float/slide (see onAdvance) —
  // the whole point is that the choice made at each round changes what gets
  // checked next, so it can't be precomputed upfront.
  useEffect(() => {
    if (!hydrated || state.step !== "simulate" || !state.locked) return;
    if (state.trail.length > 0) return;
    if (!seatIndex || !collegesByName || state.choices.length === 0) return;
    const first = getRoundOneResult(
      state.choices,
      state.profile,
      seatIndex,
      collegesByName
    );
    setState((s) =>
      s.trail.length > 0
        ? s
        : { ...s, trail: [{ round: 1, provisional: first, mode: null }] }
    );
  }, [
    hydrated,
    state.step,
    state.locked,
    state.trail.length,
    state.choices,
    state.profile,
    seatIndex,
    collegesByName,
  ]);

  const current =
    state.trail.length > 0 ? state.trail[state.trail.length - 1] : null;
  const isFinalRound = current ? current.round >= TOTAL_ROUNDS : false;
  const finalRevealed = state.frozen || isFinalRound;

  const setStep = (step) => setState((s) => ({ ...s, step }));
  const setProfile = (patch) =>
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const addChoice = (item) => {
    setState((s) => {
      const key = `${item.institute}|${item.program}`;
      if (s.choices.some((c) => `${c.institute}|${c.program}` === key))
        return s;
      return { ...s, choices: [...s.choices, item] };
    });
  };
  const removeChoice = (index) => {
    setState((s) => ({
      ...s,
      choices: s.choices.filter((_, i) => i !== index),
    }));
  };
  // Used by the Review step's drag-and-drop. `gapIndex` is a position BETWEEN
  // items in the ORIGINAL (pre-drag) array — 0..choices.length, where
  // choices.length means "after the last item". Removing fromIndex first
  // shifts everything after it back by one, so a gap that sat after the
  // dragged item needs that same shift applied before inserting, or a
  // downward drag lands one slot short (and dropping past the last item
  // would be indistinguishable from dropping just before it).
  const reorderChoices = (fromIndex, gapIndex) => {
    setState((s) => {
      if (fromIndex < 0 || fromIndex >= s.choices.length) return s;
      const next = [...s.choices];
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = gapIndex > fromIndex ? gapIndex - 1 : gapIndex;
      next.splice(insertAt, 0, moved);
      return { ...s, choices: next };
    });
  };

  // Adjacent swaps, expressed as gaps for reorderChoices — up: the gap just
  // before the previous item; down: the gap just after the next item.
  const moveChoiceUp = (index) => reorderChoices(index, Math.max(0, index - 1));
  const moveChoiceDown = (index) => reorderChoices(index, index + 2);

  const lockChoices = () =>
    setState((s) => ({
      ...s,
      locked: true,
      trail: [],
      frozen: false,
      step: "simulate",
    }));

  const freeze = () => setState((s) => ({ ...s, frozen: true }));

  // mode: "float" (search the whole list) or "slide" (same institute only).
  const advance = (mode) => {
    setState((s) => {
      const last = s.trail[s.trail.length - 1];
      if (!last || last.round >= TOTAL_ROUNDS) return s;
      const next = advanceRound(
        s.choices,
        s.profile,
        seatIndex,
        collegesByName,
        last.round + 1,
        last.provisional,
        mode
      );
      return { ...s, trail: [...s.trail, next] };
    });
  };

  // Real JoSAA rounds don't resolve instantly — this fakes that processing
  // feel (and gives round-to-round changes a beat to register) by holding a
  // label on screen for a bit before actually applying the state change.
  // No real async work happens here; it's purely cosmetic pacing.
  const [transitionLabel, setTransitionLabel] = useState(null);
  const runWithDelay = (label, delayMs, action) => {
    setTransitionLabel(label);
    window.setTimeout(() => {
      action();
      setTransitionLabel(null);
    }, delayMs);
  };

  const restart = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
    setSearch("");
    setProgramType("all");
  };

  const profileValid =
    state.profile.category &&
    state.profile.gender &&
    state.profile.homeState &&
    Number(state.profile.mainRank) > 0 &&
    (state.profile.qualifiedJeeAdv !== "Yes" ||
      Number(state.profile.advRank) > 0);

  if (!hydrated) return null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      {/* One title, no side doors — every action lives inside its step.
          The analysis and rounds-history links appear only where they make
          sense: on the result screen (see SimulateStep). */}
      <h1 className="text-center text-2xl font-bold text-[#3a2c28] md:text-3xl">
        JoSAA Mock Allotment
      </h1>
      <p className="mt-2 text-center text-sm text-[#6d5550]">
        Fill your choices, lock them, then play the rounds: freeze, float or
        slide, just as JoSAA runs them.
      </p>
      {onChangeExam && (
        <p className="mt-1 text-center">
          <button
            type="button"
            onClick={onChangeExam}
            className="text-xs font-semibold text-[#7a635d] underline hover:text-[#b52326]"
          >
            ← Choose a different exam
          </button>
        </p>
      )}

      {state.step !== "simulate" && (
        <StepBar
          current={state.step}
          profileValid={profileValid}
          choicesCount={state.choices.length}
          locked={state.locked}
          onSelect={setStep}
        />
      )}

      {transitionLabel && <LoadingCard label={transitionLabel} />}

      {!transitionLabel && state.step === "info" && (
        <InfoStep
          profile={state.profile}
          setProfile={setProfile}
          onNext={() => setStep("choices")}
          valid={profileValid}
        />
      )}

      {!transitionLabel && state.step === "choices" && (
        <ChoicesStep
          loading={dataLoading}
          error={dataError}
          catalog={filteredCatalog}
          totalCatalogSize={catalog.length}
          chosenKeys={chosenKeys}
          choices={state.choices}
          search={search}
          setSearch={setSearch}
          programType={programType}
          setProgramType={setProgramType}
          onAdd={addChoice}
          onRemove={removeChoice}
          onReorder={reorderChoices}
          onMoveUp={moveChoiceUp}
          onMoveDown={moveChoiceDown}
          onBack={() => setStep("info")}
          onNext={() => setStep("review")}
          locked={state.locked}
        />
      )}

      {!transitionLabel && state.step === "review" && (
        <ReviewStep
          profile={state.profile}
          choices={state.choices}
          locked={state.locked}
          onBack={() => setStep("choices")}
          onLock={() =>
            runWithDelay(
              "Locking your choices and running Round 1 allotment…",
              1400,
              lockChoices
            )
          }
          onProceed={() =>
            runWithDelay("Returning to your simulation…", 700, () =>
              setStep("simulate")
            )
          }
          onReorder={reorderChoices}
          onMoveUp={moveChoiceUp}
          onMoveDown={moveChoiceDown}
          onRemove={removeChoice}
        />
      )}

      {!transitionLabel && state.step === "simulate" && (
        <SimulateStep
          locked={state.locked}
          choices={state.choices}
          current={current}
          finalRevealed={finalRevealed}
          isFinalRound={isFinalRound}
          collegesByName={collegesByName}
          catalog={catalog}
          seatIndex={seatIndex}
          trail={state.trail}
          profile={state.profile}
          onFreeze={freeze}
          onAdvance={(mode) =>
            runWithDelay(
              `Processing Round ${current ? current.round + 1 : ""} allotment…`,
              1100,
              () => advance(mode)
            )
          }
          onRestart={restart}
        />
      )}
    </div>
  );
};

const CatalogRow = ({ item, added, onAdd, locked }) => (
  <div className="flex items-center justify-between gap-3 border-b border-[#f0e6e1] px-3 py-2 last:border-b-0">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#3a2c28]">{item.institute}</p>
      <p className="text-xs text-[#7a655f]">{item.program}</p>
      {/* Deliberately no cutoff/rank shown here — this is a practice mock, not
          the predictor. Seeing which seats are "easy" before you build your
          list defeats the point: real JoSAA doesn't tell you either. */}
    </div>
    <button
      type="button"
      disabled={added || locked}
      onClick={() => onAdd(item)}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
        added || locked
          ? "cursor-not-allowed bg-[#f0e6e1] text-[#9a8a84]"
          : "bg-[#b52326] text-white hover:bg-[#98191c]"
      }`}
    >
      {locked ? "Locked" : added ? "Added ✓" : "+ Add"}
    </button>
  </div>
);

const choiceItemKey = (item) => `${item.institute}|${item.program}`;

// Thin wrapper pinning the shared component's itemKey to the JoSAA
// institute|program shape used throughout this file.
const Reorderable = (props) => (
  <ReorderableChoiceList itemKey={choiceItemKey} {...props} />
);

const ChoicesStep = ({
  loading,
  error,
  catalog,
  totalCatalogSize,
  chosenKeys,
  choices,
  search,
  setSearch,
  programType,
  setProgramType,
  onAdd,
  onRemove,
  onReorder,
  onMoveUp,
  onMoveDown,
  onBack,
  onNext,
  locked,
}) => (
  <div className="mt-6 grid gap-6 md:grid-cols-2">
    {locked && (
      <p className="md:col-span-2 rounded-xl border border-[#d8c7c1] bg-[#f8efec] px-4 py-2 text-xs font-semibold text-[#5b4a45]">
        Choices are locked & submitted — browsing only, no changes.
      </p>
    )}
    <div className={cardClass}>
      <h2 className="text-sm font-bold text-[#3a2c28]">
        Browse choices{" "}
        {totalCatalogSize ? `(${totalCatalogSize} eligible for you)` : ""}
      </h2>

      {/* ONE search box: tokenized across institute + program together, so
          "iit indore cse" works. The old per-institute dropdown fought the
          search (typing "iit" matched nothing while the dropdown held the
          filter) — gone. Program types are chips, not a third select. */}
      <div className="mt-3 space-y-2">
        <input
          className={inputClass}
          placeholder="Search an institute or branch — try 'iit'…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {[
            ["all", "All"],
            ["engineering", "Engineering"],
            ["architecture", "Architecture"],
            ["planning", "Planning"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setProgramType(v)}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                programType === v
                  ? "border-[#b52326] bg-[#b52326] text-white"
                  : "border-[#e0cdc6] bg-white text-[#5b4a45] hover:border-[#b52326]/60"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 max-h-96 overflow-y-auto rounded-lg border border-[#f0e6e1]">
        {loading && (
          <p className="p-4 text-sm text-[#7a655f]">Loading JoSAA data…</p>
        )}
        {error && <p className="p-4 text-sm text-[#b52326]">{error}</p>}
        {!loading && !error && catalog.length === 0 && (
          <p className="p-4 text-sm text-[#7a655f]">
            No matching choices. Try clearing filters.
          </p>
        )}
        {!loading &&
          !error &&
          catalog.map((item) => (
            <CatalogRow
              key={`${item.institute}|${item.program}`}
              item={item}
              added={chosenKeys.has(`${item.institute}|${item.program}`)}
              onAdd={onAdd}
              locked={locked}
            />
          ))}
      </div>
    </div>

    <div className={cardClass}>
      <h2 className="text-sm font-bold text-[#3a2c28]">
        Your preference order ({choices.length})
      </h2>
      {choices.length === 0 ? (
        <p className="mt-3 text-sm text-[#7a655f]">
          Add choices from the left.
        </p>
      ) : locked ? (
        <ol className="mt-2 space-y-1">
          {choices.map((item, index) => (
            <li
              key={`${item.institute}|${item.program}`}
              className="rounded-lg border border-[#f0e6e1] px-3 py-2 text-sm"
            >
              <span className="mr-2 font-bold text-[#b52326]">
                {index + 1}.
              </span>
              {item.institute} —{" "}
              <span className="text-[#7a655f]">{item.program}</span>
            </li>
          ))}
        </ol>
      ) : (
        <Reorderable
          choices={choices}
          onReorder={onReorder}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
        />
      )}

      <div className="mt-5 flex justify-between">
        <button type="button" className={secondaryBtn} onClick={onBack}>
          ← Edit your info
        </button>
        <button
          type="button"
          className={primaryBtn}
          disabled={choices.length === 0}
          onClick={onNext}
        >
          {locked ? "Go to Review →" : "Save and Continue →"}
        </button>
      </div>
    </div>
  </div>
);

const InfoStep = ({ profile, setProfile, onNext, valid }) => (
  <div className={`${cardClass} mt-6`}>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={categoryField.label}>
        <Dropdown
          options={toOptions(categoryField.options)}
          selectedValue={profile.category || null}
          onChange={(o) => setProfile({ category: o.value })}
          placeholder="Select…"
          isSearchable={false}
        />
      </Field>

      <Field label={genderField.label}>
        <Dropdown
          options={toOptions(genderField.options)}
          selectedValue={profile.gender || null}
          onChange={(o) => setProfile({ gender: o.value })}
          placeholder="Select…"
          isSearchable={false}
        />
      </Field>

      <Field label="Select Your Home State">
        <Dropdown
          options={statesList.map((s) => ({ value: s, label: s }))}
          selectedValue={profile.homeState || null}
          onChange={(o) => setProfile({ homeState: o.value })}
          placeholder="Select…"
          hideValueWhileSearching
        />
      </Field>

      <Field label="Enter JEE Main Category Rank">
        <input
          type="number"
          min="1"
          className={rankInputClass}
          value={profile.mainRank}
          onChange={(e) => setProfile({ mainRank: e.target.value })}
          placeholder="e.g., 15000"
        />
      </Field>

      <Field label={qualifiedField.label}>
        <Dropdown
          options={toOptions(qualifiedField.options)}
          selectedValue={profile.qualifiedJeeAdv}
          onChange={(o) => setProfile({ qualifiedJeeAdv: o.value })}
          isSearchable={false}
        />
      </Field>

      {profile.qualifiedJeeAdv === "Yes" && (
        <Field label="Enter JEE Advanced Category Rank">
          <input
            type="number"
            min="1"
            className={rankInputClass}
            value={profile.advRank}
            onChange={(e) => setProfile({ advRank: e.target.value })}
            placeholder="e.g., 4000"
          />
        </Field>
      )}
    </div>

    <div className="mt-5 flex justify-end">
      <button
        type="button"
        className={primaryBtn}
        disabled={!valid}
        onClick={onNext}
      >
        Continue to Choice Filling →
      </button>
    </div>
  </div>
);

const ReviewStep = ({
  profile,
  choices,
  locked,
  onBack,
  onLock,
  onProceed,
  onReorder,
  onMoveUp,
  onMoveDown,
  onRemove,
}) => {
  // Purely cosmetic confirmation — reordering/removing already saves to state
  // (and localStorage) immediately, so this button has nothing extra to do
  // except reassure the student their order stuck, the way JoSAA's own
  // "Save" click does.
  const [justSaved, setJustSaved] = useState(false);
  const flashSaved = () => {
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1500);
  };

  return (
    <div className={`${cardClass} mt-6`}>
      <h2 className="text-sm font-bold text-[#3a2c28]">Your profile</h2>
      <div className="mt-2">
        <ProfileChips profile={profile} />
      </div>

      <h2 className="mt-5 text-sm font-bold text-[#3a2c28]">
        {locked ? "Locked" : "Review &"} preference order ({choices.length})
      </h2>

      {!locked ? (
        choices.length === 0 ? (
          <p className="mt-3 text-sm text-[#7a655f]">
            No choices added yet — go back to Choice Filling to add some.
          </p>
        ) : (
          <Reorderable
            choices={choices}
            onReorder={onReorder}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onRemove={onRemove}
          />
        )
      ) : (
        <ol className="mt-2 space-y-1">
          {choices.map((item, index) => (
            <li
              key={`${item.institute}|${item.program}`}
              className="rounded-lg border border-[#f0e6e1] px-3 py-2 text-sm"
            >
              <span className="mr-2 font-bold text-[#b52326]">
                {index + 1}.
              </span>
              {item.institute} —{" "}
              <span className="text-[#7a655f]">{item.program}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-5 flex flex-wrap justify-between gap-2">
        {!locked ? (
          <>
            <button type="button" className={secondaryBtn} onClick={onBack}>
              ← Back to add more choices
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryBtn}
                disabled={choices.length === 0}
                onClick={flashSaved}
              >
                {justSaved ? "✓ Saved" : "Save changes"}
              </button>
              <button
                type="button"
                className={primaryBtn}
                disabled={choices.length === 0}
                onClick={onLock}
              >
                Lock & Submit Choices
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-[#7a655f]">Locked & submitted.</p>
            <button type="button" className={primaryBtn} onClick={onProceed}>
              Proceed to Simulation →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// The round/status line lives here and only here — SimulateStep used to
// also print its own "This was the final round — this is your result." /
// "Frozen — this is your result." underneath, repeating what this header
// already said once the result was revealed. One label, one place.
//
// Once finalRevealed, this is ALSO the only card that shows the institute +
// program — SimulateStep used to render a second "Your simulated allotment"
// card right below repeating the same institute/program (plus a "Branch
// closing rank" chip duplicating the Closing figure already on this card).
// college/fee are only needed for that final chip row.
const RoundCard = ({
  current,
  choicesCount,
  finalRevealed,
  isFinalRound,
  college,
  fee,
}) => {
  if (!current) return null;
  if (!current.provisional) {
    return (
      <div className={`${cardClass} border-dashed`}>
        <p className="text-sm text-[#7a655f]">
          No seat in your list is reachable in Round {current.round} yet.
        </p>
      </div>
    );
  }
  const { choice, index, opening, closing } = current.provisional;
  if (finalRevealed) {
    // the moment of finality: a quiet tick and "Seat allotted", not confetti
    return (
      <div className="rounded-xl border-2 border-[#1f8a5b]/40 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={22} className="shrink-0 text-[#1f8a5b]" />
          <p className="text-sm font-black uppercase tracking-wide text-[#1f8a5b]">
            Seat allotted
          </p>
          <span className="text-xs font-semibold text-[#8a6d63]">
            · Round {current.round} of {TOTAL_ROUNDS}
            {isFinalRound ? "" : " (you froze this seat)"}
          </span>
        </div>
        <p className="mt-2 text-xl font-black text-[#2f2320]">
          {choice.institute}
        </p>
        <p className="mt-0.5 text-sm text-[#5b4a45]">{choice.program}</p>
        <p className="mt-2 text-xs text-[#7a655f]">
          Your preference #{index + 1} of {choicesCount} · Opening{" "}
          {formatRank(opening)} / Closing {formatRank(closing)}
        </p>
        <MatchStats
          item={{
            closingRank: closing,
            nirfRank: college?.nirf?.rank ?? null,
            medianSalary: college?.placement?.median_salary ?? null,
            annualFee: fee?.amount ?? null,
            feeWaived: fee?.waived ?? false,
          }}
        />
      </div>
    );
  }
  return (
    <div className={cardClass}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#b52326]">
        Round {current.round} of {TOTAL_ROUNDS} · provisional seat
      </p>
      <p className="mt-1 text-lg font-bold text-[#3a2c28]">
        {choice.institute}
      </p>
      <p className="text-sm text-[#5b4a45]">{choice.program}</p>
      <p className="mt-2 text-xs text-[#7a655f]">
        Your preference #{index + 1} of {choicesCount} · Opening{" "}
        {formatRank(opening)} / Closing {formatRank(closing)}
      </p>
    </div>
  );
};

// Rounds history as an overlay, not a page hop — the run stays on screen
// behind it. Esc, the x, and a click on the backdrop all close it.
const RoundsHistoryModal = ({ trail, onClose }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2f2320]/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Rounds history"
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#eaded8] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#2f2320]">Rounds history</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0cdc6] text-[#5b4a45] transition hover:border-[#b52326]/60 hover:text-[#b52326]"
          >
            ×
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {trail.map((r) => (
            <div
              key={r.round}
              className="rounded-xl border border-[#eaded8] p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#b52326]">
                Round {r.round} of {TOTAL_ROUNDS}
                {r.mode ? ` · ${r.mode}` : ""}
              </p>
              {r.provisional ? (
                <>
                  <p className="mt-1 font-semibold text-[#3a2c28]">
                    {r.provisional.choice.institute}
                  </p>
                  <p className="text-sm text-[#7a655f]">
                    {r.provisional.choice.program}
                  </p>
                  <p className="mt-1 text-xs text-[#7a655f]">
                    Opening {formatRank(r.provisional.opening)} / Closing{" "}
                    {formatRank(r.provisional.closing)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-[#7a655f]">
                  No seat reachable this round.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SimulateStep = ({
  locked,
  choices,
  current,
  finalRevealed,
  isFinalRound,
  collegesByName,
  catalog,
  seatIndex,
  trail,
  profile,
  onFreeze,
  onAdvance,
  onRestart,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  if (!locked) {
    return (
      <div className={`${cardClass} mt-6`}>
        <p className="text-sm text-[#7a655f]">
          Lock your choices first to run the simulation.
        </p>
      </div>
    );
  }
  if (!current) {
    return (
      <div className={`${cardClass} mt-6`}>
        <p className="text-sm text-[#7a655f]">Preparing your simulation…</p>
      </div>
    );
  }

  const finalChoice = current.provisional;
  const college = finalChoice
    ? collegesByName?.get(finalChoice.choice.institute)
    : null;
  const fee = college ? annualFeeForCategory(college, profile.category) : null;
  const canSlide = Boolean(finalChoice);

  return (
    <div className="mt-6 space-y-6">
      <ProfileChips profile={profile} />
      <RoundCard
        current={current}
        choicesCount={choices.length}
        finalRevealed={finalRevealed}
        isFinalRound={isFinalRound}
        college={college}
        fee={fee}
      />

      {!finalRevealed && (
        <div className="rounded-xl border border-[#eaded8] bg-[#fdf8f6] p-4 text-sm leading-6 text-[#4a3a36]">
          <p>
            <span className="font-black text-[#2f2320]">Freeze</span>: accept
            this seat and end your counselling here.
          </p>
          <p>
            <span className="font-black text-[#2f2320]">Float</span>: keep this
            seat, but try for anything higher on your list next round.
          </p>
          <p>
            <span className="font-black text-[#2f2320]">Slide</span>: keep this
            institute, but try for a better branch here next round.
          </p>
        </div>
      )}

      {!finalRevealed && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!finalChoice}
            title={
              finalChoice
                ? "Accept this seat and end the mock here"
                : "You don't hold a seat yet, so there's nothing to freeze"
            }
            className={primaryBtn}
            onClick={onFreeze}
          >
            Freeze this seat
          </button>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => onAdvance("float")}
          >
            Float to Round {current.round + 1}
          </button>
          <button
            type="button"
            disabled={!canSlide}
            title={
              canSlide
                ? `Only look for a better branch at ${finalChoice.choice.institute}`
                : "You don't hold a seat yet, so there's nothing to slide within"
            }
            className={secondaryBtn}
            onClick={() => onAdvance("slide")}
          >
            Slide to Round {current.round + 1}
          </button>
        </div>
      )}

      {finalRevealed && !finalChoice && (
        <div className={cardClass}>
          <p className="text-sm text-[#7a655f]">
            Based on this rank and this list, no seat was reachable across any
            round. Go back and add more (or less competitive) choices, or double
            check your rank.
          </p>
        </div>
      )}

      {/* once the run is over, the verdict on the LIST lives right here —
          balance gauge, reach/match/safety, and a few concrete suggestions —
          instead of behind a button hop */}
      {/* the analyzer needs the loaded JoSAA data — on a reload of a
          finished run it arrives a beat after the page does */}
      {finalRevealed && collegesByName && seatIndex && catalog.length > 0 && (
        <>
          <div className="pt-2 text-center">
            <p className="text-sm font-semibold text-[#7a635d]">
              How strong was your list?
            </p>
            <ArrowDown
              size={18}
              className="mx-auto mt-2 text-[#B52326]/60"
              aria-hidden="true"
            />
          </div>
          <ListAnalyzer
            choices={choices}
            catalog={catalog}
            seatIndex={seatIndex}
            collegesByName={collegesByName}
            profile={profile}
          />
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-[#eaded8] pt-4">
        <button
          type="button"
          className={secondaryBtn}
          onClick={() => setShowHistory(true)}
        >
          Rounds history
        </button>
        <button
          type="button"
          className="text-xs text-[#7a635d] underline hover:text-[#b52326]"
          onClick={onRestart}
        >
          Start over
        </button>
      </div>

      {showHistory && (
        <RoundsHistoryModal
          trail={trail}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default JosaaMockAllotment;

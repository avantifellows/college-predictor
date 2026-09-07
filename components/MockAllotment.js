import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GripVertical, Check } from "lucide-react";
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
  formatSalary,
  cardClass,
  inputClass,
  primaryBtn,
  secondaryBtn,
} from "./mockAllotmentTheme";
import { MatchStats } from "./InstituteRankedList";

// Practice JoSAA choice-filling + locking + a round-by-round freeze/float mock,
// built entirely on data already in this repo (see docs/SIMULATION_DATA.md).
// No backend: everything lives in component state + localStorage, mirroring
// how the rest of this app has no database either.

// v2: replaced the precomputed 6-round trace (roundPointer into it) with an
// interactive trail, so freeze/float/slide can each change what's checked
// next round instead of all 6 rounds being decided upfront.
// Exported so the standalone "My Choices" / "Rounds History" pages (see
// pages/mock-allotment/) can read the same persisted run without duplicating
// the key or the merge-with-defaults logic below.
export const STORAGE_KEY = "josaaMockAllotmentState_v2";

// Only these three get a tab in the bar — Simulation isn't something you
// navigate to directly, it's what you land on after submitting from Review
// & Manage. state.step still uses "simulate" internally (see lockChoices).
const NAV_STEPS = ["info", "choices", "review"];
const STEP_LABELS = {
  info: "1. Your info",
  choices: "2. Choice filling",
  review: "3. Review & lock",
};

const categoryField = josaaConfig.fields.find((f) => f.name === "category");
const genderField = josaaConfig.fields.find((f) => f.name === "gender");
const qualifiedField = josaaConfig.fields.find(
  (f) => f.name === "qualifiedJeeAdv"
);

const optionValue = (opt) => (typeof opt === "string" ? opt : opt.value);
const optionLabel = (opt) => (typeof opt === "string" ? opt : opt.label);

// A reminder of who this run is — category, gender, home state, rank —
// shown the same way everywhere in Mock Allotment: the Simulation results,
// and (since none of My Choices / Rounds History / Find Your Best Match /
// Analyse Your List have the Student Info tab available either) each of
// their standalone pages too. Exported so those pages can import it
// straight from here instead of re-deriving the category label lookup.
export const ProfileChips = ({ profile }) => {
  const chips = [
    `Category: ${
      optionLabel(
        categoryField.options.find((o) => optionValue(o) === profile.category)
      ) || profile.category
    }`,
    profile.gender,
    `Home state: ${profile.homeState}`,
    `JEE Main rank ${formatRank(profile.mainRank)}`,
    profile.qualifiedJeeAdv === "Yes"
      ? `JEE Advanced rank ${formatRank(profile.advRank)}`
      : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap gap-2 text-xs text-[#5b4a45]">
      {chips.map((chip) => (
        <span key={chip} className="rounded-full bg-[#f8efec] px-3 py-1">
          {chip}
        </span>
      ))}
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

const MockAllotment = () => {
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
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
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

  // Manual "type a number to jump there" reordering. position1Based is what
  // the student typed (1 = top of the list).
  const moveChoiceToPosition = (fromIndex, position1Based) => {
    setState((s) => {
      const desiredIndex = Math.max(
        0,
        Math.min(position1Based - 1, s.choices.length - 1)
      );
      if (desiredIndex === fromIndex) return s;
      const gapIndex =
        desiredIndex >= fromIndex ? desiredIndex + 1 : desiredIndex;
      const next = [...s.choices];
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = gapIndex > fromIndex ? gapIndex - 1 : gapIndex;
      next.splice(insertAt, 0, moved);
      return { ...s, choices: next };
    });
  };

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
        Fill choices, lock them, then live the rounds: freeze, float or slide,
        like the real counselling.
      </p>

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

// Numbered stepper: step 1 (Student Info) always unlocked; steps 2 and 3
// both require it filled in, but neither gates the other — you can jump
// straight to Review & Manage with zero choices, no check between them.
// A step's circle turns into a checkmark once it's "done" (info: valid
// profile; choices: at least one pick; review: locked & submitted) —
// purely a progress cue, not a gate; you can still click back into a done
// step to change it (Review & Manage aside, which is read-only once locked).
const isStepDone = (step, { profileValid, choicesCount, locked }) => {
  if (step === "info") return profileValid;
  if (step === "choices") return choicesCount > 0;
  return locked; // review
};

const StepBar = ({ current, profileValid, choicesCount, locked, onSelect }) => {
  const progress = { profileValid, choicesCount, locked };

  return (
    <div className="mt-6 flex items-start">
      {NAV_STEPS.map((step, idx) => {
        const disabled = step !== "info" && !profileValid;
        const active = current === step;
        const done = isStepDone(step, progress);
        return (
          <React.Fragment key={step}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(step)}
              className="flex w-24 shrink-0 flex-col items-center gap-1.5 disabled:cursor-not-allowed sm:w-32"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition ${
                  active
                    ? "border-[#b52326] bg-[#b52326] text-white"
                    : done
                    ? "border-[#b52326] bg-white text-[#b52326]"
                    : disabled
                    ? "border-[#e4d8d2] bg-[#f8efec] text-[#c9b8b2]"
                    : "border-[#d8c7c1] bg-white text-[#5b4a45]"
                }`}
              >
                {done && !active ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  idx + 1
                )}
              </span>
              <span
                className={`text-center text-sm font-semibold leading-tight ${
                  active
                    ? "text-[#b52326]"
                    : disabled
                    ? "text-[#c9b8b2]"
                    : "text-[#5b4a45]"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </button>
            {idx < NAV_STEPS.length - 1 && (
              <span
                className={`mt-3 h-0.5 flex-1 rounded transition-colors ${
                  done ? "bg-[#b52326]" : "bg-[#e4d8d2]"
                }`}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Shown in place of the current step while a locking/round action fakes a
// beat of "processing" — see runWithDelay in MockAllotment.
const LoadingCard = ({ label }) => (
  <div
    className={`${cardClass} mt-6 flex flex-col items-center justify-center gap-3 py-14 text-center`}
  >
    <div
      className="h-9 w-9 animate-spin rounded-full border-4 border-[#f0e6e1] border-t-[#b52326]"
      aria-hidden="true"
    />
    <p className="text-sm font-semibold text-[#5b4a45]">{label}</p>
  </div>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-[#5b4a45]">
      {label}
    </span>
    {children}
  </label>
);

// number inputs without the browser's spinner arrows — they crowd the value
const rankInputClass = `${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

const toOptions = (opts) =>
  opts.map((o) => ({ value: optionValue(o), label: optionLabel(o) }));

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

// Reorder controls shared by the Choice Filling and Review & Manage steps —
// drag handle, ↑/↓ buttons, and a type-a-number-to-jump box, all driving the
// same set of handlers. Used any time a choice list needs to be editable.
const ReorderableChoiceList = ({
  choices,
  onReorder,
  onMoveUp,
  onMoveDown,
  onRemove,
}) => {
  // Pointer Events (not the native HTML5 drag API) so the same handlers drive
  // mouse, touch, and pen — the native drag API doesn't fire on touch at all,
  // which would leave mobile students with no way to reorder.
  const [dragIndex, setDragIndex] = useState(null);
  // A GAP position in the pre-drag array, not an item index: 0..choices.length,
  // where choices.length means "after the last item". onReorder expects this
  // exact shape — see reorderChoices' comment for why a plain index isn't enough.
  const [overGap, setOverGap] = useState(null);
  // Where the pointer currently is, so a floating label can follow it — the
  // browser's native drag API draws its own ghost image automatically;
  // Pointer Events don't, so without this the item being dragged is
  // invisible the whole time it's moving (only the dimmed original row and
  // the drop-target highlight are visible otherwise).
  const [pointerPos, setPointerPos] = useState(null);
  const itemRefs = useRef([]);
  const findGapAtY = (clientY) => {
    for (let i = 0; i < itemRefs.current.length; i += 1) {
      const rect = itemRefs.current[i]?.getBoundingClientRect();
      if (rect && clientY < rect.top + rect.height / 2) return i;
    }
    return choices.length;
  };

  const handlePointerDown = (index) => (e) => {
    e.currentTarget.setPointerCapture(e.pointerId); // routes later move/up here even off-element
    setDragIndex(index);
    setOverGap(index);
    setPointerPos({ x: e.clientX, y: e.clientY });
  };
  const handlePointerMove = (e) => {
    if (dragIndex === null) return;
    setPointerPos({ x: e.clientX, y: e.clientY });
    const target = findGapAtY(e.clientY);
    if (target !== overGap) setOverGap(target);
  };
  const endDrag = () => {
    // A gap equal to fromIndex or fromIndex+1 both mean "drop back where it
    // started" (nothing before/after it actually moves), so only reorder
    // outside that no-op range.
    if (
      dragIndex !== null &&
      overGap !== null &&
      overGap !== dragIndex &&
      overGap !== dragIndex + 1
    ) {
      onReorder(dragIndex, overGap);
    }
    setDragIndex(null);
    setOverGap(null);
    setPointerPos(null);
  };

  // Approximate which row to highlight as the drop target — just the
  // nearest row to the gap, not a true "insert here" line between rows.
  const highlightIndex =
    overGap === null ? null : Math.min(overGap, choices.length - 1);

  return (
    <>
      <ol className="mt-3 space-y-2">
        {choices.map((item, index) => {
          const key = `${item.institute}|${item.program}`;
          return (
            <li
              key={key}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                highlightIndex === index
                  ? "border-[#b52326] bg-[#fdf3f1]"
                  : "border-[#f0e6e1]"
              } ${dragIndex === index ? "opacity-50" : ""}`}
            >
              <span
                onPointerDown={handlePointerDown(index)}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                style={{ touchAction: "none" }}
                className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
                aria-label="Drag to reorder"
              >
                <GripVertical size={16} className="text-[#c9b8b2]" />
              </span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fbeeec] text-xs font-black text-[#b52326]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#3a2c28]">
                  {item.institute}
                </p>
                <p className="text-xs text-[#7a655f]">{item.program}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onMoveUp(index)}
                  className="rounded-full border border-[#d8c7c1] px-2 py-1 text-xs disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === choices.length - 1}
                  onClick={() => onMoveDown(index)}
                  className="rounded-full border border-[#d8c7c1] px-2 py-1 text-xs disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="rounded-full border border-[#d8c7c1] px-2 py-1 text-xs text-[#b52326]"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {dragIndex !== null && pointerPos && (
        <div
          style={{
            position: "fixed",
            left: pointerPos.x + 16,
            top: pointerPos.y + 16,
            zIndex: 9999,
          }}
          className="pointer-events-none max-w-[240px] rounded-lg border-2 border-[#b52326] bg-white px-3 py-2 text-xs font-semibold text-[#3a2c28] shadow-lg"
        >
          #{dragIndex + 1}. {choices[dragIndex]?.institute}
        </div>
      )}
    </>
  );
};

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
        <ReorderableChoiceList
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
          <ReorderableChoiceList
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
  const statusLabel = !finalRevealed
    ? "provisional seat"
    : isFinalRound
    ? "final result"
    : "final result (frozen)";
  return (
    <div className={cardClass}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#b52326]">
        Round {current.round} of {TOTAL_ROUNDS} · {statusLabel}
      </p>
      <p className="mt-1 text-lg font-bold text-[#3a2c28]">
        {choice.institute}
      </p>
      <p className="text-sm text-[#5b4a45]">{choice.program}</p>
      <p className="mt-2 text-xs text-[#7a655f]">
        Your preference #{index + 1} of {choicesCount} · Opening{" "}
        {formatRank(opening)} / Closing {formatRank(closing)}
      </p>
      {finalRevealed && (
        <MatchStats
          item={{
            closingRank: closing,
            nirfRank: college?.nirf?.rank ?? null,
            medianSalary: college?.placement?.median_salary ?? null,
            annualFee: fee?.amount ?? null,
            feeWaived: fee?.waived ?? false,
          }}
        />
      )}
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
  profile,
  onFreeze,
  onAdvance,
  onRestart,
}) => {
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

      {!finalRevealed && (
        <p className="text-[11px] text-[#9a8a84]">
          <strong>Float</strong>: checks your whole list. <strong>Slide</strong>
          : same institute, other branches only.
        </p>
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

      <p className="text-[11px] text-[#9a8a84]">
        Based on JoSAA 2025 cutoffs. NIRF rank and CTC are per-college, not
        per-branch.
      </p>

      {/* the ONLY doors out of the result: one analysis, one history — the
          old Best Match wizard and the four-tab "better options" panel both
          re-answered the same question and are gone */}
      <div className="flex flex-wrap items-center gap-3">
        {finalRevealed && finalChoice && (
          <Link
            href="/mock-allotment/list-analyzer"
            className={`${primaryBtn} inline-flex items-center`}
          >
            Analyse my list
          </Link>
        )}
        <Link
          href="/mock-allotment/rounds-history"
          className={`${secondaryBtn} inline-flex items-center`}
        >
          Rounds history
        </Link>
        <button
          type="button"
          className="text-xs text-[#7a635d] underline hover:text-[#b52326]"
          onClick={onRestart}
        >
          Start over
        </button>
      </div>
    </div>
  );
};

export default MockAllotment;

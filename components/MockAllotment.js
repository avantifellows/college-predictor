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
  findMissedBetterOptions,
  annualFeeForCategory,
  TOTAL_ROUNDS,
} from "../utils/josaaSimulator";
import {
  formatRank,
  formatSalary,
  cardClass,
  inputClass,
  primaryBtn,
  secondaryBtn,
} from "./mockAllotmentTheme";
import { InstituteRankedList } from "./InstituteRankedList";
import { BEST_MATCH_STORAGE_KEY } from "./BestMatchFinder";

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
  info: "1. Student Info",
  choices: "2. Choice Filling",
  review: "3. Review & Manage",
};

const categoryField = josaaConfig.fields.find((f) => f.name === "category");
const genderField = josaaConfig.fields.find((f) => f.name === "gender");
const qualifiedField = josaaConfig.fields.find(
  (f) => f.name === "qualifiedJeeAdv"
);

const optionValue = (opt) => (typeof opt === "string" ? opt : opt.value);
const optionLabel = (opt) => (typeof opt === "string" ? opt : opt.label);

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
  const [instituteFilter, setInstituteFilter] = useState("");
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

  const instituteOptions = useMemo(
    () => Array.from(new Set(catalog.map((c) => c.institute))).sort(),
    [catalog]
  );

  const filteredCatalog = useMemo(() => {
    // Tokenized AND-match across institute + program together, so "mesra
    // computer science" finds BIT Mesra's CSE row — a whole-phrase substring
    // match against each field separately can never span the two fields.
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return catalog.filter((item) => {
      if (instituteFilter && item.institute !== instituteFilter) return false;
      if (!matchesProgramType(item.program, programType)) return false;
      if (tokens.length === 0) return true;
      const haystack = `${item.institute} ${item.program}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [catalog, search, instituteFilter, programType]);

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

  const missedOptions = useMemo(() => {
    if (
      !finalRevealed ||
      !current?.provisional ||
      !seatIndex ||
      !collegesByName ||
      catalog.length === 0
    ) {
      return [];
    }
    return findMissedBetterOptions(
      catalog,
      state.choices,
      current.provisional.choice,
      current.round,
      seatIndex,
      state.profile,
      collegesByName
    );
  }, [
    finalRevealed,
    current,
    catalog,
    state.choices,
    state.profile,
    seatIndex,
    collegesByName,
  ]);

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
    // Best Match answers are tied to this profile/rank — a fresh session
    // shouldn't silently carry over stale filters from a previous one.
    window.localStorage.removeItem(BEST_MATCH_STORAGE_KEY);
    setState(defaultState);
    setSearch("");
    setInstituteFilter("");
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
    <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-8">
      <h1 className="text-2xl font-bold text-[#3a2c28] md:text-3xl">
        JoSAA Mock Allotment
      </h1>

      {/* These four are all real pages (pages/mock-allotment/), not popups
          or inline toggles — each needs its own URL and a back link rather
          than fighting for space in a floating card. Left-aligned under the
          title, as a compact list of links rather than a row of buttons. */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
        {/* Independent of the round simulation — just needs a valid
            profile + catalog, so it's offered whether or not choices are
            locked yet. */}
        {profileValid && catalog.length > 0 && (
          <Link href="/mock-allotment/best-match" className="text-[#b52326] hover:underline">
            Best Match
          </Link>
        )}
        {/* Critiques the choices already on the list, so it needs at
            least one to say anything useful. */}
        {profileValid && state.choices.length > 0 && (
          <Link href="/mock-allotment/list-analyzer" className="text-[#5b4a45] hover:underline">
            Analyse List
          </Link>
        )}
        {/* Only meaningful once there's a locked run to look back on. */}
        {state.locked && (
          <>
            <Link href="/mock-allotment/choices" className="text-[#5b4a45] hover:underline">
              My Choices
            </Link>
            <Link href="/mock-allotment/rounds-history" className="text-[#5b4a45] hover:underline">
              Rounds History
            </Link>
          </>
        )}
      </div>

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
          instituteFilter={instituteFilter}
          setInstituteFilter={setInstituteFilter}
          instituteOptions={instituteOptions}
          programType={programType}
          setProgramType={setProgramType}
          onAdd={addChoice}
          onRemove={removeChoice}
          onReorder={reorderChoices}
          onMoveUp={moveChoiceUp}
          onMoveDown={moveChoiceDown}
          onMoveToPosition={moveChoiceToPosition}
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
          onMoveToPosition={moveChoiceToPosition}
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
          missedOptions={missedOptions}
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
                {done && !active ? <Check size={12} aria-hidden="true" /> : idx + 1}
              </span>
              <span
                className={`text-center text-sm font-semibold leading-tight ${
                  active ? "text-[#b52326]" : disabled ? "text-[#c9b8b2]" : "text-[#5b4a45]"
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

const InfoStep = ({ profile, setProfile, onNext, valid }) => (
  <div className={`${cardClass} mt-6`}>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={categoryField.label}>
        <select
          className={inputClass}
          value={profile.category}
          onChange={(e) => setProfile({ category: e.target.value })}
        >
          <option value="">Select…</option>
          {categoryField.options.map((opt) => (
            <option key={optionValue(opt)} value={optionValue(opt)}>
              {optionLabel(opt)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={genderField.label}>
        <select
          className={inputClass}
          value={profile.gender}
          onChange={(e) => setProfile({ gender: e.target.value })}
        >
          <option value="">Select…</option>
          {genderField.options.map((opt) => (
            <option key={optionValue(opt)} value={optionValue(opt)}>
              {optionLabel(opt)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Select Your Home State">
        <select
          className={inputClass}
          value={profile.homeState}
          onChange={(e) => setProfile({ homeState: e.target.value })}
        >
          <option value="">Select…</option>
          {statesList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Enter JEE Main Category Rank">
        <input
          type="number"
          min="1"
          className={inputClass}
          value={profile.mainRank}
          onChange={(e) => setProfile({ mainRank: e.target.value })}
          placeholder="e.g., 15000"
        />
      </Field>

      <Field label={qualifiedField.label}>
        <select
          className={inputClass}
          value={profile.qualifiedJeeAdv}
          onChange={(e) => setProfile({ qualifiedJeeAdv: e.target.value })}
        >
          {qualifiedField.options.map((opt) => (
            <option key={optionValue(opt)} value={optionValue(opt)}>
              {optionLabel(opt)}
            </option>
          ))}
        </select>
      </Field>

      {profile.qualifiedJeeAdv === "Yes" && (
        <Field label="Enter JEE Advanced Category Rank">
          <input
            type="number"
            min="1"
            className={inputClass}
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
  onMoveToPosition,
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
  // Manual "type a number, jump there" input state, per row (keyed by pair)
  // so mid-typing values aren't clobbered by re-renders from other rows.
  const [positionDrafts, setPositionDrafts] = useState({});

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

  const commitPosition = (index, key) => {
    const raw = positionDrafts[key];
    setPositionDrafts((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
    if (raw === undefined || raw === "") return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) onMoveToPosition(index, parsed);
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
              <input
                type="number"
                min={1}
                max={choices.length}
                value={positionDrafts[key] ?? index + 1}
                onChange={(e) =>
                  setPositionDrafts((d) => ({ ...d, [key]: e.target.value }))
                }
                onBlur={() => commitPosition(index, key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="w-11 shrink-0 rounded border border-[#d8c7c1] bg-[#fffdfa] px-1 py-0.5 text-center text-xs font-bold text-[#b52326] outline-none focus:border-[#b52326]"
                aria-label="Move to position"
              />
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
  instituteFilter,
  setInstituteFilter,
  instituteOptions,
  programType,
  setProgramType,
  onAdd,
  onRemove,
  onReorder,
  onMoveUp,
  onMoveDown,
  onMoveToPosition,
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

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="Search institute or program…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={inputClass}
          value={instituteFilter}
          onChange={(e) => setInstituteFilter(e.target.value)}
        >
          <option value="">All institutes</option>
          {instituteOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          className={`${inputClass} sm:col-span-2`}
          value={programType}
          onChange={(e) => setProgramType(e.target.value)}
        >
          <option value="all">All program types</option>
          <option value="engineering">Engineering</option>
          <option value="architecture">Architecture</option>
          <option value="planning">Planning</option>
        </select>
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
          onMoveToPosition={onMoveToPosition}
          onRemove={onRemove}
        />
      )}

      <div className="mt-5 flex justify-between">
        <button type="button" className={secondaryBtn} onClick={onBack}>
          ← Edit student info
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
  onMoveToPosition,
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
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#5b4a45]">
        {[
          optionLabel(
            categoryField.options.find(
              (o) => optionValue(o) === profile.category
            )
          ) || profile.category,
          profile.gender,
          profile.homeState,
          `JEE Main rank: ${profile.mainRank}`,
          profile.qualifiedJeeAdv === "Yes"
            ? `JEE Advanced rank: ${profile.advRank}`
            : null,
        ]
          .filter(Boolean)
          .map((chip) => (
            <span key={chip} className="rounded-full bg-[#f8efec] px-3 py-1">
              {chip}
            </span>
          ))}
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
            onMoveToPosition={onMoveToPosition}
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
      ? "final result — last round"
      : "final result — frozen";
  return (
    <div className={cardClass}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#b52326]">
        Round {current.round} of {TOTAL_ROUNDS} — {statusLabel}
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
        <div className="mt-3 grid gap-2 text-xs text-[#5b4a45] sm:grid-cols-2">
          <span className="rounded-full bg-[#f8efec] px-3 py-1">
            NIRF Engg rank: {college?.nirf?.engineering_rank ?? "not ranked"}
          </span>
          <span className="rounded-full bg-[#f8efec] px-3 py-1">
            Median CTC (college-level):{" "}
            {formatSalary(college?.placement?.median_salary)}
          </span>
          <span className="rounded-full bg-[#f8efec] px-3 py-1">
            Annual fee (your category): {formatSalary(fee?.amount)}
            {fee?.waived && " (waived)"}
          </span>
        </div>
      )}
    </div>
  );
};

const MISSED_OPTIONS_TABS = [
  {
    key: "closingRank",
    label: "By Closing Rank",
    note: "",
  },
  {
    key: "nirf",
    label: "By NIRF Ranking",
    note: "Only institutes ranked better than what you got, grouped one card per institute (every branch there shares the same NIRF rank). Only ~half of institutes are NIRF-ranked at all.",
  },
  {
    key: "salary",
    label: "By Median CTC",
    note: "Only institutes with a higher median CTC than what you got, grouped one card per institute — the figure is college-wide, not specific to any branch.",
  },
  {
    key: "fees",
    label: "By Fees",
    note: "Only institutes actually cheaper than what you got for your category (SC/ST/EWS/PwD at the waived rate), grouped one card per institute, with the rupee amount you'd have saved.",
  },
];

// Sort direction, display strings, and the "actually better than what you
// got" filter for each non-closing-rank tab — lower is "better" for fees
// (less rank-like, just cost), higher for salary, lower for NIRF (rank 1 is
// best). All three are college-level fields (colleges.json's nirf/
// placement/fees), so every branch at an institute shares one identical
// value — grouped by institute in the UI (see InstituteRankedList) rather
// than listed one row per branch, or a college with 5 reachable branches
// would fill 5 of the top 8 slots.
//
// `isBetter` filters to results that actually beat the student's own
// allotment on this metric (using the nirfBetter/ctcBetter/feeSavings flags
// findMissedBetterOptions attaches) — without it, this panel would happily
// list an institute with a WORSE NIRF rank or a HIGHER fee than what the
// student got, just because it was reachable. It's also what stops "By
// Fees" from being the same handful of cheap-but-loose-cutoff colleges for
// every student regardless of what they actually got — the bar moves with
// each student's own result.
const MISSED_OPTIONS_METRICS = {
  nirf: {
    metricKey: "nirfRank",
    direction: "asc",
    missingLabel: "a better NIRF rank than your allotment",
    isBetter: (item) => item.nirfBetter === true,
    formatLabel: (value) => `NIRF: ${value}`,
  },
  salary: {
    metricKey: "medianSalary",
    direction: "desc",
    missingLabel: "a better median CTC than your allotment",
    isBetter: (item) => item.ctcBetter === true,
    formatLabel: (value) => `Median CTC: ${formatSalary(value)}`,
  },
  fees: {
    metricKey: "annualFee",
    direction: "asc",
    missingLabel: "lower fees than your allotment",
    isBetter: (item) => item.feeSavings > 0,
    formatLabel: (value, item) =>
      `Fees: ${formatSalary(value)}${item.feeWaived ? " (waived)" : ""} · Save ${formatSalary(item.feeSavings)} vs. your allotment`,
  },
};

const MISSED_OPTIONS_DISPLAY_LIMIT = 8;

const missedOptionRow = (opt) => (
  <li
    key={`${opt.institute}|${opt.program}`}
    className="rounded-lg border border-[#f0e6e1] px-3 py-2 text-base"
  >
    <p className="font-semibold text-[#3a2c28]">{opt.institute}</p>
    <p className="text-sm text-[#7a655f]">{opt.program}</p>
    <p className="mt-1 text-xs text-[#9a8a84]">
      Closing rank: {formatRank(opt.closingRank)} · NIRF:{" "}
      {opt.nirfRank ?? "not ranked"} · Median CTC:{" "}
      {formatSalary(opt.medianSalary)} · Fees: {formatSalary(opt.annualFee)}
      {opt.annualFee != null && opt.feeWaived && " (waived)"}
      {opt.listPosition != null && (
        <>
          {" "}
          ·{" "}
          <span className="font-semibold text-[#b52326]">
            Was your choice #{opt.listPosition}
          </span>
        </>
      )}
    </p>
  </li>
);

// Recomputes a result's fee fields under a DIRECT waiver answer instead of
// the category-based assumption `annualFeeForCategory` bakes in (which only
// ever grants the waived rate to SC/ST/EWS/PwD) — a General/OBC-NCL student
// whose family income actually qualifies them can say so directly, and a
// student who knows they DON'T qualify can rule the waived rate out even if
// their category would normally get it. "unsure" keeps the category-based
// numbers findMissedBetterOptions already computed.
const effectiveFeeItem = (item, waiverAnswer) => {
  if (waiverAnswer === "unsure") {
    return {
      annualFee: item.annualFee,
      feeWaived: item.feeWaived,
      feeSavings: item.feeSavings,
    };
  }
  const annualFee =
    waiverAnswer === "yes"
      ? item.rawFeeWaived ?? item.rawFeeStandard
      : item.rawFeeStandard;
  const feeWaived = waiverAnswer === "yes" && item.rawFeeWaived != null;
  const winningFee =
    waiverAnswer === "yes"
      ? item.winningFeeWaived ?? item.winningFeeStandard
      : item.winningFeeStandard;
  const feeSavings =
    annualFee != null && winningFee != null ? winningFee - annualFee : null;
  return { annualFee, feeWaived, feeSavings };
};

const MissedOptionsPanel = ({ missedOptions, round }) => {
  const [tab, setTab] = useState("closingRank");
  // Fees-tab-only refinement — asked directly instead of guessing from
  // category alone (see effectiveFeeItem). Budget is optional: leave it
  // blank and the tab falls back to "cheaper than your own allotment";
  // fill it in and that becomes the bar instead.
  const [feeBudget, setFeeBudget] = useState("");
  const [feeWaiverAnswer, setFeeWaiverAnswer] = useState("unsure");
  const activeTab = MISSED_OPTIONS_TABS.find((t) => t.key === tab);

  const budget = Number(feeBudget);
  const hasBudget = feeBudget !== "" && Number.isFinite(budget) && budget > 0;

  const feesMetric = useMemo(
    () => ({
      metricKey: "annualFee",
      direction: "asc",
      isBetter: (item) => (hasBudget ? item.annualFee <= budget : item.feeSavings > 0),
      formatLabel: (value, item) =>
        `Fees: ${formatSalary(value)}${item.feeWaived ? " (waived)" : ""}` +
        (hasBudget ? "" : ` · Save ${formatSalary(item.feeSavings)} vs. your allotment`),
    }),
    [hasBudget, budget]
  );

  const feeItems = useMemo(
    () =>
      tab === "fees"
        ? missedOptions.map((item) => ({
            ...item,
            ...effectiveFeeItem(item, feeWaiverAnswer),
          }))
        : missedOptions,
    [tab, missedOptions, feeWaiverAnswer]
  );

  const metric = tab === "fees" ? feesMetric : MISSED_OPTIONS_METRICS[tab];
  const missingLabel = hasBudget
    ? `fees of ₹${feeBudget} or less`
    : MISSED_OPTIONS_METRICS[tab]?.missingLabel;

  return (
    <div className={cardClass}>
      <h2 className="text-base font-bold text-[#3a2c28]">
        You may have gotten a better option
      </h2>
      <p className="mt-1 text-sm text-[#7a655f]">
        Also reachable in Round {round}:
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {MISSED_OPTIONS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-[#b52326] text-white"
                : "border border-[#d8c7c1] text-[#5b4a45] hover:bg-[#f8efec]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab.note && (
        <p className="mt-2 text-xs text-[#9a8a84]">{activeTab.note}</p>
      )}

      {tab === "fees" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#5b4a45]">
              Max annual fees you can pay (₹)
            </span>
            <input
              type="number"
              min="0"
              className={inputClass}
              placeholder="Leave blank to compare vs. your allotment"
              value={feeBudget}
              onChange={(e) => setFeeBudget(e.target.value)}
            />
          </label>
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
        </div>
      )}

      {tab === "closingRank" && (
        <ClosingRankGroups missedOptions={missedOptions} />
      )}
      {tab !== "closingRank" && (
        <InstituteRankedList
          items={feeItems}
          metric={metric}
          emptyMessage={`None of the reachable options have ${missingLabel}.`}
        />
      )}
    </div>
  );
};

// JEE Main and JEE Advanced closing ranks are different rank spaces (see
// examSpaceFor in utils/josaaSimulator.js) — shown as two groups, never
// merged into one sorted list.
const ClosingRankGroups = ({ missedOptions }) => {
  const advanced = missedOptions
    .filter((o) => o.exam === "JEE Advanced")
    .sort((a, b) => a.closingRank - b.closingRank)
    .slice(0, MISSED_OPTIONS_DISPLAY_LIMIT);
  const main = missedOptions
    .filter((o) => o.exam === "JEE Main")
    .sort((a, b) => a.closingRank - b.closingRank)
    .slice(0, MISSED_OPTIONS_DISPLAY_LIMIT);

  if (advanced.length === 0 && main.length === 0) {
    return (
      <p className="mt-3 text-base text-[#7a655f]">No missed options found.</p>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {advanced.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-[#5b4a45]">
            JEE Advanced institutes (IITs)
          </p>
          <ul className="mt-2 space-y-2">{advanced.map(missedOptionRow)}</ul>
        </div>
      )}
      {main.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-[#5b4a45]">
            JEE Main institutes (NITs / IIITs / GFTIs)
          </p>
          <ul className="mt-2 space-y-2">{main.map(missedOptionRow)}</ul>
        </div>
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
  missedOptions,
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

  // A reminder of who this run is — the step tabs (including Student Info)
  // are hidden once you're in Simulation, so these chips are the only place
  // that context is still visible. Same chip style as Review & Manage's
  // "Your profile" row, not a plain dot-separated line.
  const profileChips = [
    optionLabel(
      categoryField.options.find((o) => optionValue(o) === profile.category)
    ) || profile.category,
    profile.gender,
    profile.homeState,
    `JEE Main rank: ${profile.mainRank}`,
    profile.qualifiedJeeAdv === "Yes"
      ? `JEE Advanced rank: ${profile.advRank}`
      : null,
  ].filter(Boolean);

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap gap-2 text-xs text-[#5b4a45]">
        {profileChips.map((chip) => (
          <span key={chip} className="rounded-full bg-[#f8efec] px-3 py-1">
            {chip}
          </span>
        ))}
      </div>
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


      {finalRevealed && finalChoice && missedOptions.length > 0 && (
        <MissedOptionsPanel
          missedOptions={missedOptions}
          round={current.round}
        />
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

      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryBtn} onClick={onRestart}>
          ↺ Restart mock allotment
        </button>
      </div>
    </div>
  );
};

export default MockAllotment;

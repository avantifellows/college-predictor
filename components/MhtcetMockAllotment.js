import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { mhtCetConfig } from "../examConfig";
import { loadMhtcetCatalog, getAllotmentResult } from "../utils/mhtcetSimulator";
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
import MhtcetListAnalyzer from "./MhtcetListAnalyzer";

// Practice MHT-CET (Maharashtra CAP) choice-filling + locking, the MHT-CET
// sibling of components/JosaaMockAllotment.js. Per product decision this
// does NOT play round by round — CAP's final round is enough to say whether
// a choice was reachable, so locking choices goes straight to a result (see
// utils/mhtcetSimulator.js for why no freeze/float/slide trail is needed
// here). Shares its stepper/reorder/loading UI with the JoSAA flow via
// ./mockAllotmentShared, and its field definitions/options/copy with the
// live predictor via mhtCetConfig (examConfig.js) — never redefined here.
export const STORAGE_KEY = "mhtcetMockAllotmentState_v1";

const streamField = mhtCetConfig.fields.find((f) => f.name === "stream");
const categoryField = mhtCetConfig.fields.find((f) => f.name === "category");
const genderField = mhtCetConfig.fields.find((f) => f.name === "gender");
const homeStateField = mhtCetConfig.fields.find((f) => f.name === "homeState");
const pwdField = mhtCetConfig.fields.find((f) => f.name === "isPWD");
const defenseField = mhtCetConfig.fields.find(
  (f) => f.name === "isDefenseWard"
);

// A reminder of who this run is, shown the same way JoSAA's ProfileChips is —
// on the Review step and again above the Simulation result.
const ProfileChips = ({ profile }) => {
  const rows = [
    ["Stream", profile.stream],
    [
      "Category",
      optionLabel(
        categoryField.options.find((o) => optionValue(o) === profile.category)
      ) || profile.category,
    ],
    ["Gender", profile.gender],
    ["Home University", profile.homeState],
    ["PWD", profile.isPWD],
    ["Defense Ward", profile.isDefenseWard],
    ["Merit Rank", formatRank(profile.rank)],
  ];

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
  stream: "",
  category: "",
  gender: "",
  homeState: "",
  isPWD: "No",
  isDefenseWard: "No",
  rank: "",
};

const defaultState = {
  step: "info",
  profile: defaultProfile,
  choices: [],
  locked: false,
  // undefined = not computed yet; null = computed, nothing reachable;
  // otherwise { index, choice, closingRank } — see getAllotmentResult.
  result: undefined,
};

function loadPersistedState() {
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

// Which profile fields decide catalog MEMBERSHIP (so a refetch only happens
// when one of these changes) — rank is deliberately excluded: it only
// decides reachability, computed client-side against each entry's own
// closingRank, never what's in the catalog.
const catalogKeyFor = (profile) =>
  JSON.stringify({
    stream: profile.stream,
    category: profile.category,
    gender: profile.gender,
    homeState: profile.homeState,
    isPWD: profile.isPWD,
    isDefenseWard: profile.isDefenseWard,
  });

const choiceItemKey = (item) => `${item.institute}|${item.program}`;

// Thin wrapper pinning the shared component's itemKey to the institute|
// program shape used throughout this file.
const Reorderable = (props) => (
  <ReorderableChoiceList itemKey={choiceItemKey} {...props} />
);

const MhtcetMockAllotment = ({ onChangeExam }) => {
  const [state, setState] = useState(defaultState);
  const [hydrated, setHydrated] = useState(false);

  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const loadedKeyRef = useRef(null);

  const [search, setSearch] = useState("");

  useEffect(() => {
    setState(loadPersistedState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const profileValid = Boolean(
    state.profile.stream &&
      state.profile.category &&
      state.profile.gender &&
      state.profile.homeState &&
      state.profile.isPWD &&
      state.profile.isDefenseWard &&
      Number(state.profile.rank) > 0
  );

  const catalogKey = catalogKeyFor(state.profile);

  // Fetch (or re-fetch, if stream/category/gender/homeState/PWD/Defense
  // changed) the catalog once the profile is complete. Server-side filtered
  // — see loadMhtcetCatalog — so this never ships the 23 MB source file.
  useEffect(() => {
    if (state.step === "info" || !profileValid) return;
    if (loadedKeyRef.current === catalogKey) return;
    loadedKeyRef.current = catalogKey;
    setCatalog(null);
    setCatalogError("");
    setCatalogLoading(true);
    loadMhtcetCatalog(state.profile)
      .then(setCatalog)
      .catch((err) =>
        setCatalogError(err.message || "Could not load MHT CET data.")
      )
      .finally(() => setCatalogLoading(false));
  }, [state.step, profileValid, catalogKey, state.profile]);

  const filteredCatalog = useMemo(() => {
    if (!catalog) return [];
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return catalog;
    return catalog.filter((item) => {
      const haystack = `${item.institute} ${item.program}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [catalog, search]);

  const chosenKeys = useMemo(
    () => new Set(state.choices.map(choiceItemKey)),
    [state.choices]
  );

  const setStep = (step) => setState((s) => ({ ...s, step }));
  const setProfile = (patch) =>
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const addChoice = (item) => {
    setState((s) => {
      const key = choiceItemKey(item);
      if (s.choices.some((c) => choiceItemKey(c) === key)) return s;
      return { ...s, choices: [...s.choices, item] };
    });
  };
  const removeChoice = (index) => {
    setState((s) => ({
      ...s,
      choices: s.choices.filter((_, i) => i !== index),
    }));
  };
  // See JosaaMockAllotment's reorderChoices for why `gapIndex` (a position
  // BETWEEN items, 0..choices.length) rather than a plain target index.
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
  const moveChoiceUp = (index) => reorderChoices(index, Math.max(0, index - 1));
  const moveChoiceDown = (index) => reorderChoices(index, index + 2);

  const lockChoices = () =>
    setState((s) => ({
      ...s,
      locked: true,
      result: getAllotmentResult(s.choices, Number(s.profile.rank)),
      step: "simulate",
    }));

  // Purely cosmetic processing beat, same trick as JosaaMockAllotment's
  // runWithDelay — no real async work happens here.
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
    setCatalog(null);
    setCatalogError("");
    loadedKeyRef.current = null;
    setSearch("");
  };

  if (!hydrated) return null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-center text-2xl font-bold text-[#3a2c28] md:text-3xl">
        MHT CET Mock Allotment
      </h1>
      <p className="mt-2 text-center text-sm text-[#6d5550]">
        Fill your choices, lock them, and see the seat you'd be allotted at
        MHT-CET CAP's final round.
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
          loading={catalogLoading}
          error={catalogError}
          catalog={filteredCatalog}
          totalCatalogSize={catalog?.length ?? 0}
          chosenKeys={chosenKeys}
          choices={state.choices}
          search={search}
          setSearch={setSearch}
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
              "Locking your choices and finding your allotted seat…",
              1200,
              lockChoices
            )
          }
          onProceed={() =>
            runWithDelay("Returning to your result…", 600, () =>
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
          result={state.result}
          catalog={catalog}
          profile={state.profile}
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
      {/* Deliberately no cutoff shown here — this is a practice mock, not the
          predictor. Real MHT-CET CAP doesn't show it while filling either. */}
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

const InfoStep = ({ profile, setProfile, onNext, valid }) => (
  <div className={`${cardClass} mt-6`}>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={streamField.label}>
        <Dropdown
          options={toOptions(streamField.options)}
          selectedValue={profile.stream || null}
          onChange={(o) => setProfile({ stream: o.value })}
          placeholder="Select…"
          isSearchable={false}
        />
      </Field>

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

      <Field label={homeStateField.label}>
        <Dropdown
          options={toOptions(homeStateField.options)}
          selectedValue={profile.homeState || null}
          onChange={(o) => setProfile({ homeState: o.value })}
          placeholder="Select…"
          hideValueWhileSearching
        />
      </Field>

      <Field label={pwdField.label}>
        <Dropdown
          options={toOptions(pwdField.options)}
          selectedValue={profile.isPWD}
          onChange={(o) => setProfile({ isPWD: o.value })}
          isSearchable={false}
        />
      </Field>

      <Field label={defenseField.label}>
        <Dropdown
          options={toOptions(defenseField.options)}
          selectedValue={profile.isDefenseWard}
          onChange={(o) => setProfile({ isDefenseWard: o.value })}
          isSearchable={false}
        />
      </Field>

      <Field label={mhtCetConfig.primaryInput.label}>
        <input
          type="number"
          min="1"
          className={rankInputClass}
          value={profile.rank}
          onChange={(e) => setProfile({ rank: e.target.value })}
          placeholder={mhtCetConfig.primaryInput.placeholder}
        />
      </Field>
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

const ChoicesStep = ({
  loading,
  error,
  catalog,
  totalCatalogSize,
  chosenKeys,
  choices,
  search,
  setSearch,
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

      <div className="mt-3">
        <input
          className={inputClass}
          placeholder="Search an institute or branch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-3 max-h-96 overflow-y-auto rounded-lg border border-[#f0e6e1]">
        {loading && (
          <p className="p-4 text-sm text-[#7a655f]">Loading MHT CET data…</p>
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
              key={choiceItemKey(item)}
              item={item}
              added={chosenKeys.has(choiceItemKey(item))}
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
              key={choiceItemKey(item)}
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
  // Purely cosmetic confirmation — reordering/removing already saves to
  // state (and localStorage) immediately, same reasoning as JoSAA's.
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
              key={choiceItemKey(item)}
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
              Proceed to Result →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// One-shot result — no rounds to play, so this is the only outcome screen
// (unlike JoSAA's RoundCard, which distinguishes provisional-vs-final).
const ResultCard = ({ result, choicesCount }) => {
  if (!result) {
    return (
      <div className={cardClass}>
        <p className="text-sm text-[#7a655f]">
          Based on this rank and this list, no seat was reachable at the
          final round. Go back and add more (or less competitive) choices, or
          double check your rank.
        </p>
      </div>
    );
  }
  const { choice, index, closingRank } = result;
  return (
    <div className="rounded-xl border-2 border-[#1f8a5b]/40 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={22} className="shrink-0 text-[#1f8a5b]" />
        <p className="text-sm font-black uppercase tracking-wide text-[#1f8a5b]">
          Seat allotted
        </p>
        <span className="text-xs font-semibold text-[#8a6d63]">
          · CAP final round
        </span>
      </div>
      <p className="mt-2 text-xl font-black text-[#2f2320]">
        {choice.institute}
      </p>
      <p className="mt-0.5 text-sm text-[#5b4a45]">{choice.program}</p>
      <p className="mt-2 text-xs text-[#7a655f]">
        Your preference #{index + 1} of {choicesCount} · Closing rank{" "}
        {formatRank(closingRank)}
      </p>
    </div>
  );
};

const SimulateStep = ({ locked, choices, result, catalog, profile, onRestart }) => {
  if (!locked) {
    return (
      <div className={`${cardClass} mt-6`}>
        <p className="text-sm text-[#7a655f]">
          Lock your choices first to see your result.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <ProfileChips profile={profile} />
      <ResultCard result={result} choicesCount={choices.length} />

      {/* the analyzer needs the loaded catalog — on a reload of a finished
          run it arrives a beat after the page does */}
      {catalog && catalog.length > 0 && (
        <>
          <div className="pt-2 text-center">
            <p className="text-sm font-semibold text-[#7a635d]">
              How strong was your list?
            </p>
          </div>
          <MhtcetListAnalyzer
            choices={choices}
            catalog={catalog}
            rank={Number(profile.rank)}
          />
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-[#eaded8] pt-4">
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

export default MhtcetMockAllotment;

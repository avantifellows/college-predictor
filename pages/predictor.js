import React, { useEffect, useState } from "react";
import Link from "next/link";
import getConstants from "../constants";
import examConfigs from "../examConfig";
import { useRouter } from "next/router";
import Head from "next/head";
import dynamic from "next/dynamic";
import TneaScoreCalculator from "../components/TneaScoreCalculator";
import CuetScoreInput from "../components/CuetScoreInput";
import { readProfile, profileDefaultsForFields } from "../utils/portalSession";
import BackLink from "../components/BackLink";
import {
  PREDICTOR_EXAMS,
  allStreams,
  counsellingLabel,
  examsInStream,
  routeForKey,
} from "../utils/predictorRoutes";

// Dynamically import Dropdown with SSR disabled
const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

const defaultPrimaryInputConfig = {
  label: "Enter Rank",
  placeholder: "Enter your rank",
  step: "1",
  min: "1",
  allowDecimal: false,
};

// An exam may refine its primary input based on what has been picked so far, via
// an optional `refinePrimaryInput(config, formData)` hook. GUJCET needs it: its
// Engineering/Pharmacy cutoffs are a 0-100 composite percentile, but Medical
// cutoffs are raw NEET marks out of 720. One fixed 0-100 field made the input
// lie about what it wanted and silently capped medical students at 100, so they
// could never reach the ~2/3 of medical rows above that.
const getPrimaryInputConfig = (exam, formData = null) => {
  const base = examConfigs[exam]?.primaryInput || defaultPrimaryInputConfig;
  const refine = examConfigs[exam]?.refinePrimaryInput;
  if (!refine || !formData) return base;
  return refine(base, formData) || base;
};

const validatePrimaryInputValue = (exam, value, formData = null) => {
  if (value === "") return "";

  const inputConfig = getPrimaryInputConfig(exam, formData);
  const numericValue = Number(value);
  const rangeMessage =
    inputConfig.max !== undefined
      ? `Please enter a value between ${inputConfig.min} and ${inputConfig.max}.`
      : inputConfig.label.toLowerCase().includes("rank") &&
        inputConfig.min === "1"
      ? "Please enter a rank greater than 0."
      : `Please enter a value greater than or equal to ${inputConfig.min}.`;

  if (Number.isNaN(numericValue)) {
    return "Please enter a valid value.";
  }

  if (inputConfig.min !== undefined && numericValue < Number(inputConfig.min)) {
    return rangeMessage;
  }

  if (inputConfig.max !== undefined && numericValue > Number(inputConfig.max)) {
    return rangeMessage;
  }

  return "";
};

const normalizePrimaryInputValue = (exam, value, formData = null) => {
  if (value === "") return "";
  const inputConfig = getPrimaryInputConfig(exam, formData);
  if (inputConfig.allowDecimal) {
    return value;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "";
  return String(Math.floor(numericValue));
};

const getCleanQueryEntries = (data) =>
  Object.entries(data).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );

const josaaEstimationSupportedCategories = new Set([
  "OPEN",
  "OBC-NCL",
  "SC",
  "ST",
  "EWS",
]);

const isJosaaEstimationSupportedCategory = (category) =>
  josaaEstimationSupportedCategories.has(category);

const josaaPwdEstimateError =
  "Rank estimation is currently unavailable for PwD categories. Please switch to 'No, I know my rank' and enter your rank directly.";

const ExamForm = () => {
  const [selectedExam, setSelectedExam] = useState("");
  const [formData, setFormData] = useState({});
  // the live form, for handlers that take an override under the same name
  const formDataState = formData;
  const [config, setConfig] = useState(null);
  const [rankError, setRankError] = useState("");
  const [primaryInputError, setPrimaryInputError] = useState("");
  const [rankMode, setRankMode] = useState("estimate");
  // "mine" = colleges for my rank / marks, "full" = every cutoff (design's gate)
  const [view, setView] = useState(null);
  // stream -> exam -> counselling (utils/predictorRoutes); the counselling
  // names the examConfigs key held in selectedExam
  const [examsById, setExamsById] = useState(null);
  const [stream, setStream] = useState("");
  const [routeExam, setRouteExam] = useState(null);
  const [counselling, setCounselling] = useState(null);
  // JoSAA: how the student gives each score
  const [mainKind, setMainKind] = useState("rank"); // rank | marks | percentile
  const [advKind, setAdvKind] = useState("rank"); // rank | marks
  const [marksInput, setMarksInput] = useState("");
  const [marksError, setMarksError] = useState("");
  const [percentileInput, setPercentileInput] = useState("");
  const [percentileError, setPercentileError] = useState("");
  const [estimateError, setEstimateError] = useState("");
  const [estimatedRank, setEstimatedRank] = useState(null);
  const [estimatedPercentile, setEstimatedPercentile] = useState(null);
  // JEE Advanced marks -> category rank (JoSAA estimate mode, qualified = Yes)
  const [advMarksInput, setAdvMarksInput] = useState("");
  const [advMarksError, setAdvMarksError] = useState("");
  const [estimatedAdvRank, setEstimatedAdvRank] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  // NEET home-state -> that state's own category codes (for the optional
  // home-state category dropdown). Loaded once when NEET is selected.
  const [neetStateCategories, setNeetStateCategories] = useState(null);
  const router = useRouter();

  // The Exams tab's records give each exam its streams.
  useEffect(() => {
    fetch("/data/exams/exams.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) =>
        setExamsById(Object.fromEntries(rows.map((e) => [e.exam_id, e])))
      )
      .catch(() => setExamsById({}));
  }, []);

  // Deep links from the Exams tab (/predictor?exam=KCET&examId=kea-cet)
  // preselect stream, exam and counselling — through the same handlers a
  // click uses, so per-exam form initialisation happens.
  useEffect(() => {
    const key = router.isReady && router.query.exam;
    if (!key || !examConfigs[key] || !examsById || counselling) return;
    const route = routeForKey(String(key), examsById, router.query.examId);
    if (!route) return;
    setStream(route.stream);
    setRouteExam(route.exam);
    selectCounselling(
      route.counselling,
      router.query.examId === "jee-advanced" ? "Yes" : ""
    );
    // "Edit inputs" on the results page links back with every answer in the
    // URL: refill them, after the counselling's own defaults
    const q = router.query;
    const restored = {};
    for (const name of [
      ...(examConfigs[key].fields || []).map((f) => f.name),
      "qualifiedJeeAdv",
      "mainRank",
      "advRank",
      "rank",
      "scores",
      "physicsMarks",
      "chemistryMarks",
      "mathsMarks",
    ]) {
      if (q[name] !== undefined && q[name] !== "")
        restored[name] = String(q[name]);
    }
    if (Object.keys(restored).length) {
      setFormData((prev) => ({ ...prev, ...restored }));
    }
    if (q.view === "full") setView("full");
    else if (restored.mainRank || restored.rank || restored.scores) {
      setView("mine");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, examsById]);

  const handleExamChange = (selectedOption) => {
    setSelectedExam(selectedOption.value);
    setConfig(examConfigs[selectedOption.value]);
    setPrimaryInputError("");
    const baseFormData = {
      exam: selectedOption.value,
      rank: "",
    };
    if (selectedOption.code !== undefined) {
      baseFormData.code = selectedOption.code;
    }
    if (selectedOption.value === "JoSAA") {
      baseFormData.qualifiedJeeAdv = "No";
      baseFormData.rankMode = "estimate";
      setRankMode("estimate");
    } else if (selectedOption.value === "NEETUG") {
      // Rank-only for now: the marks->rank estimator was fitted on 2025 data and
      // the 2026 score-rank spread differs materially (same score maps to a very
      // different AIR), so marks estimation is disabled per Amogh (2026-07-20)
      // until we handle year-to-year difficulty variance. Students enter their
      // known AIR directly.
      baseFormData.rankMode = "known";
      setRankMode("known");
      // Load each state's own category codes for the optional dropdown.
      if (!neetStateCategories) {
        fetch("/data/NEETUG/neet_state_categories.json")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => data && setNeetStateCategories(data))
          .catch(() => {});
      }
    } else {
      setRankMode("known");
    }
    setMarksInput("");
    setMarksError("");
    setPercentileInput("");
    setPercentileError("");
    setEstimateError("");
    setEstimatedRank(null);
    setEstimatedPercentile(null);
    // Avanti students arriving from the portal get category / gender / home
    // state pre-selected; anyone can still change them.
    Object.assign(
      baseFormData,
      profileDefaultsForFields(
        readProfile(),
        examConfigs[selectedOption.value]?.fields || []
      )
    );
    setFormData(baseFormData);
  };

  const handleInputChange = (name) => (selectedOption) => {
    const newFormData = {
      ...formData,
      [name]: selectedOption.label,
    };

    // If this is JoSAA exam and the user is changing qualifiedJeeAdv
    if (selectedExam === "JoSAA" && name === "qualifiedJeeAdv") {
      // If they select "No", remove advRank if it exists
      if (selectedOption.label === "No" && newFormData.advRank) {
        delete newFormData.advRank;
      }
    }

    // A dropdown can change what the primary input is allowed to be — GUJCET's
    // valid range is 0-100 for Engineering/Pharmacy but 0-720 for Medical. Without
    // this, typing 545 under Medical and then switching to Engineering left an
    // out-of-range value sitting behind a cleared error message, and Submit
    // enabled. Re-validate against the newly selected options.
    const currentPrimaryValue =
      selectedExam === "JoSAA" ? newFormData.mainRank : newFormData.rank;
    if (currentPrimaryValue) {
      setPrimaryInputError(
        validatePrimaryInputValue(
          selectedExam,
          currentPrimaryValue,
          newFormData
        )
      );
    }

    setFormData(newFormData);
  };

  // NEET marks -> All India Rank. Simpler than JoSAA: NEET has a single AIR
  // (no separate category rank), so the estimate becomes formData.rank directly.
  const handleNeetEstimateRank = async () => {
    if (marksInput === "") {
      setMarksError("Please enter your NEET marks.");
      return;
    }
    if (marksError) return;

    setIsEstimating(true);
    setEstimateError("");
    try {
      const response = await fetch("/api/neet-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marks: Number(marksInput) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setEstimateError(data.error || "Unable to estimate rank.");
        return;
      }
      setEstimatedRank(data.allIndiaRank);
      setEstimatedPercentile(null);
      setFormData((prevData) => ({
        ...prevData,
        rank: String(data.allIndiaRank),
        rankMode: "estimate",
      }));
    } catch (error) {
      setEstimateError("Unable to estimate rank right now.");
    } finally {
      setIsEstimating(false);
    }
  };

  // Resolved once per render: for GUJCET this changes with the selected program
  // (0-100 composite percentile vs 0-720 raw NEET marks for Medical).
  const primaryInputConfig = getPrimaryInputConfig(selectedExam, formData);

  const handleRankChange = (e) => {
    const enteredRank = normalizePrimaryInputValue(
      selectedExam,
      e.target.value,
      formData
    );
    const validationError = validatePrimaryInputValue(
      selectedExam,
      enteredRank,
      formData
    );
    const newFormData = {
      ...formData,
    };

    // If this is JoSAA exam, set mainRank directly instead of using rank
    if (selectedExam === "JoSAA") {
      newFormData.mainRank = enteredRank;
    } else {
      // For other exams, use the general rank parameter
      newFormData.rank = enteredRank;
    }

    setPrimaryInputError(validationError);
    setFormData(newFormData);
  };

  const handleAdvancedRankChange = (e) => {
    let enteredRank = e.target.value;

    // Validate input format: must be a positive integer or positive integer followed by 'P' or 'p'
    const isValidFormat = /^\d+[pP]?$/.test(enteredRank) || enteredRank === "";

    if (!isValidFormat) {
      setRankError("Please enter a valid rank (e.g., 104 or 104P)");
    } else {
      setRankError("");
    }

    // Convert lowercase 'p' to uppercase 'P' if it's the last character
    if (enteredRank.endsWith("p")) {
      enteredRank = enteredRank.slice(0, -1) + "P";
    }

    setFormData((prevData) => ({
      ...prevData,
      advRank: enteredRank,
    }));
  };

  const handleTneaScoreChange = (score, physics, chemistry, maths) => {
    setFormData((prevData) => ({
      ...prevData,
      rank: score,
      physicsMarks: physics,
      chemistryMarks: chemistry,
      mathsMarks: maths,
    }));
  };

  const hasMissingConfiguredFields = () => {
    if (!config?.fields) return true;
    // Optional fields (e.g. NEET's home-state category) don't block submit.
    return config.fields.some(
      (field) => !field.optional && !formData[field.name]
    );
  };

  const handleSubmit = async (dataOverride) => {
    const formData = dataOverride?.exam ? dataOverride : formDataState;
    // For JoSAA exam
    if (selectedExam === "JoSAA") {
      // Validate mainRank is provided
      if (!formData.mainRank || formData.mainRank === "") {
        alert("Please enter your JEE Main rank.");
        return;
      }

      // Validate JEE Advanced rank if user selected Yes for JEE Advanced qualification
      if (
        formData.qualifiedJeeAdv === "Yes" &&
        (!formData.advRank || formData.advRank === "")
      ) {
        alert(
          "Please enter your JEE Advanced rank since you qualified for JEE Advanced."
        );
        return;
      }

      // Remove general rank parameter for JoSAA if it exists
      const cleanedFormData = { ...formData };
      if (cleanedFormData.rank) {
        delete cleanedFormData.rank;
      }

      const queryString = getCleanQueryEntries(cleanedFormData)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
      router.push(`/college_predictor?${queryString}`);
    } else {
      // For other exams, proceed as usual
      if (primaryInputError) {
        alert(primaryInputError);
        return;
      }
      const queryString = getCleanQueryEntries(formData)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
      router.push(`/college_predictor?${queryString}`);
    }
  };

  // JoSAA submits through submitJosaa (it may estimate ranks first)
  const onSubmitClick = () => handleSubmit();

  const isSubmitDisabled = () => {
    // CUET: the paper scores stand in for the rank
    if (config?.scoreInput === "cuet") {
      return !formData.scores || hasMissingConfiguredFields();
    }
    // For TNEA exam
    if (selectedExam === "TNEA") {
      return (
        !formData.rank || formData.rank === "" || hasMissingConfiguredFields()
      );
    }

    // For JoSAA exam with JEE Advanced qualification
    if (selectedExam === "JoSAA") {
      // Basic validation for all JoSAA fields
      const requiredFields = [
        "exam",
        "category",
        "gender",
        "program",
        "homeState",
        "qualifiedJeeAdv",
        "mainRank",
      ];
      const missingRequiredField = requiredFields.some(
        (field) => !formData[field]
      );

      // If user qualified for JEE Advanced, also require advRank
      if (formData.qualifiedJeeAdv === "Yes") {
        return (
          missingRequiredField || !formData.advRank || formData.advRank === ""
        );
      }

      return (
        missingRequiredField || !formData.mainRank || formData.mainRank === ""
      );
    }

    // For all other exams
    return (
      !!primaryInputError ||
      !formData.rank ||
      formData.rank === "" ||
      formData.rank === 0 ||
      hasMissingConfiguredFields()
    );
  };

  // "See the full list of cutoffs": the profile fields only, no rank, so the
  // results list every cutoff (the API's view=full).
  const handleFullListSubmit = () => {
    const query = { exam: formData.exam, code: formData.code, view: "full" };
    for (const field of config?.fields || []) {
      if (formData[field.name]) query[field.name] = formData[field.name];
    }
    const queryString = getCleanQueryEntries(query)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    router.push(`/college_predictor?${queryString}`);
  };

  // ---- stream -> exam -> counselling ----------------------------------

  const resetInputs = () => {
    setView(null);
    setMainKind("rank");
    setAdvKind("rank");
    setAdvMarksInput("");
    setAdvMarksError("");
    setEstimatedAdvRank(null);
  };

  const clearCounselling = () => {
    setCounselling(null);
    setSelectedExam("");
    setConfig(null);
    setFormData({});
    resetInputs();
  };

  const selectCounselling = (c, qualifiedJeeAdv = "") => {
    setCounselling(c);
    resetInputs();
    if (!c?.key) {
      setSelectedExam("");
      setConfig(null);
      setFormData({});
      return;
    }
    handleExamChange({ value: c.key, code: examConfigs[c.key].code });
    if (c.key === "JoSAA") {
      // the form asks for each rank (or marks) itself, so it starts from
      // "known" and only estimates what the student gives as marks
      setRankMode("known");
      setFormData((prev) => ({
        ...prev,
        rankMode: "known",
        qualifiedJeeAdv,
      }));
    }
  };

  const handleStreamChange = (option) => {
    setStream(option.value);
    setRouteExam(null);
    clearCounselling();
  };

  const handleRouteExamChange = (option) => {
    const exam = PREDICTOR_EXAMS.find((e) => e.id === option.value);
    setRouteExam(exam);
    // one counselling: nothing to choose
    if (exam.counsellings.length === 1) selectCounselling(exam.counsellings[0]);
    else clearCounselling();
  };

  // ---- JoSAA: JEE Main and JEE Advanced inputs --------------------------

  const qualifiedAdv = formData.qualifiedJeeAdv === "Yes";
  const needsMainEstimate = mainKind !== "rank";
  const needsAdvEstimate = qualifiedAdv && advKind === "marks";
  const canEstimate = isJosaaEstimationSupportedCategory(formData.category);

  const handleMainKindChange = (kind) => {
    setMainKind(kind);
    setMarksInput("");
    setMarksError("");
    setPercentileInput("");
    setPercentileError("");
    setPrimaryInputError("");
    setEstimatedRank(null);
    setEstimatedPercentile(null);
    setEstimateError("");
    setFormData((prev) => ({ ...prev, mainRank: "" }));
  };

  const handleAdvKindChange = (kind) => {
    setAdvKind(kind);
    setAdvMarksInput("");
    setAdvMarksError("");
    setRankError("");
    setEstimatedAdvRank(null);
    setEstimateError("");
    setFormData((prev) => {
      const next = { ...prev };
      delete next.advRank;
      return next;
    });
  };

  // marks or percentile typed: the last estimate is stale
  const handleMainScoreChange = (kind) => (e) => {
    const value = e.target.value;
    const n = Number(value);
    const ok =
      kind === "marks"
        ? Number.isInteger(n) && n >= 0 && n <= 300
        : n >= 0 && n <= 100;
    const error =
      value === "" || ok
        ? ""
        : kind === "marks"
        ? "Please enter marks between 0 and 300."
        : "Please enter percentile between 0 and 100.";
    if (kind === "marks") {
      setMarksInput(value);
      setMarksError(error);
    } else {
      setPercentileInput(value);
      setPercentileError(error);
    }
    setEstimatedRank(null);
    setEstimatedPercentile(null);
    setEstimateError("");
    setFormData((prev) => ({ ...prev, mainRank: "" }));
  };

  const handleAdvScoreChange = (e) => {
    const value = e.target.value;
    const n = Number(value);
    setAdvMarksInput(value);
    setAdvMarksError(
      value === "" || (Number.isInteger(n) && n >= 0 && n <= 360)
        ? ""
        : "Please enter marks between 0 and 360."
    );
    setEstimatedAdvRank(null);
    setEstimateError("");
    setFormData((prev) => {
      const next = { ...prev };
      delete next.advRank;
      return next;
    });
  };

  // A new category or JEE Advanced answer changes what an estimate means
  useEffect(() => {
    setEstimatedRank(null);
    setEstimatedPercentile(null);
    setEstimatedAdvRank(null);
    setEstimateError("");
  }, [formData.category, formData.qualifiedJeeAdv]);

  // Turns whatever was given as marks into ranks (/api/jee-predict for JEE
  // Main, /api/jee-adv-estimate for JEE Advanced). Returns the form with the
  // ranks filled in, or null if an estimate failed.
  const estimateJosaaRanks = async () => {
    setEstimateError("");
    const next = {
      ...formData,
      rankMode: needsMainEstimate ? "estimate" : "known",
    };
    if (!qualifiedAdv) delete next.advRank;
    if (!needsMainEstimate && !needsAdvEstimate) return next;
    if (!canEstimate) {
      setEstimateError(josaaPwdEstimateError);
      return null;
    }
    setIsEstimating(true);
    try {
      if (needsMainEstimate) {
        const res = await fetch("/api/jee-predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marks: mainKind === "marks" ? Number(marksInput) : undefined,
            percentile:
              mainKind === "percentile" ? Number(percentileInput) : undefined,
            category: formData.category,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setEstimateError(data.error || "Unable to estimate rank.");
          return null;
        }
        next.mainRank = String(data.categoryRank);
        setEstimatedRank(data.categoryRank);
        setEstimatedPercentile(data.percentile);
      }
      if (needsAdvEstimate) {
        const res = await fetch("/api/jee-adv-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marks: Number(advMarksInput),
            category: formData.category,
          }),
        });
        const adv = await res.json();
        if (!res.ok) {
          setEstimateError(adv.error || "Unable to estimate rank.");
          return null;
        }
        next.advRank = String(adv.rank);
        setEstimatedAdvRank(adv.rank);
      }
      setFormData(next);
      return next;
    } catch (error) {
      setEstimateError("Unable to estimate rank right now.");
      return null;
    } finally {
      setIsEstimating(false);
    }
  };

  const josaaFieldsReady = [
    "category",
    "gender",
    "program",
    "homeState",
    "qualifiedJeeAdv",
  ].every((f) => formData[f]);
  const mainReady =
    mainKind === "rank"
      ? !!formData.mainRank && !primaryInputError
      : mainKind === "marks"
      ? marksInput !== "" && !marksError
      : percentileInput !== "" && !percentileError;
  const advReady =
    !qualifiedAdv ||
    (advKind === "rank"
      ? !!formData.advRank && !rankError
      : advMarksInput !== "" && !advMarksError);

  const submitJosaa = async () => {
    const next = await estimateJosaaRanks();
    if (next) handleSubmit(next);
  };

  // ---- presentation -----------------------------------------------------

  const fieldLabelClass =
    "mb-1.5 block text-xs font-bold tracking-[0.04em] text-[#4a3a36]";
  const inputClass = (hasError) =>
    `w-full min-h-[46px] rounded-[10px] border-[1.5px] bg-white px-3.5 py-[11px] text-[15px] text-[#2f2320] outline-none transition focus:ring-[3px] focus:ring-[#fbeeec] ${
      hasError
        ? "border-red-500 focus:border-red-500"
        : "border-[#e0cdc6] focus:border-[#B52326]"
    }`;
  const gateButtonClass = (on) =>
    `rounded-xl border-[1.5px] px-[26px] py-3.5 text-[15px] font-extrabold transition ${
      on
        ? "border-[#B52326] bg-[#B52326] text-white"
        : "border-[#d8c7c1] bg-[#fffdfa] text-[#5b3a34] hover:border-[#B52326] hover:text-[#B52326]"
    }`;
  const kindButtonClass = (on) =>
    `rounded-[10px] border-[1.5px] px-5 py-2.5 text-sm font-extrabold transition ${
      on
        ? "border-[#B52326] bg-[#B52326] text-white"
        : "border-[#d8c7c1] bg-[#fffdfa] text-[#5b3a34] hover:border-[#B52326] hover:text-[#B52326]"
    }`;
  const blockNumberKeys = (allowDecimal) => (e) => {
    if (
      ["e", "E", "+", "-", " "].includes(e.key) ||
      (!allowDecimal && e.key === ".")
    ) {
      e.preventDefault();
    }
  };
  const mockTestNote =
    "If you haven't taken the exam yet, use your mock test marks.";

  const renderFormCard = (
    key,
    label,
    control,
    helperText = null,
    errorText = null,
    fullWidth = false
  ) => (
    // one flat form: a label over each control, no box around every
    // question (boxes inside a box read as clutter)
    <div key={key} className={`${fullWidth ? "col-span-full" : ""} text-left`}>
      {label && <label className={fieldLabelClass}>{label}</label>}
      {control}
      {helperText && (
        <p className="mt-2 text-xs leading-5 text-[#6d5550]">{helperText}</p>
      )}
      {errorText && <p className="mt-2 text-sm text-red-500">{errorText}</p>}
    </div>
  );

  const renderDropdownField = (field) =>
    renderFormCard(
      `${selectedExam}-${field.name}`,
      typeof field.label === "function" ? field.label(formData) : field.label,
      <Dropdown
        options={(field.dynamicOptionsByHomeState
          ? neetStateCategories?.[formData.homeState] || []
          : field.options
        ).map((option) =>
          typeof option === "string" ? { value: option, label: option } : option
        )}
        onChange={handleInputChange(field.name)}
        selectedValue={formData[field.name]}
        className="w-full"
      />,
      field.helperText
    );

  const renderFields = () => {
    if (!selectedExam || !config) return null;
    return (
      config.fields
        // JoSAA asks about JEE Advanced on its own, just before the inputs
        .filter((field) => field.name !== "qualifiedJeeAdv")
        // The NEET home-state category dropdown only makes sense once a home
        // state that we actually have state-quota data for is chosen.
        .filter((field) => {
          if (!field.dynamicOptionsByHomeState) return true;
          const hs = formData.homeState;
          return (
            hs &&
            hs !== "Other" &&
            Array.isArray(neetStateCategories?.[hs]) &&
            neetStateCategories[hs].length > 0
          );
        })
        .map(renderDropdownField)
    );
  };

  const renderKindToggle = (kinds, current, onChange) => (
    <div className="mb-3 flex flex-wrap gap-2.5">
      {kinds.map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          onClick={() => onChange(kind)}
          className={kindButtonClass(current === kind)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // JoSAA: JEE Main as Rank / Marks / Percentile, then (if qualified) JEE
  // Advanced as Rank / Marks. Marks become ranks through the estimators.
  const renderJosaaInputs = () => (
    <>
      <div className="col-span-full text-left">
        <span className={fieldLabelClass}>JEE Main</span>
        {renderKindToggle(
          [
            ["rank", "Rank"],
            ["marks", "Marks"],
            ["percentile", "Percentile"],
          ],
          mainKind,
          handleMainKindChange
        )}
        {mainKind === "rank"
          ? renderFormCard(
              "mainRank",
              `Enter your JEE Main ${
                formData.category ? formData.category + " " : ""
              }category rank`,
              <input
                type="number"
                step="1"
                min="1"
                value={formData.mainRank || ""}
                onChange={handleRankChange}
                onKeyDown={blockNumberKeys(false)}
                className={inputClass(primaryInputError)}
                placeholder="e.g. 4500"
              />,
              null,
              primaryInputError
            )
          : mainKind === "marks"
          ? renderFormCard(
              "mainMarks",
              `Enter your JEE Main marks (out of 300). ${mockTestNote}`,
              <input
                type="number"
                step="1"
                min="0"
                max="300"
                value={marksInput}
                onChange={handleMainScoreChange("marks")}
                onKeyDown={blockNumberKeys(false)}
                className={inputClass(marksError)}
                placeholder="e.g. 180"
              />,
              null,
              marksError
            )
          : renderFormCard(
              "mainPercentile",
              "Enter your JEE Main percentile (out of 100)",
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={percentileInput}
                onChange={handleMainScoreChange("percentile")}
                onKeyDown={blockNumberKeys(true)}
                className={inputClass(percentileError)}
                placeholder="e.g. 98.6"
              />,
              null,
              percentileError
            )}
      </div>

      {qualifiedAdv && (
        <div className="col-span-full text-left">
          <span className={fieldLabelClass}>JEE Advanced</span>
          {renderKindToggle(
            [
              ["rank", "Rank"],
              ["marks", "Marks"],
            ],
            advKind,
            handleAdvKindChange
          )}
          {advKind === "rank"
            ? renderFormCard(
                "advRank",
                config?.advancedInput?.label ||
                  "Enter JEE Advanced Category Rank",
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.advRank || ""}
                  onChange={handleAdvancedRankChange}
                  onKeyDown={blockNumberKeys(false)}
                  className={inputClass(rankError)}
                  placeholder={
                    config?.advancedInput?.placeholder || "e.g., 104 or 104P"
                  }
                />,
                "Enter rank (e.g., 104) or rank with 'P' suffix (e.g., 104P)",
                rankError
              )
            : renderFormCard(
                "advMarks",
                `Enter your JEE Advanced marks (out of 360). ${mockTestNote}`,
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="360"
                  value={advMarksInput}
                  onChange={handleAdvScoreChange}
                  onKeyDown={blockNumberKeys(false)}
                  className={inputClass(advMarksError)}
                  placeholder="e.g. 150"
                />,
                null,
                advMarksError
              )}
        </div>
      )}

      {(needsMainEstimate || needsAdvEstimate) && (
        <div className="col-span-full flex flex-col gap-2.5 text-left">
          {!canEstimate && formData.category ? (
            <p className="text-sm text-[#6d5550]">
              Rank prediction isn&apos;t available for PwD categories. Choose
              Rank and enter your rank directly.
            </p>
          ) : (
            !(estimatedRank || estimatedAdvRank) && (
              <button
                type="button"
                onClick={() => estimateJosaaRanks()}
                disabled={isEstimating || !mainReady || !advReady}
                className="self-start rounded-[10px] border-[1.5px] border-[#B52326] bg-white px-4 py-2 text-sm font-bold text-[#B52326] transition hover:bg-[#fbeeec] disabled:cursor-not-allowed disabled:border-[#e0cdc6] disabled:text-[#b9a8a2]"
              >
                {isEstimating ? "Estimating…" : "See my predicted rank"}
              </button>
            )
          )}
          {estimateError && (
            <p className="text-sm text-red-500">{estimateError}</p>
          )}
          {(estimatedRank || estimatedAdvRank) && (
            <div className="rounded-xl border border-[#eaded8] bg-[#fbeeec] px-[18px] py-4 text-[15px] text-[#5f514c]">
              {estimatedRank && (
                <span className="block">
                  Your predicted JEE Main {formData.category} category rank is{" "}
                  <b className="font-['Lato',sans-serif] text-[22px] text-[#2f2320]">
                    {Number(estimatedRank).toLocaleString("en-IN")}
                  </b>
                  {estimatedPercentile !== null && (
                    <span className="block text-sm">
                      Predicted percentile: <b>{estimatedPercentile}</b>
                    </span>
                  )}
                </span>
              )}
              {estimatedAdvRank && (
                <span className="mt-1 block">
                  Your predicted JEE Advanced {formData.category} category rank
                  is{" "}
                  <b className="font-['Lato',sans-serif] text-[22px] text-[#2f2320]">
                    {Number(estimatedAdvRank).toLocaleString("en-IN")}
                  </b>
                </span>
              )}
              <span className="mt-1.5 block text-[12.5px] leading-relaxed text-[#9b8a82]">
                Indicative only. JEE Main is estimated from 10k+ students&apos;
                results in 2024 and 2025, JEE Advanced from the official marks
                at each rank in 2025 and 2026. Your actual rank can differ.
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Every other exam has one input, defined by its config (a rank, or a score
  // for exams that admit on marks). TNEA and CUET have their own calculators.
  const renderSingleInput = () => {
    if (selectedExam === "TNEA") {
      return (
        <div className="col-span-full">
          <TneaScoreCalculator
            initialPhysics={formData.physicsMarks || ""}
            initialChemistry={formData.chemistryMarks || ""}
            initialMaths={formData.mathsMarks || ""}
            onScoreChange={handleTneaScoreChange}
          />
        </div>
      );
    }
    if (config?.scoreInput === "cuet") {
      return (
        <div className="col-span-full">
          <CuetScoreInput
            value={formData.scores || ""}
            onChange={(scores) => setFormData((prev) => ({ ...prev, scores }))}
          />
        </div>
      );
    }
    // NEET is rank-only for now (see handleExamChange); the marks estimator
    // in handleNeetEstimateRank is kept for when it is re-enabled.
    const isScore = /score|marks/i.test(primaryInputConfig.label);
    return renderFormCard(
      "primaryInput",
      primaryInputConfig.label,
      <input
        type="number"
        step={primaryInputConfig.step}
        min={primaryInputConfig.min}
        max={primaryInputConfig.max}
        value={formData.rank || ""}
        onChange={handleRankChange}
        onKeyDown={blockNumberKeys(primaryInputConfig.allowDecimal)}
        className={inputClass(primaryInputError)}
        placeholder={primaryInputConfig.placeholder}
      />,
      primaryInputConfig.helperText || (isScore ? mockTestNote : null),
      primaryInputError
    );
  };

  const isJosaa = selectedExam === "JoSAA";
  // name what the counselling takes: JoSAA ranks or marks, the rest one
  // input, a rank or a score
  const mineLabel = isJosaa
    ? "See colleges for my rank / marks"
    : config?.scoreInput ||
      selectedExam === "TNEA" ||
      /score|marks/i.test(primaryInputConfig.label)
    ? "See colleges for my score"
    : "See colleges for my rank";
  const submitDisabled =
    view === "full"
      ? hasMissingConfiguredFields()
      : isJosaa
      ? isEstimating || !josaaFieldsReady || !mainReady || !advReady
      : isSubmitDisabled();
  // JoSAA asks the JEE Advanced question once its profile is filled in
  const showGate = selectedExam && (!isJosaa || !!formData.qualifiedJeeAdv);

  const streamOptions = examsById
    ? allStreams(examsById).map((s) => ({ value: s, label: s }))
    : [];
  const examOptions =
    examsById && stream
      ? examsInStream(stream, examsById).map((e) => ({
          value: e.id,
          label: e.label,
        }))
      : [];
  const counsellingOptions = routeExam
    ? routeExam.counsellings.map((c) => ({
        value: c.label,
        label: counsellingLabel(c),
        soon: !c.key,
      }))
    : [];

  return (
    <>
      <Head>
        <title>{getConstants().TITLE} - Futures</title>
      </Head>
      <div className="flex min-h-[calc(100vh-120px)] flex-col">
        <div className="mt-6 flex w-full flex-col items-center justify-start px-4 pb-10 sm:mt-8">
          <div className="w-full max-w-[980px]">
            <BackLink />
          </div>
          <div className="mt-4 w-full max-w-[980px] sm:mt-6">
            <h1 className="mb-6 mt-1 text-center font-['Lato',sans-serif] text-[28px] font-black text-[#2f2320] sm:text-[40px]">
              {getConstants().TITLE}
            </h1>
            <div className="flex flex-col gap-[18px] rounded-[20px] border border-[#eaded8] bg-white px-5 py-6 shadow-[0_2px_8px_rgba(74,42,38,0.06)] sm:px-7 sm:py-[26px]">
              {/* TGEAPCET Disclaimer - Shows when EWS category is selected */}
              {selectedExam === "TGEAPCET" && formData.category === "EWS" && (
                <div className="w-full border-l-4 border-red-400 bg-red-50 p-4">
                  <p className="text-sm text-red-700">
                    Showing OC category data as EWS-specific data is limited.
                  </p>
                </div>
              )}

              <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                {renderFormCard(
                  "stream",
                  "Select stream",
                  <Dropdown
                    options={streamOptions}
                    onChange={handleStreamChange}
                    selectedValue={stream}
                    placeholder={examsById ? "Select..." : "Loading..."}
                    className="w-full"
                  />
                )}
                {stream &&
                  renderFormCard(
                    "routeExam",
                    "Select exam",
                    <Dropdown
                      key={stream}
                      options={examOptions}
                      onChange={handleRouteExamChange}
                      selectedValue={routeExam?.id}
                      className="w-full"
                    />
                  )}
                {routeExam &&
                  renderFormCard(
                    "counselling",
                    "Select counselling",
                    <Dropdown
                      key={routeExam.id}
                      options={counsellingOptions}
                      onChange={(option) =>
                        selectCounselling(
                          routeExam.counsellings.find(
                            (c) => c.label === option.value
                          )
                        )
                      }
                      selectedValue={counselling?.label}
                      formatOptionLabel={(option, { context }) =>
                        option.soon && context === "menu" ? (
                          <span>
                            {option.label}{" "}
                            <span className="text-xs text-[#9b8a82]">
                              · cutoffs coming soon
                            </span>
                          </span>
                        ) : (
                          option.label
                        )
                      }
                      className="w-full"
                    />
                  )}
              </div>

              {counselling && !counselling.key && (
                <div className="rounded-[20px] border border-[#eaded8] bg-[#fffdfa] px-5 py-4 text-left">
                  <div className="font-['Lato',sans-serif] text-xl font-black text-[#2f2320]">
                    {counselling.label} cutoffs are coming soon
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#6d5550]">
                    Futures doesn&apos;t have {counselling.label} cutoffs yet,
                    so we can&apos;t predict colleges for it. Pick another
                    counselling above
                    {routeExam?.examIds?.length ? (
                      <>
                        , or see{" "}
                        <Link
                          href={`/exams/${routeExam.examIds[0]}`}
                          className="font-semibold text-[#B52326] underline underline-offset-2"
                        >
                          {routeExam.label} dates and eligibility
                        </Link>
                      </>
                    ) : null}
                    .
                  </p>
                </div>
              )}

              {selectedExam && (
                <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                  {renderFields()}
                  {isJosaa &&
                    renderDropdownField(
                      config.fields.find((f) => f.name === "qualifiedJeeAdv")
                    )}
                </div>
              )}

              {showGate && (
                <div className="mt-1 text-left">
                  <span className={fieldLabelClass}>
                    What would you like to see?
                  </span>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setView("mine")}
                      className={gateButtonClass(view === "mine")}
                    >
                      {mineLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("full")}
                      className={gateButtonClass(view === "full")}
                    >
                      See the full list of cutoffs
                    </button>
                  </div>
                </div>
              )}

              {showGate && view === "mine" && (
                <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                  {isJosaa ? renderJosaaInputs() : renderSingleInput()}
                </div>
              )}

              {showGate && (
                <div className="text-left">
                  <button
                    type="button"
                    className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] bg-[#B52326] px-[26px] py-3.5 text-base font-bold text-white shadow-[0_1px_2px_rgba(74,42,38,0.05)] transition hover:-translate-y-px hover:bg-[#9E1F22] active:translate-y-0 active:bg-[#8A1B1E] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#e0cdc6] disabled:shadow-none"
                    disabled={!view || submitDisabled}
                    onClick={
                      view === "full"
                        ? handleFullListSubmit
                        : isJosaa
                        ? submitJosaa
                        : onSubmitClick
                    }
                  >
                    {isEstimating
                      ? "Finding your colleges…"
                      : view === "full"
                      ? "Show full list of cutoffs"
                      : "Show matching colleges"}
                    <span aria-hidden="true">→</span>
                  </button>
                  {view && submitDisabled && !isEstimating && (
                    <p className="mt-2 text-sm text-[#8f2e31]">
                      {view === "full" || (isJosaa && !josaaFieldsReady)
                        ? "Please fill all the required fields above."
                        : isJosaa && !mainReady
                        ? mainKind === "rank"
                          ? "Please enter your JEE Main rank."
                          : `Enter your JEE Main ${mainKind} to continue.`
                        : isJosaa && !advReady
                        ? advKind === "rank"
                          ? "Please enter your JEE Advanced rank."
                          : "Enter your JEE Advanced marks to continue."
                        : "Please fill all the required fields before submitting!"}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExamForm;

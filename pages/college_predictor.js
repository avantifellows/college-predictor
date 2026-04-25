import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import PredictedCollegeTables from "../components/PredictedCollegeTables";
import Head from "next/head";
import Fuse from "fuse.js";
import examConfigs from "../examConfig";
import dynamic from "next/dynamic";
import TneaScoreCalculator from "../components/TneaScoreCalculator";
import { debounce } from "lodash";
import { ChevronRight } from "lucide-react"; // Added ChevronRight import

// Dynamically import Dropdown with SSR disabled
const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// Base Fuse options - keys will be added dynamically based on exam
const baseFuseOptions = {
  isCaseSensitive: false,
  includeScore: false,
  shouldSort: false,
  includeMatches: false,
  findAllMatches: false,
  minMatchCharLength: 1,
  location: 0,
  threshold: 0.3,
  distance: 100,
  useExtendedSearch: true,
  ignoreLocation: true,
  ignoreFieldNorm: false,
  fieldNormWeight: 1,
};

// Default search keys fallback
const defaultSearchKeys = ["Institute", "State", "Academic Program Name"];

const defaultPrimaryInputConfig = {
  label: "Enter Rank",
  placeholder: "Enter your rank",
  step: "1",
  min: "0",
  allowDecimal: false,
};

const getPrimaryInputConfig = (exam) =>
  examConfigs[exam]?.primaryInput || defaultPrimaryInputConfig;

const validatePrimaryInputValue = (exam, value) => {
  if (value === "") return "";

  const inputConfig = getPrimaryInputConfig(exam);
  const numericValue = Number(value);
  const rangeMessage =
    inputConfig.max !== undefined
      ? `Please enter a value between ${inputConfig.min} and ${inputConfig.max}.`
      : `Please enter a value greater than or equal to ${inputConfig.min}.`;

  if (Number.isNaN(numericValue)) {
    return "Please enter a valid value.";
  }

  if (
    inputConfig.min !== undefined &&
    numericValue < Number(inputConfig.min)
  ) {
    return rangeMessage;
  }

  if (
    inputConfig.max !== undefined &&
    numericValue > Number(inputConfig.max)
  ) {
    return rangeMessage;
  }

  return "";
};

const normalizePrimaryInputValue = (exam, value) => {
  if (value === "") return "";
  const inputConfig = getPrimaryInputConfig(exam);
  if (inputConfig.allowDecimal) {
    return value;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "";
  return String(Math.floor(numericValue));
};

const getCleanQueryObject = (query) =>
  Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

const CollegePredictor = () => {
  const router = useRouter();
  const [filteredData, setFilteredData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queryObject, setQueryObject] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [rankMode, setRankMode] = useState("estimate");
  const [marksInput, setMarksInput] = useState("");
  const [marksError, setMarksError] = useState("");
  const [percentileInput, setPercentileInput] = useState("");
  const [percentileError, setPercentileError] = useState("");
  const [estimateInputType, setEstimateInputType] = useState("marks");
  const [estimateError, setEstimateError] = useState("");
  const [estimatedRank, setEstimatedRank] = useState(null);
  const [estimatedPercentile, setEstimatedPercentile] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [currentExam, setCurrentExam] = useState(null);
  const [showSelectionDetails, setShowSelectionDetails] = useState(false);
  const [primaryInputError, setPrimaryInputError] = useState("");

  useEffect(() => {
    // Initialize queryObject from router.query
    // Ensure that numeric values like rank are stored appropriately if needed
    const initialQuery = { ...router.query };
    if (initialQuery.rank && !isNaN(parseFloat(initialQuery.rank))) {
      initialQuery.rank = normalizePrimaryInputValue(
        initialQuery.exam,
        String(initialQuery.rank)
      );
    }
    if (initialQuery.mainRank && !isNaN(parseFloat(initialQuery.mainRank))) {
      initialQuery.mainRank = normalizePrimaryInputValue(
        "JoSAA",
        String(initialQuery.mainRank)
      );
    } else if (router.query.exam === "TNEA" && !initialQuery.rank) {
      // If TNEA and rank is not set, perhaps initialize from individual marks if they exist
      if (
        initialQuery.physicsMarks &&
        initialQuery.chemistryMarks &&
        initialQuery.mathsMarks
      ) {
        const p = parseFloat(initialQuery.physicsMarks);
        const c = parseFloat(initialQuery.chemistryMarks);
        const m = parseFloat(initialQuery.mathsMarks);
        if (!isNaN(p) && !isNaN(c) && !isNaN(m)) {
          initialQuery.rank = ((p / 100) * 50 + (c / 100) * 50 + m).toFixed(2);
        }
      }
    }
    setQueryObject(initialQuery);
  }, [router.query]);

  const [fuseInstance, setFuseInstance] = useState(null);
  useEffect(() => {
    if (fullData && fullData.length > 0 && queryObject.exam) {
      // Get search keys from exam config, fallback to defaults
      const examConfig = examConfigs[queryObject.exam];
      const searchKeys = examConfig?.searchKeys || defaultSearchKeys;
      const fuseOptions = { ...baseFuseOptions, keys: searchKeys };
      setFuseInstance(new Fuse(fullData, fuseOptions));
    }
  }, [fullData, queryObject.exam]);

  const handleSearchChange = (e) => {
    const currentSearchTerm = e.target.value;
    setSearchTerm(currentSearchTerm);

    if (currentSearchTerm.trim() === "") {
      setFilteredData(fullData);
      setError(null);
      return;
    }

    if (fullData.length > 0 && fuseInstance) {
      const result = fuseInstance.search(currentSearchTerm.trim());
      if (result.length === 0) {
        setFilteredData([]);
        setError(
          "No matches found for your search term within the current results."
        );
      } else {
        setFilteredData(result.map((r) => r.item));
        setError(null);
      }
    } else {
      setFilteredData([]);
      setError("No data to search. Apply filters to load predictions first.");
    }
  };

  const fetchData = async (query) => {
    setIsLoading(true);
    setError(null);
    setSearchTerm("");
    try {
      const params = new URLSearchParams(
        Object.entries(getCleanQueryObject(query))
      );
      const queryString = params.toString();
      if (queryString === "") {
        setIsLoading(false);
        return;
      }
      const response = await fetch(`/api/exam-result?${queryString}`);
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {}

        if (response.status === 429) {
          setError("Rate limit exceeded. Please try again later.");
        } else {
          setError(errorMessage);
        }
        setFullData([]);
        setFilteredData([]);
      } else {
        const data = await response.json();
        setFullData(data);
        setFilteredData(data);
        setError(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch college predictions. Please try again.");
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced version of router.push
  const debouncedRouterPush = useCallback(
    debounce((newQueryObject) => {
      // Ensure both mainRank and advRank are included in the query when appropriate
      let updatedQueryObject = { ...newQueryObject };

      // For JoSAA exam, handle mainRank and advRank
      if (updatedQueryObject.exam === "JoSAA") {
        if (!updatedQueryObject.rankMode) {
          updatedQueryObject.rankMode = rankMode;
        }
        // If rank is set but mainRank is not, use rank as mainRank
        if (updatedQueryObject.rank && !updatedQueryObject.mainRank) {
          updatedQueryObject.mainRank = updatedQueryObject.rank;
        }

        // If user didn't qualify for JEE Advanced, make sure advRank is not sent
        if (updatedQueryObject.qualifiedJeeAdv === "No") {
          delete updatedQueryObject.advRank;
        }
      }

      updatedQueryObject = getCleanQueryObject(updatedQueryObject);
      const params = new URLSearchParams(Object.entries(updatedQueryObject));
      const queryString = params.toString();
      router.push(`/college_predictor?${queryString}`, undefined, {
        shallow: true,
      });
      fetchData(updatedQueryObject); // Fetch data after route push
    }, 500),
    [router, rankMode] // router as dependency
  );

  const handleQueryObjectChange = (key) => (selectedOption) => {
    let newQueryObject = {
      ...queryObject,
      [key]: selectedOption.label,
    };
    if (
      queryObject.exam === "JoSAA" &&
      rankMode === "estimate" &&
      key === "category"
    ) {
      newQueryObject.mainRank = "";
      newQueryObject.rank = "";
      setEstimatedRank(null);
      setEstimatedPercentile(null);
      setEstimateError("");
    }
    setQueryObject(newQueryObject);
    debouncedRouterPush(newQueryObject);
  };

  const handleTneaScoreChange = (score, physics, chemistry, maths) => {
    const newQueryObject = {
      ...queryObject,
      rank: score,
      physicsMarks: physics,
      chemistryMarks: chemistry,
      mathsMarks: maths,
    };
    setQueryObject(newQueryObject);
    // Optimistically update queryObject, debouncedRouterPush will handle the actual route update and fetch
    debouncedRouterPush(newQueryObject);
  };

  const handleRankChange = (e) => {
    const value = normalizePrimaryInputValue(queryObject.exam, e.target.value);
    const validationError = validatePrimaryInputValue(queryObject.exam, value);
    let newQueryObject = {
      ...queryObject,
      rank: value,
      rankMode: "known",
    };
    // If JoSAA, set mainRank only if it's JEE Main rank
    if (queryObject.exam === "JoSAA" && !queryObject.qualifiedJeeAdv) {
      newQueryObject.mainRank = value;
    }
    setQueryObject(newQueryObject);
    setPrimaryInputError(validationError);
    if (!validationError || value === "") {
      debouncedRouterPush(newQueryObject);
    }
  };

  const [rankError, setRankError] = useState("");

  const handleJeeAdvancedRankChange = (e) => {
    let value = e.target.value;

    // Validate input format: must be a positive integer or positive integer followed by 'P' or 'p'
    const isValidFormat = /^\d+[pP]?$/.test(value);

    if (!isValidFormat && value !== "") {
      setRankError("Please enter a valid rank (e.g., 104 or 104P)");
      return;
    } else {
      setRankError("");
    }

    // Convert lowercase 'p' to uppercase 'P' if it's the last character
    if (value.endsWith("p")) {
      value = value.slice(0, -1) + "P";
    }

    let newQueryObject = {
      ...queryObject,
      advRank: value,
    };
    setQueryObject(newQueryObject);

    // Only proceed with debounced router push if input is valid
    if (isValidFormat) {
      debouncedRouterPush(newQueryObject);
    }
  };

  useEffect(() => {
    if (!queryObject.exam || queryObject.exam === currentExam) return;
    setCurrentExam(queryObject.exam);
    setPrimaryInputError("");
    if (queryObject.exam === "JoSAA") {
      if (queryObject.rankMode === "estimate" || queryObject.rankMode === "known") {
        setRankMode(queryObject.rankMode);
      } else {
        const hasAdvanced =
          queryObject.qualifiedJeeAdv === "Yes" ||
          (queryObject.advRank && queryObject.advRank !== "");
        const mainRankValue =
          queryObject.mainRank !== undefined
            ? queryObject.mainRank
            : queryObject.rank;
        const hasMainRank =
          mainRankValue !== undefined &&
          mainRankValue !== "" &&
          Number(mainRankValue) > 0;
        setRankMode(hasAdvanced || hasMainRank ? "known" : "estimate");
      }
      setMarksInput("");
      setMarksError("");
      setPercentileInput("");
      setPercentileError("");
      setEstimateInputType("marks");
      setEstimateError("");
      setEstimatedRank(null);
      setEstimatedPercentile(null);
    } else {
      setRankMode("known");
    }
  }, [
    queryObject.exam,
    queryObject.qualifiedJeeAdv,
    queryObject.advRank,
    queryObject.mainRank,
    queryObject.rankMode,
    queryObject.rank,
    currentExam,
  ]);

  const handleRankModeChange = (mode) => {
    setRankMode(mode);
    if (mode === "estimate") {
      const newQueryObject = {
        ...queryObject,
        qualifiedJeeAdv: "No",
        rankMode: "estimate",
      };
      delete newQueryObject.advRank;
      setQueryObject(newQueryObject);
      debouncedRouterPush(newQueryObject);
      setEstimatedRank(null);
      setEstimatedPercentile(null);
      setMarksInput("");
      setMarksError("");
      setPercentileInput("");
      setPercentileError("");
      setEstimateInputType("marks");
      setEstimateError("");
    } else {
      const newQueryObject = {
        ...queryObject,
        rankMode: "known",
      };
      setQueryObject(newQueryObject);
      setEstimatedRank(null);
      setEstimatedPercentile(null);
      setMarksInput("");
      setMarksError("");
      setPercentileInput("");
      setPercentileError("");
      setEstimateInputType("marks");
      setEstimateError("");
    }
  };

  const handleEstimateInputTypeChange = (type) => {
    setEstimateInputType(type);
    setEstimatedRank(null);
    setEstimatedPercentile(null);
    setEstimateError("");
    setMarksInput("");
    setMarksError("");
    setPercentileInput("");
    setPercentileError("");
  };

  const handleMarksChange = (e) => {
    const value = e.target.value;
    setMarksInput(value);
    setEstimatedRank(null);
    setEstimatedPercentile(null);
    setEstimateError("");
    if (value === "") {
      setMarksError("");
      return;
    }
    const marks = Number(value);
    if (Number.isNaN(marks) || marks < 0 || marks > 300) {
      setMarksError("Please enter marks between 0 and 300.");
      return;
    }
    setMarksError("");
  };

  const handlePercentileChange = (e) => {
    const value = e.target.value;
    setPercentileInput(value);
    setEstimatedRank(null);
    setEstimatedPercentile(null);
    setEstimateError("");
    if (value === "") {
      setPercentileError("");
      return;
    }
    const percentileValue = Number(value);
    if (
      Number.isNaN(percentileValue) ||
      percentileValue < 0 ||
      percentileValue > 100
    ) {
      setPercentileError("Please enter percentile between 0 and 100.");
      return;
    }
    setPercentileError("");
  };

  const handleEstimateRank = async () => {
    if (!queryObject.category) {
      setEstimateError("Please select your category first.");
      return;
    }
    if (estimateInputType === "marks") {
      if (marksInput === "") {
        setMarksError("Please enter your marks.");
        return;
      }
      if (marksError) return;
    } else {
      if (percentileInput === "") {
        setPercentileError("Please enter your percentile.");
        return;
      }
      if (percentileError) return;
    }

    setIsEstimating(true);
    setEstimateError("");
    try {
      const response = await fetch("/api/jee-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marks: estimateInputType === "marks" ? Number(marksInput) : undefined,
          percentile:
            estimateInputType === "percentile"
              ? Number(percentileInput)
              : undefined,
          category: queryObject.category,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setEstimateError(data.error || "Unable to estimate rank.");
        setIsEstimating(false);
        return;
      }

      setEstimatedRank(data.categoryRank);
      setEstimatedPercentile(data.percentile);
      setRankMode("estimate");
      const newQueryObject = {
        ...queryObject,
        mainRank: String(data.categoryRank),
        rank: String(data.categoryRank),
        qualifiedJeeAdv: "No",
        rankMode: "estimate",
      };
      delete newQueryObject.advRank;
      setQueryObject(newQueryObject);
      debouncedRouterPush(newQueryObject);
    } catch (error) {
      setEstimateError("Unable to estimate rank right now.");
    } finally {
      setIsEstimating(false);
    }
  };

  useEffect(() => {
    // Initial data fetch when component mounts and router.query is available
    if (router.isReady && Object.keys(router.query).length > 0) {
      fetchData(router.query);
    }
  }, [router.isReady, router.query]); // Removed fetchData from here, will be called by debouncedRouterPush or initial useEffect

  const renderQueryDetails = () => {
    const examConfig = examConfigs[queryObject.exam];
    if (!examConfig) return null;

    const renderSelectionCard = (key, label, control, helperText) => (
      <div
        key={key}
        className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4 shadow-sm"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--text)]">
              {label}
            </label>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Select the value that best matches your profile.
            </p>
          </div>
          <span className="rounded-full border border-[var(--stroke)] bg-[var(--bg-soft)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Filter
          </span>
        </div>
        <div className="rounded-xl border border-[var(--stroke)] bg-[var(--bg-soft)] p-3">{control}</div>
        {helperText && (
          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    );

    const selectionCards = examConfig.fields
      .filter(
        (field) =>
          !(
            queryObject.exam === "JoSAA" && field.name === "qualifiedJeeAdv"
          )
      )
      .map((field) => {
        const showHomeStateNote =
          queryObject.exam === "JoSAA" && field.name === "homeState";

        return renderSelectionCard(
          field.name,
          typeof field.label === "function"
            ? field.label(queryObject)
            : field.label,
          <Dropdown
            className="w-full text-sm md:text-base"
            options={field.options.map((option) =>
              typeof option === "string"
                ? { value: option, label: option }
                : option
            )}
            selectedValue={queryObject[field.name]}
            onChange={handleQueryObjectChange(field.name)}
          />,
          showHomeStateNote
            ? "We show home-state closing ranks wherever that quota applies."
            : null
        );
      });

    const primaryInputCard =
      queryObject.exam !== "JoSAA" && queryObject.exam !== "TNEA"
          ? renderSelectionCard(
            "rank",
            getPrimaryInputConfig(queryObject.exam).label,
            <>
              <input
                type="number"
                step={getPrimaryInputConfig(queryObject.exam).step}
                min={getPrimaryInputConfig(queryObject.exam).min}
                max={getPrimaryInputConfig(queryObject.exam).max}
                value={
                  queryObject.rank?.toString().length
                    ? normalizePrimaryInputValue(
                        queryObject.exam,
                        String(queryObject.rank)
                      )
                    : ""
                }
                onChange={handleRankChange}
                onKeyDown={(e) => {
                  if (
                    ["e", "E", "+", "-", " "].includes(e.key) ||
                    (!getPrimaryInputConfig(queryObject.exam).allowDecimal &&
                      e.key === ".")
                  ) {
                    e.preventDefault();
                  }
                }}
                className={`w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-left text-sm outline-none transition focus:ring-2 focus:ring-[rgba(187,47,40,0.2)] sm:text-base ${
                  primaryInputError
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#dfc8c3] focus:border-[#bb2f28]"
                }`}
                placeholder={getPrimaryInputConfig(queryObject.exam).placeholder}
              />
              {primaryInputError && (
                <p className="mt-2 text-sm text-red-500">
                  {primaryInputError}
                </p>
              )}
            </>,
            getPrimaryInputConfig(queryObject.exam).helperText
          )
        : null;

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--bg-soft)] px-4 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Edit Filters
              </p>
              <h3 className="mt-1 text-base font-semibold text-[var(--text)]">
                Update the inputs used for predictions
              </h3>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Every field below is aligned to keep the form easy to scan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <div className="sticky top-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Current context
              </p>
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-[var(--stroke)] bg-[var(--bg-soft)] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Exam
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {queryObject.exam || "Not selected"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--stroke)] bg-[var(--bg-soft)] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Active filters
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {selectionCards.length + (primaryInputCard ? 1 : 0)} fields
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--stroke)] bg-[var(--bg-soft)] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Mode
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {queryObject.exam === "JoSAA"
                      ? rankMode === "estimate"
                        ? "Estimate"
                        : "Known"
                      : "Direct input"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-8">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {selectionCards}
              {primaryInputCard}
            </div>
          </div>
        </div>

        {queryObject.exam === "JoSAA" && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {renderSelectionCard(
                "rankMode",
                "Rank mode",
                <div className="flex w-full justify-center">
                  <div className="inline-flex w-full overflow-hidden rounded-xl border border-[var(--stroke)] bg-[var(--surface)]">
                    <button
                      type="button"
                      onClick={() => handleRankModeChange("estimate")}
                      className={`flex-1 px-4 py-2 text-sm ${
                        rankMode === "estimate"
                          ? "bg-[var(--brand)] text-[var(--brand-contrast)]"
                          : "bg-[var(--surface)] text-[var(--text-muted)]"
                      }`}
                    >
                      Estimate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRankModeChange("known")}
                      className={`flex-1 px-4 py-2 text-sm ${
                        rankMode === "known"
                          ? "bg-[var(--brand)] text-[var(--brand-contrast)]"
                          : "bg-[var(--surface)] text-[var(--text-muted)]"
                      }`}
                    >
                      Known rank
                    </button>
                  </div>
                </div>
              )}

            {rankMode === "known" &&
              examConfig.fields.find(
                (field) => field.name === "qualifiedJeeAdv"
              ) && (
                renderSelectionCard(
                  "qualifiedJeeAdv",
                  "JEE Advanced qualification",
                  examConfig.fields.find(
                    (field) => field.name === "qualifiedJeeAdv"
                  ).label,
                  <Dropdown
                    className="w-full text-sm md:text-base"
                    options={examConfig.fields
                      .find((field) => field.name === "qualifiedJeeAdv")
                      .options.map((option) =>
                        typeof option === "string"
                          ? { value: option, label: option }
                          : option
                      )}
                    selectedValue={queryObject.qualifiedJeeAdv}
                    onChange={handleQueryObjectChange("qualifiedJeeAdv")}
                  />
                )
              )}

            {rankMode === "estimate" ? (
              renderSelectionCard(
                "estimate",
                estimateInputType === "marks"
                  ? examConfig.estimateMarksInput?.label ||
                    "Enter JEE Main marks out of 300"
                  : examConfig.estimatePercentileInput?.label ||
                    "Enter JEE Main percentile",
                <div className="flex flex-col gap-3">
                  <div className="flex w-full justify-center">
                    <div className="inline-flex w-full overflow-hidden rounded-xl border border-[var(--stroke)] bg-[var(--surface)]">
                      <button
                        type="button"
                        onClick={() => handleEstimateInputTypeChange("marks")}
                        className={`flex-1 px-4 py-2 text-sm ${
                          estimateInputType === "marks"
                            ? "bg-[var(--brand)] text-[var(--brand-contrast)]"
                            : "bg-[var(--surface)] text-[var(--text-muted)]"
                        }`}
                      >
                        Marks
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleEstimateInputTypeChange("percentile")
                        }
                        className={`flex-1 px-4 py-2 text-sm ${
                          estimateInputType === "percentile"
                            ? "bg-[var(--brand)] text-[var(--brand-contrast)]"
                            : "bg-[var(--surface)] text-[var(--text-muted)]"
                        }`}
                      >
                        Percentile
                      </button>
                    </div>
                  </div>
                  {estimateInputType === "marks" ? (
                    <>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="300"
                        value={marksInput}
                        onChange={handleMarksChange}
                        onKeyDown={(e) => {
                          if (
                            [".", "e", "E", "+", "-", " "].includes(e.key)
                          ) {
                            e.preventDefault();
                          }
                        }}
                        className={`w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-center outline-none transition focus:ring-2 focus:ring-[rgba(182,58,48,0.18)] ${
                          marksError
                            ? "border-red-500 focus:border-red-500"
                            : "border-[var(--stroke)] focus:border-[var(--brand)]"
                        }`}
                        placeholder={
                          examConfig.estimateMarksInput?.placeholder ||
                          "e.g., 182"
                        }
                      />
                      {marksError && (
                        <p className="text-sm text-red-500">{marksError}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={percentileInput}
                        onChange={handlePercentileChange}
                        onKeyDown={(e) => {
                          if (["e", "E", "+", "-", " "].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className={`w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-center outline-none transition focus:ring-2 focus:ring-[rgba(182,58,48,0.18)] ${
                          percentileError
                            ? "border-red-500 focus:border-red-500"
                            : "border-[var(--stroke)] focus:border-[var(--brand)]"
                        }`}
                        placeholder={
                          examConfig.estimatePercentileInput?.placeholder ||
                          "e.g., 97.45"
                        }
                      />
                      {percentileError && (
                        <p className="text-sm text-red-500">
                          {percentileError}
                        </p>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleEstimateRank}
                    disabled={
                      isEstimating ||
                      (estimateInputType === "marks"
                        ? marksInput === "" || !!marksError
                        : percentileInput === "" || !!percentileError) ||
                      !queryObject.category
                    }
                    className="accent-button w-full px-4 py-2 disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {isEstimating ? "Estimating..." : "Estimate Rank"}
                  </button>
                  {estimateError && (
                    <p className="text-sm text-red-500">{estimateError}</p>
                  )}
                </div>,
                estimatedRank && estimatedPercentile !== null ? (
                  <>
                    Predicted percentile:{" "}
                    <strong>{estimatedPercentile}</strong>. Predicted category
                    rank: <strong>{estimatedRank}</strong>.
                  </>
                ) : null
              )
            ) : (
              renderSelectionCard(
                "mainRank",
                examConfig.primaryInput?.label ||
                  "Enter JEE Main Category Rank",
                <input
                  type="number"
                  step={examConfig.primaryInput?.step || "1"}
                  min={examConfig.primaryInput?.min || "0"}
                  value={
                    queryObject.mainRank !== undefined
                      ? normalizePrimaryInputValue(
                          "JoSAA",
                          String(queryObject.mainRank)
                        )
                      : queryObject.rank
                      ? normalizePrimaryInputValue(
                          "JoSAA",
                          String(queryObject.rank)
                        )
                      : ""
                  }
                  onChange={(e) => {
                    const value = normalizePrimaryInputValue(
                      "JoSAA",
                      e.target.value
                    );
                    const newQueryObject = {
                      ...queryObject,
                      mainRank: value,
                      rank: value,
                    };
                    setQueryObject(newQueryObject);
                    debouncedRouterPush(newQueryObject);
                  }}
                  onKeyDown={(e) => {
                    if ([".", "e", "E", "+", "-"].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-center outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(182,58,48,0.18)]"
                  placeholder={
                    "Enter JEE Main category rank"
                  }
                />
              )
            )}

            {rankMode === "known" && queryObject.qualifiedJeeAdv === "Yes" && (
              renderSelectionCard(
                "advRank",
                examConfig.advancedInput?.label ||
                  "Enter JEE Advanced Category Rank",
                <>
                  <input
                    type="string"
                    step="1"
                    value={queryObject.advRank || ""}
                    onChange={handleJeeAdvancedRankChange}
                    onKeyDown={(e) => {
                      if ([".", "e", "E", "+", "-", " "].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className={`w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-center outline-none transition focus:ring-2 focus:ring-[rgba(182,58,48,0.18)] ${
                      rankError
                        ? "border-red-500 focus:border-red-500"
                        : "border-[var(--stroke)] focus:border-[var(--brand)]"
                    }`}
                    placeholder={
                      examConfig.advancedInput?.placeholder ||
                      "e.g., 104 or 104P"
                    }
                  />
                  {rankError && (
                    <p className="mt-2 text-sm text-red-500">{rankError}</p>
                  )}
                </>,
                "You can enter a plain rank like 104 or use a P suffix like 104P for PwD."
              )
            )}
            </div>
          </>
        )}

        {queryObject.exam === "TNEA" ? (
          <TneaScoreCalculator
            initialPhysics={queryObject.physicsMarks || ""}
            initialChemistry={queryObject.chemistryMarks || ""}
            initialMaths={queryObject.mathsMarks || ""}
            onScoreChange={handleTneaScoreChange}
            readOnlyRank={true}
          />
        ) : null}
      </div>
    );
  };

  const renderSelectionSummary = () => {
    const examConfig = examConfigs[queryObject.exam];
    if (!examConfig) return null;

    const summaryItems = examConfig.fields
      .filter((field) => {
        if (queryObject.exam === "JoSAA" && field.name === "qualifiedJeeAdv") {
          return rankMode === "known";
        }
        return true;
      })
      .map((field) => {
        const value = queryObject[field.name];
        if (!value) return null;
        const label =
          typeof field.label === "function"
            ? field.label(queryObject)
            : field.label;
        return { key: field.name, label, value };
      })
      .filter(Boolean);

      if (queryObject.exam === "JoSAA") {
      if (rankMode === "estimate" && estimatedRank) {
        summaryItems.push({
          key: "predictedRank",
          label: "Estimated JEE Main Category Rank",
          value: estimatedRank,
        });
      } else if (queryObject.mainRank) {
        summaryItems.push({
          key: "mainRank",
          label: "JEE Main Category Rank",
          value: queryObject.mainRank,
        });
      }
    } else if (queryObject.rank) {
      summaryItems.push({
        key: "rank",
        label: getPrimaryInputConfig(queryObject.exam).label.replace(
          "Enter ",
          ""
        ),
        value: queryObject.rank,
      });
    }

    return (
      <div className="flex flex-wrap gap-2">
        {summaryItems.map((item) => (
          <span
            key={item.key}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--stroke)] bg-[var(--bg-soft)] px-3 py-1 text-xs text-[var(--text-muted)] sm:text-sm"
          >
            <span className="font-semibold text-[var(--brand)]">{item.label}:</span>
            <span>{item.value}</span>
          </span>
        ))}
      </div>
    );
  };

  // Check for TGEAPCET disclaimer conditions
  const showTSEAPERTDisclaimer =
    queryObject.exam === "TGEAPCET" &&
    (queryObject.category === "EWS" || queryObject.region === "OU");

  return (
    <>
      <Head>
        <title>College Predictor Results - {getConstants().TITLE_SHORT}</title>
      </Head>
      <div className="flex min-h-[calc(100vh-138px)] flex-col pb-10 pt-5 sm:pt-7">
        <div className="app-page w-full space-y-4">
          {/* TGEAPCET Disclaimer - Shows when EWS or OU is selected */}
          {showTSEAPERTDisclaimer && (
            <div className="section-shell border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
              <p className="text-sm text-[#9f2f2f]">
                {queryObject.category === "EWS" &&
                  "Showing OC category data as EWS-specific data is limited. "}
                {queryObject.region === "OU" &&
                  "Including other regions as OU-specific data is limited. "}
                (Limited data available)
              </p>
            </div>
          )}

          {/* Query Details and Filters Section */}
          <section className="section-shell p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <h2 className="text-center text-lg font-semibold text-[var(--text)] sm:text-left">
                    Selection Snapshot
                  </h2>
                  <div className="flex justify-center sm:justify-start">
                    <span className="inline-flex rounded-full border border-[var(--stroke)] bg-[var(--bg-soft)] px-3 py-1 text-sm font-semibold text-[var(--brand)]">
                      {queryObject.exam || "Exam not chosen"}
                    </span>
                  </div>
                </div>
                <p className="max-w-3xl text-sm text-[var(--text-muted)] sm:text-base">
                  These are the active filters driving your current result list. Use Edit Filters to change exam, category, rank, or any exam-specific options.
                </p>
                {renderSelectionSummary()}
                {queryObject.exam === "JoSAA" &&
                  rankMode === "estimate" &&
                  estimatedRank &&
                  estimatedPercentile !== null && (
                    <div className="rounded-xl border border-[var(--stroke)] bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
                      Using the JEE Main estimate flow. Predicted percentile: <strong className="text-[var(--brand)]">{estimatedPercentile}</strong>, predicted category rank: <strong className="text-[var(--brand)]">{estimatedRank}</strong>.
                    </div>
                  )}
              </div>
              <div className="flex justify-center sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowSelectionDetails((currentValue) => !currentValue)
                  }
                  className="inline-flex items-center gap-1 rounded-full px-1 py-1 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text)] hover:underline"
                >
                  <ChevronRight size={14} className={showSelectionDetails ? "rotate-90 transition-transform" : "transition-transform"} />
                  {showSelectionDetails ? "Hide Filters" : "Edit Filters"}
                </button>
              </div>
            </div>
            {showSelectionDetails && (
              <div className="mt-4 subtle-divider pt-4">{renderQueryDetails()}</div>
            )}
          </section>

          {isLoading ? (
            <section className="section-shell py-12 text-center">
              <p className="text-xl text-[var(--text)]">Loading predictions...</p>
            </section>
          ) : error ? (
            <section className="section-shell px-4 py-10 text-center">
              <p className="rounded-md bg-[var(--accent-soft)] p-4 text-xl text-[#b91c1c]">
                {error}
              </p>
            </section>
          ) : filteredData.length > 0 ? (
            <>
              <PredictedCollegeTables
                data={filteredData}
                exam={queryObject.exam}
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
              />
            </>
          ) : (
            <section className="section-shell py-12 text-center">
              <p className="text-xl text-[var(--text-muted)]">
                {fullData.length === 0 && !isLoading
                  ? "No predictions available for your current selection. Try adjusting the filters."
                  : "No results match your search term."}
              </p>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default CollegePredictor;

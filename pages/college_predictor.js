import Link from "next/link";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import PredictedCollegeTables from "../components/PredictedCollegeTables";
import PredictorFaq from "../components/PredictorFaq";
import Head from "next/head";
import Fuse from "fuse.js";
import examConfigs from "../examConfig";
import { debounce } from "lodash";

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
  min: "1",
  allowDecimal: false,
};

// Mirrors pages/predictor.js: an exam may refine its primary input from the
// current selection via `refinePrimaryInput`. GUJCET needs it because Medical
// cutoffs are raw NEET marks (0-720) while Engineering/Pharmacy are a 0-100
// percentile.
const getPrimaryInputConfig = (exam, formData = null) => {
  const base = examConfigs[exam]?.primaryInput || defaultPrimaryInputConfig;
  const refine = examConfigs[exam]?.refinePrimaryInput;
  if (!refine || !formData) return base;
  return refine(base, formData) || base;
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

const getCleanQueryObject = (query) =>
  Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

// Which single filter emptied the result set?
//
// Re-runs the query with one optional filter relaxed at a time and returns the
// first relaxation that finds seats. Only fields the student can loosen are
// tried — never category or the score itself, which are facts about them
// rather than preferences.
const RELAXABLE = [
  { key: "collegeType", label: "college type", any: "Any" },
  { key: "district", label: "district", any: "Any" },
  { key: "courseType", label: "course", any: "Any" },
  { key: "program", label: "program", any: null },
  { key: "university", label: "university", any: "All" },
];

const findEmptyHint = async (query, signal) => {
  const clean = getCleanQueryObject(query);
  for (const { key, label, any } of RELAXABLE) {
    const current = clean[key];
    if (!current || current === any) continue;
    const relaxed = { ...clean };
    if (any === null) delete relaxed[key];
    else relaxed[key] = any;
    try {
      const res = await fetch(
        `/api/exam-result?${new URLSearchParams(relaxed).toString()}`,
        { signal }
      );
      if (!res.ok) continue;
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return { key, label, current, count: rows.length };
      }
    } catch (e) {
      if (e.name === "AbortError") return null;
    }
  }
  return null;
};

const CollegePredictor = () => {
  const router = useRouter();
  const [filteredData, setFilteredData] = useState([]);
  const [fullData, setFullData] = useState([]);
  // When a query returns nothing, which single filter caused it (if any).
  const [emptyHint, setEmptyHint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queryObject, setQueryObject] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const abortControllerRef = useRef(null);

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
      setFilteredData(result.map((r) => r.item));
      setError(null);
    } else {
      setFilteredData([]);
      setError("No data to search. Apply filters to load predictions first.");
    }
  };

  const fetchData = async (query) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

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
      const response = await fetch(`/api/exam-result?${queryString}`, {
        signal: controller.signal,
      });
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
        setEmptyHint(null);
        // Zero results is usually ONE over-restrictive filter, not a genuinely
        // impossible profile — e.g. TNEA "State Government" is 10% of the data,
        // so OC + CS + Chennai + State Government matches 2 seats that close at
        // 199.5/200 while 62 colleges are reachable if private is included.
        // Re-run the query with each optional filter relaxed in turn and tell
        // the student which one to change, instead of a dead end.
        if (Array.isArray(data) && data.length === 0) {
          findEmptyHint(query, controller.signal).then(setEmptyHint);
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
      console.error("Error fetching data:", error);
      setError("Failed to fetch college predictions. Please try again.");
      setFilteredData([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  // Debounced version of router.push
  const debouncedRouterPush = useCallback(
    debounce((newQueryObject) => {
      // Ensure both mainRank and advRank are included in the query when appropriate
      let updatedQueryObject = { ...newQueryObject };

      // For JoSAA exam, handle mainRank and advRank
      if (updatedQueryObject.exam === "JoSAA") {
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
    }, 500),
    [router] // router as dependency
  );

  // Apply the fix the empty-state suggests, so the student does not have to
  // reopen Edit Filters and hunt for the field.
  const relaxFilter = (key) => {
    const next = { ...queryObject };
    const spec = RELAXABLE.find((r) => r.key === key);
    if (spec && spec.any !== null) next[key] = spec.any;
    else delete next[key];
    setEmptyHint(null);
    setQueryObject(next);
    debouncedRouterPush(next);
  };

  useEffect(() => {
    // Initial data fetch when component mounts and router.query is available
    if (router.isReady && Object.keys(router.query).length > 0) {
      fetchData(router.query);
    }
  }, [router.isReady, router.query]); // Removed fetchData from here, will be called by debouncedRouterPush or initial useEffect

  // "See the full list of cutoffs" from the form: the same rule the API uses
  const isFullList =
    queryObject.view === "full" &&
    !queryObject.rank &&
    !queryObject.mainRank &&
    !queryObject.advRank &&
    !queryObject.scores;

  // Check for TGEAPCET disclaimer conditions
  const showTSEAPERTDisclaimer =
    queryObject.exam === "TGEAPCET" &&
    (queryObject.category === "EWS" || queryObject.region === "OU");

  return (
    <>
      <Head>
        <title>College Predictor Results - Futures</title>
      </Head>
      <div
        // pb-28: room under the last row for JoSAA's sticky choice button
        className="min-h-screen bg-[#fdf8f6] flex flex-col items-center pt-8 px-4 pb-28"
      >
        {/* Edit inputs left, FAQ right (JoSAA) */}
        <div className="mb-3 flex w-full max-w-6xl items-center justify-between gap-3">
          <Link
            href={`/predictor?${new URLSearchParams(
              getCleanQueryObject(router.query)
            ).toString()}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c7c1] bg-white px-4 py-2 text-sm font-semibold text-[#7a2628] transition hover:bg-[#f8efec]"
          >
            ← Edit inputs
          </Link>
          {/* the answers are about JoSAA (home-state quota, NIRF) */}
          {queryObject.exam === "JoSAA" && <PredictorFaq />}
        </div>
        <div className="w-full max-w-6xl rounded-2xl border border-[#eaded8] bg-white p-6 shadow-sm md:p-8">
          <h1 className="mb-4 text-center text-2xl font-bold text-[#2f2320] sm:text-3xl">
            {isFullList
              ? `All ${queryObject.exam || ""} cutoffs`
              : "College Predictor Results"}
          </h1>
          {isFullList && (
            <p className="mx-auto mb-4 max-w-2xl text-center text-sm leading-6 text-[#6d5550]">
              Every college and course for your selection, with the rank or
              score it closed at. Use Edit inputs to add your rank and see only
              the ones within reach.
            </p>
          )}

          {/* TGEAPCET Disclaimer - Shows when EWS or OU is selected */}
          {showTSEAPERTDisclaimer && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 max-w-3xl mx-auto w-full">
              <p className="text-red-700 text-sm">
                {queryObject.category === "EWS" &&
                  "Showing OC category data as EWS-specific data is limited. "}
                {queryObject.region === "OU" &&
                  "Including other regions as OU-specific data is limited. "}
                (Limited data available)
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-xl text-[#8f2e31]">Loading predictions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 px-4">
              <p className="text-xl text-red-600 bg-red-100 p-4 rounded-md">
                {error}
              </p>
            </div>
          ) : fullData.length > 0 ? (
            <>
              <PredictedCollegeTables
                data={filteredData}
                fullData={fullData}
                exam={queryObject.exam}
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                isFullList={isFullList}
                mainRank={queryObject.mainRank}
                advRank={queryObject.advRank}
              />
            </>
          ) : (
            <div className="mx-auto max-w-xl py-10 text-center">
              <p className="text-lg font-semibold text-[#4a3935]">
                No colleges match this combination.
              </p>
              {emptyHint ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-[#6d5550]">
                    Your <strong>{emptyHint.label}</strong> filter (
                    {emptyHint.current}) is the reason.{" "}
                    <strong>{emptyHint.count.toLocaleString()}</strong>{" "}
                    {emptyHint.count === 1 ? "option opens" : "options open"} up
                    without it.
                  </p>
                  <button
                    type="button"
                    onClick={() => relaxFilter(emptyHint.key)}
                    className="mt-4 inline-flex rounded-full bg-[#8f2e31] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a2628]"
                  >
                    Clear {emptyHint.label} filter
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[#6d5550]">
                  Try widening a filter — college type and district are usually
                  the most restrictive.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CollegePredictor;

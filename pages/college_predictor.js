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

// Dynamically import Dropdown with SSR disabled
const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

const fuseOptions = {
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
  keys: ["Institute", "State", "Academic Program Name"],
};

const CollegePredictor = () => {
  const router = useRouter();
  const [filteredData, setFilteredData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queryObject, setQueryObject] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Initialize queryObject from router.query
    // Ensure that numeric values like rank are stored appropriately if needed
    const initialQuery = { ...router.query };
    if (initialQuery.rank && !isNaN(parseFloat(initialQuery.rank))) {
      initialQuery.rank = parseFloat(initialQuery.rank).toFixed(2);
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

  const [fuseInstance, setFuseInstance] = useState(new Fuse([], fuseOptions));
  useEffect(() => {
    if (fullData && fullData.length > 0) {
      setFuseInstance(new Fuse(fullData, fuseOptions));
    }
  }, [fullData]);

  const handleSearchChange = (e) => {
    const currentSearchTerm = e.target.value;
    setSearchTerm(currentSearchTerm);

    if (currentSearchTerm.trim() === "") {
      setFilteredData(fullData);
      setError(null);
      return;
    }

    if (fullData.length > 0) {
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
      const params = new URLSearchParams(Object.entries(query));
      const queryString = params.toString();
      if (queryString === "") {
        setIsLoading(false);
        return;
      }
      const response = await fetch(`/api/exam-result?${queryString}`);
      if (!response.ok) {
        if (response.status === 429) {
          setError("Rate limit exceeded. Please try again later.");
        } else {
          setError(`HTTP error! status: ${response.status}`);
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
        // If rank is set but mainRank is not, use rank as mainRank
        if (updatedQueryObject.rank && !updatedQueryObject.mainRank) {
          updatedQueryObject.mainRank = updatedQueryObject.rank;
        }

        // If user didn't qualify for JEE Advanced, make sure advRank is not sent
        if (updatedQueryObject.qualifiedJeeAdv === "No") {
          delete updatedQueryObject.advRank;
        }
      }

      const params = new URLSearchParams(Object.entries(updatedQueryObject));
      const queryString = params.toString();
      router.push(`/college_predictor?${queryString}`, undefined, {
        shallow: true,
      });
      fetchData(updatedQueryObject); // Fetch data after route push
    }, 500),
    [router] // router as dependency
  );

  const handleQueryObjectChange = (key) => (selectedOption) => {
    let newQueryObject = {
      ...queryObject,
      [key]: selectedOption.label,
    };
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
    const value = Math.floor(Number(e.target.value)); // Convert to integer
    let newQueryObject = {
      ...queryObject,
      rank: value,
    };
    // If JoSAA, set mainRank only if it's JEE Main rank
    if (queryObject.exam === "JoSAA" && !queryObject.qualifiedJeeAdv) {
      newQueryObject.mainRank = value;
    }
    setQueryObject(newQueryObject);
    debouncedRouterPush(newQueryObject);
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
    // Fetch data when queryObject changes, if not empty
    // This might be redundant if debouncedRouterPush also calls fetchData
    // Let's ensure fetchData is called primarily via debouncedRouterPush or initial load
    if (Object.keys(queryObject).length > 0) {
      // Initial fetch if queryObject is populated from URL, subsequent fetches handled by interaction
      if (router.isReady && !isLoading) {
        // Ensure router is ready and not already loading
        // Check if this is the initial load based on router.query vs queryObject
        // This condition needs to be robust to prevent multiple initial fetches
      }
    }
  }, [queryObject, router.isReady]); // router.isReady is important here

  useEffect(() => {
    // Initial data fetch when component mounts and router.query is available
    if (router.isReady && Object.keys(router.query).length > 0) {
      fetchData(router.query);
    }
  }, [router.isReady, router.query]); // Removed fetchData from here, will be called by debouncedRouterPush or initial useEffect

  const renderQueryDetails = () => {
    const examConfig = examConfigs[queryObject.exam];
    if (!examConfig) return null;

    return (
      <div className="flex flex-col justify-center items-start sm:items-center mb-4 gap-2">
        <p className="text-sm md:text-base font-semibold">
          Exam: {queryObject.exam}
        </p>
        {examConfig.fields.map((field) => (
          <div
            key={field.name}
            className="flex items-center justify-center gap-2"
          >
            <label className="font-semibold text-sm md:text-base">
              {typeof field.label === "function"
                ? field.label(queryObject)
                : field.label}
            </label>
            <Dropdown
              className="text-sm md:text-base"
              options={field.options.map((option) =>
                typeof option === "string"
                  ? { value: option, label: option }
                  : option
              )}
              selectedValue={queryObject[field.name]}
              onChange={handleQueryObjectChange(field.name)}
            />
          </div>
        ))}

        {queryObject.exam === "JoSAA" && (
          <>
            <div className="flex gap-2 items-center">
              <label className="block text-sm md:text-base font-semibold text-gray-700 mb-2">
                Enter Category Rank for JEE Main
              </label>
              <input
                type="number"
                step="1"
                value={
                  queryObject.mainRank !== undefined
                    ? Math.floor(Number(queryObject.mainRank))
                    : queryObject.rank
                    ? Math.floor(Number(queryObject.rank))
                    : ""
                }
                onChange={(e) => {
                  const value = Math.floor(Number(e.target.value));
                  const newQueryObject = {
                    ...queryObject,
                    mainRank: value,
                    rank: value, // keep in sync
                  };
                  setQueryObject(newQueryObject);
                  debouncedRouterPush(newQueryObject);
                }}
                onKeyDown={(e) => {
                  if ([".", "e", "E", "+", "-"].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                className="border border-gray-300 rounded text-center"
                placeholder="Enter JEE Main rank"
              />
            </div>

            {queryObject.qualifiedJeeAdv === "Yes" && (
              <div className="flex flex-col gap-1">
                <div className="flex gap-2 items-center">
                  <label className="block text-sm md:text-base font-semibold text-gray-700">
                    Enter Category Rank for JEE Advanced
                  </label>
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
                    className={`border ${
                      rankError ? "border-red-500" : "border-gray-300"
                    } rounded text-center`}
                    placeholder="e.g., 104 or 104P"
                  />
                </div>
                {rankError && (
                  <p className="text-red-500 text-sm mt-1 ml-2">{rankError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1 ml-2">
                  Enter rank (e.g., 104) or rank with 'P' suffix (e.g., 104P)
                  for PwD category
                </p>
              </div>
            )}
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
        ) : (
          queryObject.exam !== "JoSAA" && (
            <div className="flex gap-2 items-center">
              <label className="block text-sm md:text-base font-semibold text-gray-700 mb-2">
                {queryObject.exam === "JEE Main-JAC" || queryObject.exam === "NEET"
                  ? "Enter All India Rank"
                  : "Enter Category Rank"}
              </label>
              <input
                type="number"
                step="1"
                value={queryObject.rank || ""}
                onChange={handleRankChange}
                onKeyDown={(e) => {
                  // Prevent entering '.', 'e', '+', '-'
                  if ([".", "e", "E", "+", "-"].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                className="border border-gray-300 rounded text-center"
                placeholder={
                  queryObject.exam === "JEE Main-JAC" || queryObject.exam === "NEET"
                    ? "Enter All India Rank"
                    : "Enter your rank"
                }
              />
            </div>
          )
        )}
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-8 px-4">
        <div className="w-full max-w-6xl bg-white shadow-xl rounded-lg p-6 md:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-4">
            College Predictor Results
          </h1>

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

          {/* Query Details and Filters Section */}
          <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-700 mb-3 text-center sm:text-left">
              Your Selection
            </h2>
            {renderQueryDetails()}
          </div>

          {/* Search Bar - more prominent and visually grouped */}
          {queryObject.exam && fullData.length > 0 && (
            <div className="mb-6 p-4 border border-gray-200 rounded-md">
              <label
                htmlFor="search"
                className="block text-md font-semibold text-gray-700 mb-2"
              >
                Search within results (by Institute, State, Program):
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={handleSearchChange}
                className="border border-gray-300 rounded w-full p-2 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type to search..."
              />
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-xl text-blue-600">Loading predictions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 px-4">
              <p className="text-xl text-red-600 bg-red-100 p-4 rounded-md">
                {error}
              </p>
            </div>
          ) : filteredData.length > 0 ? (
            <PredictedCollegeTables
              data={filteredData}
              exam={queryObject.exam}
            />
          ) : (
            <div className="text-center py-10">
              <p className="text-xl text-gray-600">
                {fullData.length === 0 && !isLoading
                  ? "No predictions available for your current selection. Try adjusting the filters."
                  : "No results match your search term."}
              </p>
            </div>
          )}
        </div>
        {showTSEAPERTDisclaimer && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <p className="text-red-700 text-sm">
              {queryObject.category === "EWS" && "Showing OC category data. "}
              {queryObject.region === "OU" && "Including other regions. "}
              (Limited data available)
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default CollegePredictor;

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import PredictedCollegeTables from "../components/PredictedCollegeTables";
import Head from "next/head";
import Fuse from "fuse.js";
import examConfigs from "../examConfig";
import dynamic from "next/dynamic";
import TneaScoreCalculator from "../components/TneaScoreCalculator";
import { debounce } from "lodash";
import { ChevronLeft, ChevronRight, Search, Filter, X } from "lucide-react";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Initialize queryObject from router.query
    // Ensure that numeric values like rank are stored appropriately if needed
    const initialQuery = { ...router.query };
    if (initialQuery.rank && !isNaN(Number.parseFloat(initialQuery.rank))) {
      initialQuery.rank = Number.parseFloat(initialQuery.rank).toFixed(2);
    } else if (router.query.exam === "TNEA" && !initialQuery.rank) {
      // If TNEA and rank is not set, perhaps initialize from individual marks if they exist
      if (
        initialQuery.physicsMarks &&
        initialQuery.chemistryMarks &&
        initialQuery.mathsMarks
      ) {
        const p = Number.parseFloat(initialQuery.physicsMarks);
        const c = Number.parseFloat(initialQuery.chemistryMarks);
        const m = Number.parseFloat(initialQuery.mathsMarks);
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
      const updatedQueryObject = { ...newQueryObject };

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
    }, 1000),
    [router] // router as dependency
  );

  const handleQueryObjectChange = (key) => (selectedOption) => {
    const newQueryObject = {
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
    const newQueryObject = {
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

    const newQueryObject = {
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
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-50 to-red-50 p-4 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#B52326" }}
            ></div>
            <p className="text-lg font-semibold text-gray-800">
              {queryObject.exam}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {examConfig.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {typeof field.label === "function"
                  ? field.label(queryObject)
                  : field.label}
              </label>
              <Dropdown
                className="w-full"
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
        </div>

        {queryObject.exam === "JoSAA" && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                JEE Main Category Rank
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                style={{ "--tw-ring-color": "#B52326" }}
                onFocus={(e) =>
                  (e.target.style.boxShadow = `0 0 0 2px #B52326`)
                }
                onBlur={(e) => (e.target.style.boxShadow = "none")}
                placeholder="Enter JEE Main rank"
              />
            </div>

            {queryObject.qualifiedJeeAdv === "Yes" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  JEE Advanced Category Rank
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                    rankError ? "border-red-500" : "border-gray-300"
                  }`}
                  style={{ "--tw-ring-color": "#B52326" }}
                  onFocus={(e) =>
                    (e.target.style.boxShadow = `0 0 0 2px #B52326`)
                  }
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                  placeholder="e.g., 104 or 104P"
                />
                {rankError && (
                  <p className="text-red-500 text-sm">{rankError}</p>
                )}
                <p className="text-xs text-gray-500">
                  Enter rank (e.g., 104) or rank with 'P' suffix (e.g., 104P)
                  for PwD category
                </p>
              </div>
            )}
          </div>
        )}

        {queryObject.exam === "TNEA" ? (
          <div className="pt-4 border-t border-gray-200">
            <TneaScoreCalculator
              initialPhysics={queryObject.physicsMarks || ""}
              initialChemistry={queryObject.chemistryMarks || ""}
              initialMaths={queryObject.mathsMarks || ""}
              onScoreChange={handleTneaScoreChange}
              readOnlyRank={true}
            />
          </div>
        ) : (
          queryObject.exam !== "JoSAA" && (
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700">
                {queryObject.exam === "JEE Main-JAC" ||
                queryObject.exam === "NEET"
                  ? "All India Rank"
                  : "Category Rank"}
              </label>
              <input
                type="number"
                step="1"
                value={
                  queryObject.rank?.toString().length
                    ? Number(queryObject.rank) | 0
                    : ""
                }
                onChange={handleRankChange}
                onKeyDown={(e) => {
                  // Prevent entering '.', 'e', '+', '-'
                  if ([".", "e", "E", "+", "-"].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                style={{ "--tw-ring-color": "#B52326" }}
                onFocus={(e) =>
                  (e.target.style.boxShadow = `0 0 0 2px #B52326`)
                }
                onBlur={(e) => (e.target.style.boxShadow = "none")}
                placeholder={
                  queryObject.exam === "JEE Main-JAC" ||
                  queryObject.exam === "NEET"
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

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-red-100">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div
            className={`${
              sidebarOpen ? "w-80" : "w-0"
            } transition-all duration-300 ease-in-out bg-white shadow-xl border-r border-gray-200 overflow-hidden ${
              isMobile ? "fixed inset-y-0 right-0 z-50" : "relative"
            }`}
          >
            <div className="h-full flex flex-col">
              {/* Sidebar Header */}
              <div
                className="p-6 border-b border-gray-200"
                style={{
                  background: "linear-gradient(to right, #B52326, #B52326)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-semibold text-white">
                      Filters
                    </h2>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* TGEAPCET Disclaimer */}
                {showTSEAPERTDisclaimer && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg">
                    <p className="text-amber-800 text-sm">
                      {queryObject.category === "EWS" &&
                        "Showing OC category data as EWS-specific data is limited. "}
                      {queryObject.region === "OU" &&
                        "Including other regions as OU-specific data is limited. "}
                      (Limited data available)
                    </p>
                  </div>
                )}

                {renderQueryDetails()}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {sidebarOpen ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <ChevronLeft className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">
                      {sidebarOpen ? "Hide" : "Show"} Filters
                    </span>
                  </button>
                  <h1 className="text-2xl font-bold text-gray-800">
                    College Viewer
                  </h1>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            {queryObject.exam && fullData.length > 0 && (
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="max-w-2xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search within results
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                      style={{ "--tw-ring-color": "#B52326" }}
                      onFocus={(e) =>
                        (e.target.style.boxShadow = `0 0 0 2px #B52326`)
                      }
                      onBlur={(e) => (e.target.style.boxShadow = "none")}
                      placeholder="Search by institute, state, or program..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div
                      className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                      style={{ borderBottomColor: "#B52326" }}
                    ></div>
                    <p
                      className="text-xl font-medium"
                      style={{ color: "#B52326" }}
                    >
                      Loading predictions...
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-6 h-6 text-red-600" />
                    </div>
                    <p className="text-lg text-red-800 font-medium mb-2">
                      Error
                    </p>
                    <p className="text-red-600">{error}</p>
                  </div>
                </div>
              ) : filteredData.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <PredictedCollegeTables
                    data={filteredData}
                    exam={queryObject.exam}
                    userRank={
                      queryObject.mainRank ||
                      queryObject.advRank ||
                      queryObject.rank
                    }
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-xl text-gray-600 font-medium mb-2">
                      No Results Found
                    </p>
                    <p className="text-gray-500">
                      {fullData.length === 0 && !isLoading
                        ? "No predictions available for your current selection. Try adjusting the filters."
                        : "No results match your search term."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </>
  );
};

export default CollegePredictor;

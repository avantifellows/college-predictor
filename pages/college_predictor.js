import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import PredictedCollegeTables from "../components/PredictedCollegeTables";
import Head from "next/head";
import Fuse from "fuse.js";
import examConfigs from "../examConfig";
import Dropdown from "../components/dropdown";

const fuseOptions = {
  isCaseSensitive: false,
  includeScore: false,
  shouldSort: true,
  minMatchCharLength: 1,
  threshold: 0.3,
  distance: 100,
  useExtendedSearch: true,
  ignoreLocation: true,
  fieldNormWeight: 1,
  keys: ["Institute", "State", "Academic Program Name"],
};

const CollegePredictor = () => {
  const router = useRouter();
  const [filteredData, setFilteredData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryObject, setQueryObject] = useState({});
  const [rankError, setRankError] = useState(null);
  const [inputError, setInputError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false); // Track form submission

  useEffect(() => {
    setQueryObject(router.query);
  }, [router.query]);

  const fuse = new Fuse(filteredData, fuseOptions);

  const searchFun = (e) => {
    if (e.target.value === "") {
      setFilteredData(fullData);
      return;
    }
    const searchValue = e.target.value;
    const result = fuse.search(searchValue);
    setFilteredData(result.map((r) => r.item));
  };

  const validateInputs = () => {
    const { exam, rank } = queryObject;

    const newRank = parseInt(rank, 10);
    if (isNaN(newRank) || newRank <= 0) {
      setRankError("Please enter a valid positive rank.");
      return false;
    }

    const examConfig = examConfigs[exam];
    if (!exam || !examConfig) {
      setInputError(
        "Please select a valid exam and provide all required details."
      );
      return false;
    }

    for (const field of examConfig.fields) {
      if (!queryObject[field.name]) {
        setInputError(`Missing required field: ${field.label}`);
        return false;
      }
    }

    setRankError(null);
    setInputError(null);
    return true;
  };

  const fetchData = async (query) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(Object.entries(query));
      const queryString = params.toString();
      if (queryString === "") return;
      const response = await fetch(`/api/exam-result?${queryString}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      setFilteredData(data);
      setFullData(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(
        error.message ||
          "Failed to fetch college predictions. Please try again."
      );
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryObjectChange = (key) => (selectedOption) => {
    setQueryObject({
      ...queryObject,
      [key]: selectedOption.label,
    });
  };

  const handleRankChange = (e) => {
    const newRank = parseInt(e.target.value, 10);
    setQueryObject({
      ...queryObject,
      rank: newRank,
    });
  };

  const handleSearchClick = () => {
    setSubmitted(true); // Mark as submitted
    if (validateInputs()) {
      setShowResults(true);
      fetchData(queryObject);
    } else {
      setShowResults(false);
    }
  };

  const renderQueryDetails = () => {
    const examConfig = examConfigs[router.query.exam];
    if (!examConfig) return null;

    return (
      <div className="flex flex-col justify-center items-start sm:items-center mb-4 gap-2">
        <p className="text-sm md:text-base font-semibold">
          Exam: {router.query.exam}
        </p>
        {examConfig.fields.map((field) => (
          <div
            className="flex items-center justify-center gap-2"
            key={field.name}
          >
            <label className="font-semibold text-sm md:text-base">
              {field.label}
            </label>
            <Dropdown
              className="text-sm md:text-base"
              options={field.options.map((option) =>
                typeof option === "string"
                  ? { value: option, label: option }
                  : option
              )}
              selectedValue={router.query[field.name]}
              onChange={handleQueryObjectChange(field.name)}
            />
          </div>
        ))}
        <div className="flex gap-2 items-center">
          <label
            htmlFor="categoryRank"
            className="block text-sm md:text-base font-semibold text-gray-700 mb-2"
          >
            Enter Category Rank
          </label>
          <input
            id="categoryRank"
            type="number"
            value={queryObject.rank || ""}
            onChange={handleRankChange}
            className="border border-gray-300 rounded text-center p-1"
            placeholder="Enter your rank"
            min="1"
          />
        </div>
        {submitted && rankError && (
          <div className="text-red-600 text-sm mt-2" role="alert">
            {rankError}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>College Predictor - Result</title>
      </Head>
      <div className="flex flex-col items-center p-4">
        <div className="flex flex-col items-center justify-center w-full sm:w-5/6 md:w-3/4 bg-white p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-center">
            {getConstants().TITLE}
          </h1>
          {renderQueryDetails()}
          <button
            onClick={handleSearchClick}
            className="bg-blue-500 text-white px-4 py-2 rounded-md mt-4"
          >
            Search Colleges
          </button>
          {isLoading ? (
            <div className="flex items-center justify-center flex-col mt-2">
              <div
                className="border-t-2 border-transparent border-[#B52326] rounded-full w-8 h-8 animate-spin mb-2"
                role="status"
              >
                <span className="sr-only">Loading...</span>
              </div>
              <p>Loading your college predictions...</p>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center" role="alert">
              {error}
            </div>
          ) : submitted && inputError ? (
            <div className="text-center text-red-600 mt-4">
              <p>{inputError}</p>
            </div>
          ) : !submitted ? (
            <div className="text-center text-red-600 mt-4">
              <p>
                Please enter correct credentials to see college predictions.
              </p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center">
              <p>No colleges found matching your criteria.</p>
              <p>Try adjusting your rank or other parameters.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 w-full flex flex-col left justify-center items-center">
                <label
                  htmlFor="search"
                  className="block text-md font-semibold text-gray-700 content-center mx-2"
                >
                  Search: &#128269;
                </label>
                <input
                  id="search"
                  onChange={searchFun}
                  placeholder="Name / State / Program"
                  className="border border-gray-300 rounded text-center h-fit p-1 sm:w-5/12 w-3/4"
                />
              </div>
              <h2 className="text-lg md:text-xl mb-4 text-center font-bold">
                Predicted colleges and courses for you:
              </h2>
              <div className="w-full overflow-x-auto">
                <PredictedCollegeTables
                  data={filteredData}
                  exam={router.query.exam}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CollegePredictor;

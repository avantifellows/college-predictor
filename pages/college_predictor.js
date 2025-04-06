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
  const [selectedQuota, setSelectedQuota] = useState("AI"); // Default to All India
  const [selectedExam, setSelectedExam] = useState("JEE Main-JOSAA");
  const [rank, setRank] = useState("");

  useEffect(() => {
    setQueryObject(router.query);
  }, [router.query]);

  const fuse = new Fuse(filteredData, fuseOptions);

  const applyQuotaFilter = (data) => {
    if (!data) return [];
    
    const exam = router.query.exam;

    if (exam !== "JEE Main-JOSAA") {
      return data;
    }
    
    const filtered = data.filter((item) => {
      if (selectedQuota === "AI") {
        return true; 
      } else if (selectedQuota === "HS") {
        return item.Quota === "HS" || item.Quota === "Home State";
      } else if (selectedQuota === "OS") {
        return item.Quota === "OS" || item.Quota === "Other State";
      }
      return true; 
    });
    
    return filtered;
  };


  useEffect(() => {
    if (fullData.length > 0) {
      setFilteredData(applyQuotaFilter(fullData));
    }
  }, [selectedQuota, fullData]);


  const searchFun = (e) => {
    const searchValue = e.target.value.trim();

    if (searchValue === "") {
      setFilteredData(applyQuotaFilter(fullData));
      setError(null);
      return;
    }

    const result = fuse.search(searchValue);

    if (result.length === 0) {
      setFilteredData([]);
      setError("No matches found. Please try again.");
    } else {
      setFilteredData(applyQuotaFilter(result.map((r) => r.item)));
      setError(null);
    }
  };

  const handleQuotaChange = (quotaType) => {
    setSelectedQuota(quotaType);
  };

  const fetchData = async (query) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(Object.entries(query));
      const queryString = params.toString();
      if (queryString === "") return;
      const response = await fetch(`/api/exam-result?${queryString}`);
      if (!response.ok) {
        if (response.status === 429) {
          setError("Rate limit exceeded. Please try again later.");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else {
        const data = await response.json();
        setFullData(data);
        setFilteredData(applyQuotaFilter(data));
      }
    } catch (error) {
      setError("Failed to fetch college predictions. Please try again.");
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryObjectChange = (key) => async (selectedOption) => {
    const newQueryObject = {
      ...queryObject,
      [key]: selectedOption.label,
    };
    setQueryObject(newQueryObject);
    const params = new URLSearchParams(Object.entries(newQueryObject));
    const queryString = params.toString();
    router.push(`/college_predictor?${queryString}`);
    await fetchData(newQueryObject);
  };

  const handleRankChange = async (e) => {
    const newQueryObject = {
      ...queryObject,
      rank: e.target.value,
    };
    setQueryObject(newQueryObject);
    const params = new URLSearchParams(Object.entries(newQueryObject));
    const queryString = params.toString();
    router.push(`/college_predictor?${queryString}`);
    await fetchData(newQueryObject);
  };

  useEffect(() => {
    fetchData(router.query);
  }, [router.query]);

  const renderQueryDetails = () => {
    const examConfig = examConfigs[router.query.exam];
    if (!examConfig) return null;

    return (
      <div className="flex flex-col justify-center items-start sm:items-center mb-4 gap-2">
        <p className="text-sm md:text-base  font-semibold">
          Exam: {router.query.exam}
        </p>
        {examConfig.fields.map((field) => (
          <div className="flex items-center justify-center gap-2">
            <label
              key={field.name}
              className="font-semibold text-sm md:text-base "
            >
              {field.label}
            </label>
            <Dropdown
              className="text-sm md:text-base "
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
          <label className="block text-sm md:text-base font-semibold text-gray-700 mb-2 ">
            {router.query.exam === "TNEA"
              ? "Enter Marks"
              : "Enter Category Rank"}
          </label>
          <input
            type="number"
            step={router.query.exam === "TNEA" ? "0.01" : "1"}
            value={queryObject.rank}
            onChange={handleRankChange}
            className="border border-gray-300 rounded text-center"
            placeholder={
              router.query.exam === "TNEA"
                ? "Enter your marks"
                : "Enter your rank"
            }
          />
        </div>
      </div>
    );
  };

  const handlePredict = async () => {
    // Implement the logic to predict colleges based on the selected exam and rank
    // This is a placeholder and should be replaced with the actual implementation
    console.log("Predicting colleges...");
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
          {isLoading ? (
            <div className="flex items-center justify-center flex-col mt-2">
              <div className="border-t-2 border-transparent border-[#B52326] rounded-full w-8 h-8 animate-spin mb-2"></div>
              <p>Loading your college predictions...</p>
            </div>
          ) : (
            <>
              {/* Only show quota selection for JEE Main-JOSAA */}
              {router.query.exam === "JEE Main-JOSAA" && (
                <div className="mb-4 w-full flex flex-col justify-center items-center">
                  <div className="flex flex-wrap gap-4 mb-4 justify-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="quota"
                        value="AI"
                        checked={selectedQuota === "AI"}
                        onChange={() => handleQuotaChange("AI")}
                        className="form-radio h-4 w-4 text-yellow-500"
                      />
                      <span>All India</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="quota"
                        value="HS"
                        checked={selectedQuota === "HS"}
                        onChange={() => handleQuotaChange("HS")}
                        className="form-radio h-4 w-4 text-green-500"
                      />
                      <span>Home State</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="quota"
                        value="OS"
                        checked={selectedQuota === "OS"}
                        onChange={() => handleQuotaChange("OS")}
                        className="form-radio h-4 w-4 text-blue-500"
                      />
                      <span>Other State</span>
                    </label>
                  </div>
                </div>
              )}
              <div className="mb-4 w-full flex flex-col justify-center items-center">
                <label className="block text-md font-semibold text-gray-700 content-center mx-2">
                  Search: &#128269;
                </label>
                <input
                  onChange={searchFun}
                  placeholder="Name / State / Program"
                  className="border border-gray-300 rounded text-center h-fit p-1 sm:w-5/12 w-3/4"
                />
                {error && <p className="text-red-600 mt-2">{error}</p>}
              </div>
              {filteredData.length === 0 ? (
                <div className="text-center">
                  <p>No colleges found matching your criteria.</p>
                  <p>Try adjusting your rank or other parameters.</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <h3 className="text-lg md:text-xl mb-4 text-center font-bold">
                    Predicted colleges and courses for you:
                  </h3>
                  <PredictedCollegeTables
                    data={filteredData}
                    exam={router.query.exam}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CollegePredictor;

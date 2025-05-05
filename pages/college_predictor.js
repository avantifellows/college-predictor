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
  keys: ["Institute", "State", "City", "Academic Program Name"],
};

const CollegePredictor = () => {
  const router = useRouter();
  const [filteredData, setFilteredData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queryObject, setQueryObject] = useState({});
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    setQueryObject(router.query);
  }, [router.query]);

  useEffect(() => {
    if (fullData.length > 0) {
      // Extract unique states
      const uniqueStates = [...new Set(fullData.map(item => item.State))].filter(Boolean);
      setStates(uniqueStates.sort().map(state => ({ value: state, label: state })));
      
      // Extract cities based on selected state
      const stateCities = fullData
        .filter(item => (!queryObject.state || item.State === queryObject.state))
        .map(item => item.City)
        .filter(Boolean);
      
      const uniqueCities = [...new Set(stateCities)].sort();
      setCities(uniqueCities.map(city => ({ value: city, label: city })));
    }
  }, [fullData, queryObject.state]);

  const fuse = new Fuse(filteredData, fuseOptions);

  // Search Function for fuse
  const searchFun = (e) => {
    const searchValue = e.target.value.trim();

    // If the search box is empty, reset to full data
    if (searchValue === "") {
      setFilteredData(fullData); // Ensure `fullData` is not empty
      setError(null); // Clear any previous error message
      return;
    }

    const result = fuse.search(searchValue);

    // Handle no matches found
    if (result.length === 0) {
      setFilteredData([]); // Empty the table
      setError("No matches found. Please try again."); // Show error
    } else {
      setFilteredData(result.map((r) => r.item)); // Update filtered data
      setError(null); // Clear any error message
    }
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
        setFilteredData(data);
        setFullData(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch college predictions. Please try again.");
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryObjectChange = (key) => async (selectedOption) => {
    // If changing state, reset city
    const newQueryObject = {
      ...queryObject,
      [key]: selectedOption.label,
    };
    
    // Clear city if state changes
    if (key === 'state') {
      delete newQueryObject.city;
    }
    
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

  const handleFilterClear = async () => {
    const { exam, rank, ...examFields } = queryObject;
    
    // Keep only required exam fields from examConfig and remove state/city
    const newQueryObject = { exam, rank };
    
    if (examConfigs[exam]) {
      examConfigs[exam].fields.forEach(field => {
        if (examFields[field.name]) {
          newQueryObject[field.name] = examFields[field.name];
        }
      });
    }
    
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
        <p className="text-sm md:text-base font-semibold">
          Exam: {router.query.exam}
        </p>
        {examConfig.fields.map((field) => (
          <div key={field.name} className="flex items-center justify-center gap-2">
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
          <label className="block text-sm md:text-base font-semibold text-gray-700 mb-2">
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
        
        {/* Location Filters */}
        <div className="mt-4 pt-4 border-t border-gray-200 w-full">
          <h3 className="text-md font-semibold mb-2 text-center">Location Filters</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="flex items-center gap-2">
              <label className="text-sm md:text-base font-medium">State:</label>
              <Dropdown
                className="text-sm md:text-base"
                options={[{ value: "", label: "All States" }, ...states]}
                selectedValue={queryObject.state || ""}
                onChange={handleQueryObjectChange("state")}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm md:text-base font-medium">City:</label>
              <Dropdown
                className="text-sm md:text-base"
                options={[{ value: "", label: "All Cities" }, ...cities]}
                selectedValue={queryObject.city || ""}
                onChange={handleQueryObjectChange("city")}
                disabled={!queryObject.state}
              />
            </div>
            
            <button 
              onClick={handleFilterClear}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
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
          {isLoading ? (
            <div className="flex items-center justify-center flex-col mt-2">
              <div className="border-t-2 border-transparent border-[#B52326] rounded-full w-8 h-8 animate-spin mb-2"></div>
              <p>Loading your college predictions...</p>
            </div>
          ) : (
            <>
              {/* Always render the search box */}
              <div className="mb-4 w-full flex flex-col justify-center items-center">
                <label className="block text-md font-semibold text-gray-700 content-center mx-2">
                  Search: &#128269;
                </label>
                <input
                  onChange={searchFun}
                  placeholder="Name / State / City / Program"
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
                  <div className="text-sm text-gray-500 mb-2 text-center">
                    Showing {filteredData.length} colleges
                    {queryObject.state ? ` in ${queryObject.state}` : ""}
                    {queryObject.city ? `, ${queryObject.city}` : ""}
                  </div>
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
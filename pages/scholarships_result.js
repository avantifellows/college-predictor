import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import ScholarshipTable from "../components/ScholarshipTable";
import Head from "next/head";
import Fuse from "fuse.js";
import { scholarshipConfig } from "../scholarshipConfig";
import Dropdown from "../components/dropdown";

const fuseOptions = {
  isCaseSensitive: false,
  includeScore: false,
  shouldSort: true,
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
  keys: ["Scholarship Name"],
};

const ScholarshipFinder = () => {
  const router = useRouter();
  const [filteredData, setFilteredData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queryObject, setQueryObject] = useState({});
  const [expandedRows, setExpandedRows] = useState([]);
  const [hasFetchedData, setHasFetchedData] = useState(false);

  const fuse = new Fuse(filteredData, fuseOptions);

  const fetchData = useCallback(async (query) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(Object.entries(query));
      const queryString = params.toString();
      const response = await fetch(`/api/scholarship-data?${queryString}`);
      if (!response.ok) {
        throw new Error(
          "No Scholarships found try to adjust your search criteria."
        );
      }
      const data = await response.json();
      setFilteredData(data);
      setFullData(data);
      setHasFetchedData(true);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (router.isReady && !hasFetchedData) {
      const initialQuery = { ...router.query };
      setQueryObject(initialQuery);
      if (Object.keys(initialQuery).length > 0) {
        fetchData(initialQuery);
      } else {
        setIsLoading(false);
      }
    }
  }, [router.isReady, router.query, fetchData, hasFetchedData]);

  const searchFun = (e) => {
    if (e.target.value === "") {
      setFilteredData(fullData);
      return;
    }
    const searchValue = e.target.value;
    const result = fuse.search(searchValue);
    setFilteredData(result.map((r) => r.item));
  };

  const handleQueryObjectChange = (key) => (selectedOption) => {
    const newQueryObject = {
      ...queryObject,
      [key]: selectedOption.value,
    };
    setQueryObject(newQueryObject);
    fetchData(newQueryObject);
    const params = new URLSearchParams(Object.entries(newQueryObject));
    const queryString = params.toString();
    router.push(`/scholarships_result?${queryString}`, undefined, {
      shallow: true,
    });
  };

  const toggleRowExpansion = (index) => {
    const updatedExpandedRows = [...expandedRows];
    updatedExpandedRows[index] = !updatedExpandedRows[index];
    setExpandedRows(updatedExpandedRows);
  };

  const renderQueryDetails = () => {
    return (
      <div className="flex flex-col justify-center items-start sm:items-center mb-4 gap-2">
        {scholarshipConfig.fields.map((field) => (
          <div
            key={field.name}
            className="flex items-center justify-center gap-2"
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
              selectedValue={queryObject[field.name]}
              onChange={handleQueryObjectChange(field.name)}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Scholarship - Result</title>
      </Head>
      <div className="flex flex-col items-center p-4">
        <div className="flex flex-col items-center justify-center w-full sm:w-5/6 md:w-3/4 bg-white p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-center">
            {getConstants().SCHOLARSHIP_TITLE}
          </h1>
          {renderQueryDetails()}
          {isLoading ? (
            <div className="flex items-center justify-center flex-col mt-2">
              <div className="border-t-2 border-transparent border-[#B52326] rounded-full w-8 h-8 animate-spin mb-2"></div>
              <p>Loading scholarships...</p>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center">{error}</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center">
              <p>No scholarships found matching your criteria.</p>
              <p>Try adjusting your parameters.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 w-full flex flex-col left justify-center items-center">
                <label className="block text-md font-semibold text-gray-700 content-center mx-2">
                  Search: &#128269;
                </label>
                <input
                  onChange={searchFun}
                  placeholder="Scholarship Name"
                  className="border border-gray-300 rounded text-center h-fit p-1 sm:w-5/12 w-3/4"
                />
              </div>
              <h3 className="text-lg md:text-xl mb-4 text-center font-bold">
                Scholarships matching your criteria:
              </h3>
              <div className="w-full overflow-x-auto">
                <ScholarshipTable
                  filteredData={filteredData}
                  toggleRowExpansion={toggleRowExpansion}
                  expandedRows={expandedRows}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ScholarshipFinder;

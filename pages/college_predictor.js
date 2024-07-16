import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import PredictedCollegeTables from "../components/PredictedCollegeTables";
import Head from "next/head";
import Fuse from "fuse.js";

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
  keys: [
    "Institute",
    "State",
    "Academic Program Name"
  ]
};

// ignoreFieldNorm: false,
// fieldNormWeight: 1,

const fetchDataForExam = async (exam, counselling, category) => {
  const response = await fetch(
    `/api/college-data?exam=${exam}&counselling=${counselling}&category=${category}`,
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

const filterData = (data, queryParams) => {
  const {
    rank,
    category,
    exam,
    counselling,
    roundNumber,
    gender,
    stateName,
    pwd,
    defense,
    language,
    rural,
    courseType,
  } = queryParams;

  return data
    .filter((item) => {
      if (exam === "MHT CET") {
        return (
          item.Gender === gender &&
          item.State === stateName &&
          item.PWD === pwd &&
          item.Defense === defense &&
          item.Category === category
        );
      }
      if (exam === "KCET") {
        return (
          item.Language === language &&
          item.State === stateName &&
          item["Rural/Urban"] === rural &&
          item.Category === category &&
          item["Course Type"] === courseType
        );
      }
      if (exam === "JEE Main" && counselling === "JAC") {
        return category === "Kashmiri Minority"
          ? item.Category === category
          : item.Gender === gender &&
          item.PWD === pwd &&
          item.Defense === defense &&
          item.Category === category &&
          item.State === stateName;
      }
      const itemRound = parseInt(item.Round, 10);
      if (["JEE Main", "JEE Advanced"].includes(exam)) {
        const checkForState =
          item.State === stateName ||
          stateName === "All India" ||
          item.Quota === "OS" ||
          item.Quota === "AI";

        return (
          itemRound == roundNumber &&
          item.Gender === gender &&
          item.Exam === exam &&
          checkForState
        );
      } else if (exam === "NEET") {
        return itemRound == roundNumber;
      }
    })
    .filter(
      (item) => parseInt(item["Closing Rank"], 10) > 0.9 * parseInt(rank, 10),
    )
    .sort((a, b) => a["Closing Rank"] - b["Closing Rank"]);
};

const CollegePredictor = () => {
  const router = useRouter();
  const { query } = router;
  const [filteredData, setFilteredData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchAndFilterData = useCallback(async () => {
    if (query.rank) {
      setIsLoading(true);
      try {
        const data = await fetchDataForExam(
          query.exam,
          query.counselling,
          query.category,
        );
        const filteredData = filterData(data, query);
        setFilteredData(filteredData);
        setFullData(filteredData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setFilteredData([]);
        setFullData([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    fetchAndFilterData();
  }, [fetchAndFilterData]);

  return (
    <>
      <Head>
        <title>College Predictor - Result</title>
      </Head>
      <div className="flex flex-col items-center p-4">
        <div className="flex flex-col items-center justify-center w-full sm:w-5/6 md:w-3/4 lg:w-2/3 bg-white p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-center">
            {getConstants().TITLE}
          </h1>
          <div className="text-center mb-4 space-y-2">
            <p className="text-base md:text-lg">
              {query.exam !== "NEET"
                ? `Your Category Rank: ${query.rank}`
                : `Your Rank: ${query.rank}`}
            </p>
            {query.exam !== "MHT CET" && query.exam !== "KCET" && (
              <p className="text-base md:text-lg">
                Chosen Round Number: {query.roundNumber}
              </p>
            )}
            <p className="text-base md:text-lg">Chosen Exam: {query.exam}</p>
            {query.exam !== "NEET" && query.exam !== "KCET" && (
              <p className="text-base md:text-lg">
                Chosen Gender: {query.gender}
              </p>
            )}
            {query.exam !== "NEET" && (
              <p className="text-base md:text-lg">
                Chosen Home State: {query.stateName}
              </p>
            )}
            {query.exam === "KCET" && (
              <>
                <p className="text-base md:text-lg">
                  Chosen Language: {query.language}
                </p>
                <p className="text-base md:text-lg">
                  Chosen Region: {query.rural}
                </p>
              </>
            )}
          </div>
          <div>
            <div className="flex flex-col items-center text-sm sm:text-base mb-4">
              <p className="leading-4 mb-1">AI: All India</p>
              <p className="leading-4 mb-1">HS: Home State</p>
              <p className="leading-4 mb-1">OS: Out of State</p>
            </div>
          </div>
          <h3 className="text-lg md:text-xl mb-4 text-center">
            Predicted colleges and courses for you:
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center flex-col mt-2">
              <div className="border-t-2 border-transparent border-[#B52326] rounded-full w-8 h-8 animate-spin mb-2"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <>
              <div className="my-4 w-full flex max-sm:flex-col sm:flex-row left justify-end items-center">
                <label className="block text-md font-semibold text-gray-700 content-center mx-2">
                  Search: &#128269;
                </label>
                <input onChange={searchFun} placeholder="Name / State / Program" className="border border-gray-300 rounded text-center h-fit p-1 sm:w-5/12 w-3/4" />
              </div>
              <div className="w-full overflow-x-auto">
                <PredictedCollegeTables
                  data={filteredData}
                  exam={query.exam}
                  counselling={query.counselling}
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

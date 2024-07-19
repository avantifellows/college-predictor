import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import PredictedCollegeTables from "../components/PredictedCollegeTables";
<<<<<<< Updated upstream

const fetchDataForExam = async (exam, counselling, category) => {
  const response = await fetch(
    `/api/college-data?exam=${exam}&counselling=${counselling}&category=${category}`
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
      (item) => parseInt(item["Closing Rank"], 10) > 0.9 * parseInt(rank, 10)
    )
    .sort((a, b) => a["Closing Rank"] - b["Closing Rank"]);
=======
import Head from "next/head";
import Fuse from "fuse.js";
import examConfigs from "../examConfig";

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
  keys: ["Institute", "State", "Academic Program Name"],
>>>>>>> Stashed changes
};

const CollegePredictor = () => {
  const router = useRouter();
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
<<<<<<< Updated upstream
=======
  const [error, setError] = useState(null);

  const fuse = new Fuse(filteredData, fuseOptions);

  //Search Function for fuse
  const searchFun = (e) => {
    if (e.target.value === "") {
      setFilteredData(fullData);
      return;
    }
    const searchValue = e.target.value;
    const result = fuse.search(searchValue);
    setFilteredData(result.map((r) => r.item));
  };
>>>>>>> Stashed changes

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
<<<<<<< Updated upstream
        const data = await fetchDataForExam(
          query.exam,
          query.counselling,
          query.category
        );
        const filteredData = filterData(data, query);
        setFilteredData(filteredData);
      } catch (error) {
        console.error("Error fetching data:", error);
=======
        const params = new URLSearchParams(Object.entries(router.query));
        const queryString = params.toString();
        const response = await fetch(`/api/exam-result?${queryString}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setFilteredData(data);
        setFullData(data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch college predictions. Please try again.");
        setFilteredData([]);
>>>>>>> Stashed changes
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router.query]);

  const renderQueryDetails = () => {
    const examConfig = examConfigs[router.query.exam];
    if (!examConfig) return null;

    return (
      <div className="text-center mb-4 space-y-2">
        {examConfig.fields.map((field) => (
          <p key={field.name} className="text-base md:text-lg">
            {field.label}: {router.query[field.name]}
          </p>
        ))}
        <p className="text-base md:text-lg">Your Rank: {router.query.rank}</p>
      </div>
    );
  };

  return (
<<<<<<< Updated upstream
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
=======
    <>
      <Head>
        <title>College Predictor - Result</title>
      </Head>
      <div className="flex flex-col items-center p-4">
        <div className="flex flex-col items-center justify-center w-full sm:w-5/6 md:w-3/4  bg-white p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-center">
            {getConstants().TITLE}
          </h1>
          {renderQueryDetails()}
          {isLoading ? (
            <div className="flex items-center justify-center flex-col mt-2">
              <div className="border-t-2 border-transparent border-[#B52326] rounded-full w-8 h-8 animate-spin mb-2"></div>
              <p>Loading your college predictions...</p>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center">{error}</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center">
              <p>No colleges found matching your criteria.</p>
              <p>Try adjusting your rank or other parameters.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 w-full flex flex-col left justify-center items-center">
                <label className="block text-md font-semibold text-gray-700 content-center mx-2">
                  Search: &#128269;
                </label>
                <input
                  onChange={searchFun}
                  placeholder="Name / State / Program"
                  className="border border-gray-300 rounded text-center h-fit p-1 sm:w-5/12 w-3/4"
                />
              </div>
              <h3 className="text-lg md:text-xl mb-4 text-center font-bold">
                Predicted colleges and courses for you:
              </h3>
              <div className="w-full overflow-x-auto">
                <PredictedCollegeTables
                  data={filteredData}
                  exam={router.query.exam}
                />
              </div>
>>>>>>> Stashed changes
            </>
          )}
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
          <div className="w-full overflow-x-auto">
            <PredictedCollegeTables
              data={filteredData}
              exam={query.exam}
              counselling={query.counselling}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CollegePredictor;

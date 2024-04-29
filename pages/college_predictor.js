import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import PredictedCollegesTable from "../components/PredictedCollegeTables";
import Navbar from "../components/navbar";

const CollegePredictor = () => {
  const router = useRouter();
  const { rank, category, roundNumber, exam, gender = "", stateName = "" } =
    router.query;
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let exam_fol;
        if (exam === "JEE Main" || exam === "JEE Advanced") {
          exam_fol = "JEE";
        } else exam_fol = "NEET";
        const response = await fetch(
          "/data/" + exam_fol + "/" + category + ".json"
        );
        const data = await response.json();

        // Filter the data based on round number
        const dataForGivenQuery = data.filter((item) => {
          const itemRound = parseInt(item["Round"], 10);
          const itemExam = item["Exam"];
          if (exam === "JEE Main" || exam === "JEE Advanced") {
            const itemGender = item["Gender"];
            const itemState = item["State"];
            const itemQuota = item["Quota"];
            const checkForState =
              itemState == stateName ||
              stateName == "All India" ||
              itemQuota == "OS" ||
              itemQuota == "AI";
            return (
              itemRound == roundNumber &&
              itemGender == gender &&
              itemExam == exam &&
              checkForState
            );
          } else if (exam === "NEET") {
            return itemRound == roundNumber;
          }
        });

        // Filter the data based on closing rank
        const filteredData = dataForGivenQuery.filter((item) => {
          const closingRank = parseInt(item["Closing Rank"], 10);
          return closingRank > parseInt(rank, 10);
        });

        // Sort the filteredData in ascending order of college rank
        // for same college (with same rank), sort with opening rank
        filteredData.sort((a, b) => {
          const rankA = a["College Rank"];
          const rankB = b["College Rank"];

          if (rankA !== rankB) {
            return rankA - rankB;
          } else {
            const openingRankA = a["Opening Rank"];
            const openingRankB = b["Opening Rank"];
            return openingRankA - openingRankB;
          }
        });

        setFilteredData(filteredData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    if (rank) {
      setIsLoading(true);
      fetchData();
    }
  }, [rank]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6 text-center">
            {getConstants().TITLE}
          </h1>
          <div className="text-lg">
            <p>
              {exam !== "NEET"
                ? `Your Category Rank: ${rank}`
                : `Your Rank: ${rank}`}
            </p>
            <p>Chosen Round Number: {roundNumber}</p>
            <p>Chosen Exam: {exam}</p>
            {exam !== "NEET" && (
              <>
                <p>Chosen Gender: {gender}</p>
                <p>Chosen Home State: {stateName}</p>
              </>
            )}
          </div>
          <h2 className="mt-8 mb-4 text-xl font-bold text-center">
            Predicted colleges and courses for you
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2 text-lg">
              <div className="w-6 h-6 border-t-2 border-b-2 border-red-500 rounded-full animate-spin"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <PredictedCollegesTable data={filteredData} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CollegePredictor;

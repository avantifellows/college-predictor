import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import PredictedCollegesTable from "../components/PredictedCollegeTables";
import Navbar from "../components/navbar";

const CollegePredictor = () => {
  const router = useRouter();
  const {
    rank,
    category,
    roundNumber,
    exam,
    gender = "",
    stateName = "",
  } = router.query;
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
    <div className="flex flex-col items-center">
      <div className="flex border-4  border-red flex-col items-center justify-center m-auto text-xl  md:text-2xl lg:text-3xl">
        <h1 className="text-2xl font-bold mb-3">{getConstants().TITLE}</h1>

        <div className="w-full text-[1.3rem] px-4">
          <h3 className="font-bold">Data provided by you:</h3>
          <h2 className="pl-2">
            {exam != "NEET" ? "Category Rank: " + rank : "Rank: " + rank}
          </h2>
          <h2 className="pl-2">Round Number: {roundNumber}</h2>
          <h2 className="pl-2">Exam: {exam}</h2>
          {exam != "NEET" && (
            <>
              <h2 className="pl-2">Gender: {gender}</h2>
              <h2 className="pl-2">Home State: {stateName}</h2>
            </>
          )}
        </div>

        <h2 className="mb-4 text-[1.5rem] font-medium">
          Predicted colleges and courses for you
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center flex-col mt-2">
            <div className="border-t-2 border-transparent border-[#B52326] rounded-full w-8 h-8 animate-spin mb-2"></div>
            <p>Loading...</p>
          </div>
        ) : (
          <PredictedCollegesTable data={filteredData} />
        )}
      </div>
    </div>
  );
};

export default CollegePredictor;

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import PredictedCollegeTables from "../components/PredictedCollegeTables";

const CollegePredictor = () => {
  const router = useRouter();
  const {
    rank,
    category,
    exam,
    counselling,
    roundNumber = "",
    gender = "",
    stateName = "",
    pwd = "",
    defense = "",
    language = "",
    rural = "",
    courseType = ""
  } = router.query;
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let exam_fol;
        if (exam === "JEE Main" || exam === "JEE Advanced") {
          exam_fol = "JEE";
        } else if (exam === "MHT CET") {
          exam_fol = "MHTCET";
        } else if (exam === "KCET") {
          exam_fol = "KCET";
        } else {
          exam_fol = "NEET";
        }
        
        let response;
        if (exam_fol === "MHTCET") {
          response = await fetch(`/data/${exam_fol}/mhtcet_data.json`);
        } else if (exam_fol === "KCET") {
          response = await fetch(`/data/${exam_fol}/kcet_data.json`);
        } else {
          if (counselling == "JAC") {
            response = await fetch(`/data/${exam_fol}/jac_data.json`);
          } else {
            response = await fetch(`/data/${exam_fol}/${category}.json`);
          }
          
        }
        
        const data = await response.json();
        const dataForGivenQuery = data.filter((item) => {
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
              item["Course Type"] == courseType
            );
          }

          if (exam === "JEE Main" && counselling === "JAC") {
            if (category === "Kashmiri Minority") {
              return item.Category === category
            }

            return (
              item.Gender === gender &&
              item.PWD === pwd &&
              item.Defense === defense &&
              item.Category === category &&
              item.State === stateName
            )
          }

          const itemRound = parseInt(item.Round, 10);
          if (exam === "JEE Main" || exam === "JEE Advanced") {
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
        });

        const filteredData = dataForGivenQuery.filter((item) => {
          return parseInt(item["Closing Rank"], 10) > 0.9 * parseInt(rank, 10);
        });

        if (exam !== "MHT CET" && exam !== "KCET" && counselling !== "JAC") {
          filteredData.sort((a, b) => {
            // const rankA = a["College Rank"];
            // const rankB = b["College Rank"];
            // if (rankA !== rankB) {
            //   return rankA - rankB;
            // } else {
            //   return a["Opening Rank"] - b["Opening Rank"];
            // }
            return a["Closing Rank"] - b["Closing Rank"];
          });
        } else {
          filteredData.sort((a, b) => {
            return a["Closing Rank"] - b["Closing Rank"];
          });
        }

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
    <div className="flex flex-col items-center p-4">
    <div className="flex flex-col items-center justify-center w-full sm:w-5/6 md:w-3/4 lg:w-2/3 bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4 text-center">{getConstants().TITLE}</h1>
      <div className="text-center mb-4 space-y-2">
        <p className="text-base md:text-lg">{exam !== "NEET" ? `Your Category Rank: ${rank}` : `Your Rank: ${rank}`}</p>
        {exam !== "MHT CET" && exam !== "KCET" && (
          <p className="text-base md:text-lg">Chosen Round Number: {roundNumber}</p>
        )}
        <p className="text-base md:text-lg">Chosen Exam: {exam}</p>
        {exam !== "NEET" && exam !== "KCET" && (
          <p className="text-base md:text-lg">Chosen Gender: {gender}</p>
        )}
        {exam !== "NEET" && (
          <p className="text-base md:text-lg">Chosen Home State: {stateName}</p>
        )}
        {exam === "KCET" && (
          <>
            <p className="text-base md:text-lg">Chosen Language: {language}</p>
            <p className="text-base md:text-lg">Chosen Region: {rural}</p>
          </>
        )}
      </div>
      <h3 className="text-lg md:text-xl mb-4 text-center">Predicted colleges and courses for you:</h3>
      {isLoading ? (
        <div className="flex items-center justify-center flex-col mt-2">
          <div className="border-t-2 border-transparent border-[#B52326] rounded-full w-8 h-8 animate-spin mb-2"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <PredictedCollegeTables data={filteredData} exam={exam} counselling={counselling} />
        </div>
      )}
    </div>
  </div>
  );
};

export default CollegePredictor;

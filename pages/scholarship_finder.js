import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import ScholarshipTable from "../components/ScholarshipTable";
import Navbar from "../components/navbar";

const ScholarshipFinder = () => {
  const router = useRouter();
  const {
    status,
    grade,
    gender,
    familyIncome,
    category,
    stateName,
    cityName,
    stream,
  } = router.query;
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState([]);

  const toggleRowExpansion = (index) => {
    const updatedExpandedRows = [...expandedRows];
    updatedExpandedRows[index] = !updatedExpandedRows[index];
    setExpandedRows(updatedExpandedRows);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "/data/scholarships/scholarship_data.json"
        );
        const data = await response.json();

        // Filter the data based on round number
        const dataForGivenQuery = data.filter((item) => {
          const itemStatus = item["Status"];
          const itemGrade11 = item["Class 11 can Apply"];
          const itemGrade12 = item["Class 12 can Apply"];
          const itemGradeUG = item["Can UG 1st year apply?"];
          const itemIncome = item["Family Income (in LPA)"];
          const itemCategory = item["Category"];

          const itemStates = [];
          for (
            let i = 1;
            i <= getConstants().NUMBER_STATES_IN_SCHOLARSHIP_SHEET;
            i++
          ) {
            itemStates.push(item[`State ${i}`]);
          }

          const itemCities = [];
          for (
            let i = 1;
            i <= getConstants().NUMBER_CITIES_IN_SCHOLARSHIP_SHEET;
            i++
          ) {
            itemCities.push(item[`City ${i}`]);
          }

          // stream check
          const itemStream = item["Open for Stream"];
          let checkForStream = true; // true in most cases except ones below
          if (itemStream == "Engineering" && stream == "Medical")
            checkForStream = false;
          else if (itemStream == "Medical" && stream == "Engineering")
            checkForStream = false;

          // gender check
          const itemGender = item["Gender"];
          let checkForGender = true;
          if (itemGender == "Male" && gender == "Female")
            checkForGender = false;
          else if (itemGender == "Female" && gender == "Male")
            checkForGender = false;

          // grade check
          let checkForGrade = false;
          if (grade == "11" && itemGrade11 == "Yes") checkForGrade = true;
          if (grade == "12" && itemGrade12 == "Yes") checkForGrade = true;
          if (grade == "ug" && itemGradeUG == "Yes") checkForGrade = true;
          if (grade == "Other" && itemGrade11 != "Yes" && itemGrade12 != "Yes" && itemGradeUG != "Yes")
            checkForGrade = true;

          // category check
          let checkForCategory = false;
          // PwD in `OPEN (PwD)`
          if (category.includes(itemCategory)) checkForCategory = true;
          if (itemCategory != null && itemCategory.includes(category))
            checkForCategory = true;
          if (category == "Other") checkForCategory = true;
          if (itemCategory == null) checkForCategory = true; // empty in json

          // income check
          let checkForIncome = false;
          if (itemIncome == null) checkForIncome = true; // empty
          if (familyIncome <= itemIncome) checkForIncome = true;

          // status check
          let checkForStatus = false;
          if (itemStatus == null) checkForStatus = true;
          if (itemStatus == status) checkForStatus = true;
          if (status == "Both") checkForStatus = true;

          // statename check
          let checkForState = false;
          if (item["State 1"] == null) checkForState = true;
          if (itemStates.includes(stateName)) checkForState = true;
          if (stateName == "All India") checkForState = true;

          // cityname check
          let checkForCity = false;
          if (item["City 1"] == null) checkForCity = true;
          if (itemCities.includes(cityName)) checkForCity = true;
          if (cityName == "All India") checkForCity = true;

          return (
            checkForCategory &&
            checkForCity &&
            checkForGender &&
            checkForGrade &&
            checkForIncome &&
            checkForState &&
            checkForStatus &&
            checkForStream
          );
        });

        // if any further filters required, add here
        const filteredData = dataForGivenQuery;

        setFilteredData(filteredData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    if (grade) {
      setIsLoading(true);
      fetchData();
    }
  }, [
    status,
    grade,
    gender,
    familyIncome,
    category,
    stateName,
    cityName,
    stream,
  ]);

  return (
    <div className="flex items-center w-full lg:flex-col ">
      <div className="flex flex-col items-center md:text-2xl lg:text-3xl">
        <h1 className="text-2xl m-2 font-semibold">
          {getConstants().SCHOLARSHIP_TITLE}
        </h1>
        <h3 className="mb-2">Chosen Grade: {grade}</h3>
        <h3 className="mb-2">Chosen Gender: {gender}</h3>
        <h3 className="mb-2">Chosen Stream: {stream}</h3>
        <h3 className="mb-2">Chosen Category: {category}</h3>
        <h3 className="mb-2">Chosen State: {stateName}</h3>
        <h3 className="mb-2">Chosen City: {cityName}</h3>
        <h3 className="mb-2  font-bold text-xl md:text-2xl lg:text-3xl">
          Scholarships
        </h3>
        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="border-t-4 border-[#B52326] border-solid w-7 h-7 animate-spin rounded-full mb-3"></div>
            <p>Loading...</p>
          </div>
        ) : (
          <ScholarshipTable
            filteredData={filteredData}
            toggleRowExpansion={toggleRowExpansion}
            expandedRows={expandedRows}
          />
        )}
      </div>
    </div>
  );
};

export default ScholarshipFinder;

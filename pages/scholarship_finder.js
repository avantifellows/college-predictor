import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "./scholarship_finder.module.css";
import getConstants from "../constants";

const ScholarshipFinder = () => {
    const router = useRouter();
    const { status, grade, gender, familyIncome, category, stateName, cityName, stream } = router.query;
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
                const response = await fetch("/data/scholarships/scholarship_data.json");
                const data = await response.json();

                // Filter the data based on round number
                const dataForGivenQuery = data.filter((item) => {
                    const itemStatus = item["Status"];
                    const itemGrade11 = item["Class 11 can Apply"];
                    const itemGrade12 = item["Class 12 can Apply"];
                    const itemIncome = item["Family Income (in LPA)"];
                    const itemCategory = item["Category"];
                    
                    const itemStates = [];
                    for (let i = 1; i <= getConstants().NUMBER_STATES_IN_SCHOLARSHIP_SHEET; i++) {
                        itemStates.push(item[`State ${i}`]);
                    }

                    const itemCities = [];
                    for (let i = 1; i <= getConstants().NUMBER_CITIES_IN_SCHOLARSHIP_SHEET; i++) {
                        itemCities.push(item[`City ${i}`]);
                    }

                    // stream check
                    const itemStream = item["Open for Stream"];
                    let checkForStream = true; // true in most cases except ones below
                    if (itemStream == "Engineering" && stream == "Medical") checkForStream = false;
                    else if (itemStream == "Medical" && stream == "Engineering") checkForStream = false;

                    // gender check
                    const itemGender = item["Gender"];
                    let checkForGender = true;
                    if (itemGender == "Male" && gender == "Female") checkForGender = false;
                    else if (itemGender == "Female" && gender == "Male") checkForGender = false;

                    // grade check
                    let checkForGrade = false;
                    if (grade == "11" && itemGrade11 == "Yes") checkForGrade = true;
                    if (grade == "12" && itemGrade12 == "Yes") checkForGrade = true;
                    if (grade == "Other" && itemGrade11 != "Yes" && itemGrade12 != "Yes") checkForGrade = true;

                    // category check
                    let checkForCategory = false;
                    // PwD in `OPEN (PwD)`
                    if (category.includes(itemCategory)) checkForCategory = true;
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

                    return (checkForCategory && checkForCity && checkForGender
                        && checkForGrade && checkForIncome
                        && checkForState && checkForStatus && checkForStream);
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
    }, [status, grade, gender, familyIncome, category, stateName, cityName, stream]);

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1>{getConstants().SCHOLARSHIP_TITLE}</h1>
                <h3>Chosen Grade: {grade}</h3>
                <h3>Chosen Gender: {gender}</h3>
                <h3>Chosen Stream: {stream}</h3>
                <h3>Chosen State: {stateName}</h3>
                <h3>Chosen City: {cityName}</h3>
                <h3>Scholarships:</h3>
                {isLoading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Loading...</p>
                    </div>
                ) : (
                    <div>
                        <table className={styles.table}>
                            <thead>
                                <tr className={styles.header_row}>
                                    <th>Scholarship Name</th>
                                    <th>Status</th>
                                    <th>Gender</th>
                                    <th>Category</th>
                                    <th>Application Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, index) => (
                                    <React.Fragment key={index}>
                                    <tr
                                      onClick={() => toggleRowExpansion(index)} // Toggle expansion on row click
                                      className={
                                        index % 2 === 0 ? styles.even_row : styles.odd_row
                                      }
                                    >
                                        <td className={styles.cell}>
                                            {item["Scholarship Name"]}
                                        </td>
                                        <td className={styles.cell}>
                                            {item.Status}
                                        </td>
                                        <td className={styles.cell}>
                                            {item["Gender"]}
                                        </td>
                                        <td className={styles.cell}>
                                            {item.Category}
                                        </td>
                                        <td className={styles.cell}>
                                        <a href={item["Application Link"]} target="_blank">{item["Application Link"]}</a>
                                        </td>
                                    </tr>
                                    {expandedRows[index] && ( // Render additional content if row is expanded
                                    <tr className={`${
                                        expandedRows[index] ? 'expanded-row' : 'expandable-row'
                                      }`}>
                                    <td colSpan="5"> {/* Span all columns */}
                                        <div>
                                        <b>Eligibility</b>: {item["Eligibility"]} <br /><br />
                                        <b>Benefits</b>: {item["Benefits"]} <br /><br />
                                        <b>Doc Required</b>: {item["Doc Required"]} <br /><br />
                                        <b>National Scholarship</b>: {item["National Scholarship"]}<br /><br />
                                        <b>Can Class 11 Apply</b>: {item["Class 11 can Apply"]} <br /><br />
                                        <b>Can Class 12 Apply</b>: {item["Class 12 can Apply"]} <br /><br />
                                        <b>Family Income (in LPA)</b>: {item["Family Income (in LPA)"]} <br /><br />
                                        <b>Last Date</b>: {item["Last Date"]} <br /><br />
                                        <b>Open for Stream</b>: {item["Open for Stream"]} <br /><br />
                                        <b>Special Criteria</b>: {item["Special Criteria"]} <br /><br />
                                        </div>
                                    </td>
                                    </tr>
                                    )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScholarshipFinder;

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "./college_predictor.module.css";
import getConstants from "../constants";

const CollegePredictor = () => {
    const router = useRouter();
    const { rank, category, roundNumber, exam, gender = "", stateName = "" } = router.query;
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let exam_fol;
                if (exam === "JEE Main" || exam === "JEE Advanced") {
                    exam_fol = "JEE"
                } else exam_fol = "NEET";
                const response = await fetch("/data/" + exam_fol + "/" + category + ".json");
                const data = await response.json();

                // Filter the data based on round number
                const dataForGivenQuery = data.filter((item) => {
                    const itemRound = parseInt(item["Round"], 10);
                    const itemExam = item["Exam"];
                    if (exam === "JEE Main" || exam === "JEE Advanced") {
                        const itemGender = item["Gender"];
                        const itemState = item["State"];
                        const itemQuota = item["Quota"];
                        const checkForState = (itemState == stateName) || (stateName == "All India") || (itemQuota == "OS") || (itemQuota == "AI");
                        return itemRound == roundNumber && itemGender == gender && itemExam == exam && checkForState;
                    }
                    else if (exam === "NEET") {
                        return itemRound == roundNumber;
                    }        
                });

                // Filter the data based on closing rank
                const filteredData = dataForGivenQuery.filter(
                    (item) => {
                        const closingRank = parseInt(item["Closing Rank"], 10);
                        return closingRank > parseInt(rank, 10);
                    }
                );

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
        <div className={styles.container}>
            <div className={styles.content}>
                <h1>{getConstants().TITLE}</h1>
                <h2>{exam != "NEET"
                    ? "Your Category Rank: " + rank
                    : "Your Rank: " + rank}</h2>
                <h3>Chosen Round Number: {roundNumber}</h3>
                <h3>Chosen Exam: {exam}</h3>
                {exam != "NEET" && (
                    <>
                        <h3>Chosen Gender: {gender}</h3>
                        <h3>Chosen Home State: {stateName}</h3>
                    </>
                )}
                <h3>Predicted colleges and courses for you</h3>
                {isLoading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Loading...</p>
                    </div>
                ) : (
                    <div>
                        <div>
                            <p className={styles.paragraph}>AI: All India</p>
                            <p className={styles.paragraph}>HS: Home State </p>
                            <p className={styles.paragraph}>OS: Out of State</p>
                        </div>
                        <table className={styles.table}>
                            <thead>
                                <tr className={styles.header_row}>
                                    <th>Institute Rank</th>
                                    <th>State</th>
                                    <th>Institute</th>
                                    <th>Academic Program Name</th>
                                    <th>Opening Rank</th>
                                    <th>Closing Rank</th>
                                    <th>Quota</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, index) => (
                                    <tr
                                        key={index}
                                        className={
                                            index % 2 === 0
                                                ? styles.even_row
                                                : styles.odd_row
                                        }
                                    >
                                        <td className={styles.cell}>
                                            {item["College Rank"]}
                                        </td>
                                        <td className={styles.cell}>
                                            {item["State"]}
                                        </td>
                                        <td className={styles.cell}>
                                            {item.Institute}
                                        </td>
                                        <td className={styles.cell}>
                                            {item["Academic Program Name"]}
                                        </td>
                                        <td className={styles.cell}>
                                            {item["Opening Rank"]}
                                        </td>
                                        <td className={styles.cell}>
                                            {item["Closing Rank"]}
                                        </td>
                                        <td className={styles.cell}>
                                            {item["Quota"]}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollegePredictor;

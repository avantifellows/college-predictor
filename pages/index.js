import React, { useState } from "react";
import Script from "next/script";
import Dropdown from "../components/dropdown";
import { useRouter } from "next/router";
import styles from "./index.module.css";
import getConstants from "../constants";

const HomePage = () => {
    const categoryOptions = getConstants().CATEGORY_OPTIONS;

    const genderOptions = getConstants().GENDER_OPTIONS;

    const roundNumberOptions = getConstants().ROUND_NUMBER_OPTIONS;

    const examOptions = getConstants().EXAM_OPTIONS;

    const stateOptions = getConstants().STATE_OPTIONS;

    const [rank, setRank] = useState(0);
    const [roundNumber, setRoundNumber] = useState("");
    const [category, setCategory] = useState("");
    const [gender, setGender] = useState("");
    const [exam, setExam] = useState("");
    const [stateName, setStateName] = useState("");
    const router = useRouter();

    const handleCategoryDropdownChange = (selectedOption) => {
        setCategory(selectedOption.label);
    };

    const handleRoundNumberDropdownChange = (selectedOption) => {
        setRoundNumber(selectedOption.label);
    };

    const handleGenderDropdownChange = (selectedOption) => {
        setGender(selectedOption.label);
    };

    const handleExamDropdownChange = (selectedOption) => {
        setExam(selectedOption.label);
    };

    const handleStateNameDropdownChange = (selectedOption) => {
        setStateName(selectedOption.label);
    };

    const handleRankChange = (event) => {
        const enteredRank = event.target.value;
        setRank(enteredRank);
    };

    const handleSubmit = () => {
        if (exam == "NEET") {
            router.push(
                `/college_predictor?rank=${rank}&category=${category}&roundNumber=${roundNumber}&exam=${exam}`
            )
        } else {
        router.push(
            `/college_predictor?rank=${rank}&category=${category}&roundNumber=${roundNumber}&exam=${exam}&gender=${gender}&stateName=${stateName}`
        );
        }
    };

    const isCategoryInOptions = categoryOptions.some(
        (option) => option.label === category
    );
    const isRoundNumberInOptions = roundNumberOptions.some(
        (option) => option.label == roundNumber
    );
    const isGenderInOptions = genderOptions.some(
        (option) => option.label === gender
    );
    const isExamInOptions = examOptions.some(
        (option) => option.label === exam
    );
    const isStateNameInOptions = stateOptions.some(
        (option) => option.label === stateName
    );

    const isSubmitDisabled =
        rank <= 0 ||
        !isCategoryInOptions ||
        !isRoundNumberInOptions ||
        (exam !== "NEET" && (
            !isGenderInOptions ||
            !isExamInOptions ||
            !isStateNameInOptions
        ));

    return (
        <div className={styles.container}>
            <Script
                src="https://www.googletagmanager.com/gtag/js?id=G-FHGVRT52L7"
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                gtag('js', new Date());

                gtag('config', 'G-FHGVRT52L7');
                `}
            </Script>
            <div className={styles.content}>
                <h1>{getConstants().TITLE}</h1>
                <label className={styles.label}>
                    {getConstants().EXAM_LABEL}
                </label>
                <Dropdown
                    options={examOptions}
                    onChange={handleExamDropdownChange}
                />
                <p />
                <p />
                <label className={styles.label}>
                    {getConstants().CATEGORY_LABEL}
                </label>
                <Dropdown
                    options={categoryOptions}
                    onChange={handleCategoryDropdownChange}
                />
                <p />
                <p />
                <label className={styles.label}>
                    {exam === "NEET"
                        ? getConstants().NEET_RANK_LABEL + "(" + exam + "):"
                        : getConstants().RANK_LABEL + "(" + exam + "):"}
                </label>
                <input
                    type="number"
                    value={rank}
                    onChange={handleRankChange}
                    className={styles.input}
                />
                <p />
                <p />

                <label className={styles.label}>
                    {getConstants().ROUND_NUMBER_LABEL}
                </label>
                <Dropdown
                    options={roundNumberOptions}
                    onChange={handleRoundNumberDropdownChange}
                />
                <p />
                <p />
                {exam != "NEET" && (
                    <>
                       <label className={styles.label}>
                            {getConstants().GENDER_LABEL}
                        </label>
                        <Dropdown
                            options={genderOptions}
                            onChange={handleGenderDropdownChange}
                            isDisabled={exam === "NEET"}
                        />
                        <p />
                        <p />
                        <label className={styles.label}>
                            {getConstants().STATE_LABEL}
                        </label>
                        <Dropdown
                            options={stateOptions}
                            onChange={handleStateNameDropdownChange}
                            isDisabled={exam === "NEET"}
                        />
                        <p />
                    </>
                )}

                <button
                    className={styles.button}
                    onClick={handleSubmit}
                    disabled={isSubmitDisabled}
                >
                    Submit
                </button>
            </div>
        </div>
    );
};

export default HomePage;

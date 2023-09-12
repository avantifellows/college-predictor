import React, { useState } from "react";
import Script from "next/script";
import Dropdown from "../components/dropdown";
import { useRouter } from "next/router";
import styles from "./scholarships.module.css";
import Link from "next/link";
import getConstants from "../constants";

const ScholarshipPage = () => {
    const categoryOptions = getConstants().SCHOLARSHIP_CATEGORY_OPTIONS;

    const genderOptions = getConstants().SCHOLARSHIP_GENDER_OPTIONS;

    const statusOptions = getConstants().SCHOLARSHIP_STATUS_OPTIONS;

    const gradeOptions = getConstants().GRADE_OPTIONS;

    const stateOptions = getConstants().STATE_OPTIONS;

    const cityOptions = getConstants().CITY_OPTIONS;

    const streamOptions = getConstants().STREAM_OPTIONS;

    const [familyIncome, setFamilyIncome] = useState(0.0);
    const [category, setCategory] = useState("");
    const [gender, setGender] = useState("");
    const [status, setStatus] = useState("");
    const [grade, setGrade] = useState("");
    const [stream, setStream] = useState("");
    const [stateName, setStateName] = useState("");
    const [cityName, setCityName] = useState("");
    const router = useRouter();

    const handleCategoryDropdownChange = (selectedOption) => {
        setCategory(selectedOption.label);
    };

    const handleStatusDropdownChange = (selectedOption) => {
        setStatus(selectedOption.label);
    };

    const handleGradeDropdownChange = (selectedOption) => {
        setGrade(selectedOption.label);
    };

    const handleGenderDropdownChange = (selectedOption) => {
        setGender(selectedOption.label);
    };

    const handleStreamDropdownChange = (selectedOption) => {
        setStream(selectedOption.label);
    };

    const handleStateNameDropdownChange = (selectedOption) => {
        setStateName(selectedOption.label);
    };

    const handleCityNameDropdownChange = (selectedOption) => {
        setCityName(selectedOption.label);
    };

    const handleFamilyIncomeChange = (event) => {
        const enteredIncome = event.target.value;
        setFamilyIncome(enteredIncome);
    };

    const handleSubmit = () => {
        router.push(`/scholarship_finder?status=${status}&category=${category}&familyIncome=${familyIncome}&stream=${stream}&grade=${grade}&stateName=${stateName}&cityName=${cityName}&gender=${gender}`);

    };

    const isCategoryInOptions = categoryOptions.some(
        (option) => option.label === category
    );
    const isGenderInOptions = genderOptions.some(
        (option) => option.label === gender
    );
    const isGradeInOptions = gradeOptions.some(
        (option) => option.label === grade
    );
    const isStreamInOptions = streamOptions.some(
        (option) => option.label === stream
    );
    const isStatusInOptions = statusOptions.some(
        (option) => option.label === status
    );
    const isStateNameInOptions = stateOptions.some(
        (option) => option.label === stateName
    );
    const isCityNameInOptions = cityOptions.some(
        (option) => option.label === cityName
    );


    const isSubmitDisabled =
        familyIncome <= 0 ||
        !isCategoryInOptions ||
        !isStatusInOptions || 
        !isGenderInOptions ||
        !isStateNameInOptions ||
        !isCityNameInOptions ||
        !isStreamInOptions ||
        !isGradeInOptions;

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
                <Link href="/">
                    <h3>To find colleges relevant to you, click here</h3>
                </Link>
                <h1>{getConstants().SCHOLARSHIP_TITLE}</h1>
                <label className={styles.label}>
                    {getConstants().STATUS_LABEL}
                </label>
                <Dropdown
                    options={statusOptions}
                    onChange={handleStatusDropdownChange}
                />
                <p />
                <p />
                <label className={styles.label}>
                    {getConstants().GRADE_LABEL}
                </label>
                <Dropdown
                    options={gradeOptions}
                    onChange={handleGradeDropdownChange}
                />
                <p />
                <p />
                <label className={styles.label}>
                    {getConstants().STREAM_LABEL}
                </label>
                <Dropdown
                    options={streamOptions}
                    onChange={handleStreamDropdownChange}
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
                    {getConstants().FAMILY_INCOME_LABEL}
                </label>
                <br />
                <label className={styles.help_label}>
                    {getConstants().FAMILY_INCOME_HELP_TEXT}
                </label>
                <input
                    type="number"
                    value={familyIncome}
                    onChange={handleFamilyIncomeChange}
                    className={styles.input}
                />
                <p />
                <p />
                <label className={styles.label}>
                    {getConstants().GENDER_LABEL}
                </label>
                <Dropdown
                    options={genderOptions}
                    onChange={handleGenderDropdownChange}
                />
                <p />
                <p />
                <label className={styles.label}>
                    {getConstants().STATE_LABEL}
                </label>
                <Dropdown
                    options={stateOptions}
                    onChange={handleStateNameDropdownChange}
                />
                <p />
                <p />
                <label className={styles.label}>
                    {getConstants().CITY_LABEL}
                </label>
                <Dropdown
                    options={cityOptions}
                    onChange={handleCityNameDropdownChange}
                />
                <p />
                <p />

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

export default ScholarshipPage;

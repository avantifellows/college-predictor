import React, { useState } from "react";
import Script from "next/script";
import Dropdown from "../components/dropdown";
import { useRouter } from "next/router";
import getConstants from "../constants";

const ScholarshipPage = () => {
  const categoryOptions = getConstants().SCHOLARSHIP_CATEGORY_OPTIONS || [];

  const genderOptions = getConstants().SCHOLARSHIP_GENDER_OPTIONS || [];

  const statusOptions = getConstants().SCHOLARSHIP_STATUS_OPTIONS;

  const gradeOptions = getConstants().GRADE_OPTIONS;

  const stateOptions = getConstants().STATE_OPTIONS;

  const familyincomeOptions = getConstants().FAMILY_INCOME_OPTIONS;

  const cityOptions = getConstants().CITY_OPTIONS;

  const streamOptions = getConstants().STREAM_OPTIONS;

  const [familyIncome, setFamilyIncome] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const [grade, setGrade] = useState("");
  const [stream, setStream] = useState("");
  const [stateName, setStateName] = useState("");
  const [cityName, setCityName] = useState("");
  const router = useRouter();

  function incomeValueToFloat(value) {
    return parseFloat(value.split("_")[0]);
  }

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

  const handleFamilyIncomeChange = (selectedOption) => {
    const floatValue = incomeValueToFloat(selectedOption.value);
    setFamilyIncome(floatValue);
  };

  const handleSubmit = () => {
    router.push(
      `/scholarship_finder?status=${status}&category=${category}&familyIncome=${familyIncome}&stream=${stream}&grade=${grade}&stateName=${stateName}&cityName=${cityName}&gender=${gender}`
    );
  };

  const isSubmitDisabled =
    !familyIncome ||
    !category ||
    !status ||
    !gender ||
    !stateName ||
    !cityName ||
    !stream ||
    !grade;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <div className="flex flex-col justify-center items-center flex-grow px-10">
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
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 ">
          <h1 className="text-2xl font-bold text-center mb-6">
            {getConstants().SCHOLARSHIP_TITLE}
          </h1>
          <div className="mb-4 flex gap-4">
            <div className="flex-1">
              <label className="block text-gray-700 font-semibold mb-2">
                {getConstants().STATUS_LABEL}
              </label>
              <Dropdown
                options={statusOptions}
                onChange={handleStatusDropdownChange}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-gray-700 font-semibold mb-2">
                {getConstants().GRADE_LABEL}
              </label>
              <Dropdown
                options={gradeOptions}
                onChange={handleGradeDropdownChange}
                className="w-full"
              />
            </div>
          </div>{" "}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              {getConstants().STREAM_LABEL}
            </label>
            <Dropdown
              options={streamOptions}
              onChange={handleStreamDropdownChange}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              {getConstants().CATEGORY_LABEL}
            </label>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getConstants().CATEGORY_HELP_TEXT}
            </label>
            <Dropdown
              options={categoryOptions}
              onChange={handleCategoryDropdownChange}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              {getConstants().FAMILY_INCOME_LABEL}
            </label>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getConstants().FAMILY_INCOME_HELP_TEXT}
            </label>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getConstants().FAMILY_INCOME_HELP_TEXT_TWO}
            </label>
            <Dropdown
              options={familyincomeOptions}
              onChange={handleFamilyIncomeChange}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              {getConstants().GENDER_LABEL}
            </label>
            <Dropdown
              options={genderOptions}
              onChange={handleGenderDropdownChange}
              className="w-full"
            />
          </div>
          <div className="mb-4 flex gap-4">
            <div className="flex-1">
              <label className="block text-gray-700 font-semibold mb-2">
                {getConstants().STATE_LABEL}
              </label>
              <Dropdown
                options={stateOptions}
                onChange={handleStateNameDropdownChange}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-gray-700 font-semibold mb-2">
                {getConstants().CITY_LABEL}
              </label>
              <Dropdown
                options={cityOptions}
                onChange={handleCityNameDropdownChange}
                className="w-full"
              />
              <p />
              <p />
            </div>
          </div>
          <button
            className={` w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 focus:ring-offset-indigo-200 text-white transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg ${
              isSubmitDisabled ? "bg-gray-300 cursor-not-allowed" : ""
            }`}
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScholarshipPage;

import React, { useState, useEffect } from "react";
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
  const examOptions = getConstants().EXAM_OPTIONS;

  const [familyIncome, setFamilyIncome] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const [grade, setGrade] = useState("");
  const [stream, setStream] = useState("");
  const [stateName, setStateName] = useState("");
  const [cityName, setCityName] = useState("");
  const [isClient, setIsClient] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const dropdownProps = {
    menuPortalTarget: isClient ? document.body : null,
    styles: isClient
      ? {
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        }
      : {},
    className: "w-full",
  };

  return (
    <div className="flex flex-col justify-start items-center w-full mt-8 pb-10">
      <div className="text-center flex flex-col items-center w-full sm:w-3/4 md:w-2/3 lg:w-1/2">
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
        <h1 className="text-2xl md:text-3xl font-bold mb-6">
          {getConstants().SCHOLARSHIP_TITLE}
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap w-full justify-center">
          <div className="my-4 w-full sm:w-1/2">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              {getConstants().STATUS_LABEL}
            </label>
            <Dropdown
              options={statusOptions}
              onChange={handleStatusDropdownChange}
              {...dropdownProps}
            />
          </div>
          <div className="my-4 w-full sm:w-1/2">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              {getConstants().GRADE_LABEL}
            </label>
            <Dropdown
              options={gradeOptions}
              onChange={handleGradeDropdownChange}
              {...dropdownProps}
            />
          </div>
          <div className="my-4 w-full sm:w-1/2">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              {getConstants().STREAM_LABEL}
            </label>
            <Dropdown
              options={streamOptions}
              onChange={handleStreamDropdownChange}
              {...dropdownProps}
            />
          </div>
          <div className="my-4 w-full sm:w-1/2">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              {getConstants().CATEGORY_LABEL}
            </label>
            <Dropdown
              options={categoryOptions}
              onChange={handleCategoryDropdownChange}
              {...dropdownProps}
            />
            <p className="text-sm text-gray-700 mt-1">
              {getConstants().CATEGORY_HELP_TEXT}
            </p>
          </div>
          <div className="my-4 w-full sm:w-1/2">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              {getConstants().FAMILY_INCOME_LABEL}
            </label>
            <Dropdown
              options={familyincomeOptions}
              onChange={handleFamilyIncomeChange}
              {...dropdownProps}
            />
            <p className="text-sm text-gray-700 mt-1">
              {getConstants().FAMILY_INCOME_HELP_TEXT}
            </p>
            <p className="text-sm text-gray-700">
              {getConstants().FAMILY_INCOME_HELP_TEXT_TWO}
            </p>
          </div>
          <div className="my-4 w-full sm:w-1/2">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              {getConstants().GENDER_LABEL}
            </label>
            <Dropdown
              options={genderOptions}
              onChange={handleGenderDropdownChange}
              {...dropdownProps}
            />
          </div>
          <div className="my-4 w-full sm:w-1/2">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              {getConstants().STATE_LABEL}
            </label>
            <Dropdown
              options={stateOptions}
              onChange={handleStateNameDropdownChange}
              {...dropdownProps}
            />
          </div>
          <div className="my-4 w-full sm:w-1/2">
            <label className="block text-md font-semibold text-gray-700 mb-2">
              {getConstants().CITY_LABEL}
            </label>
            <Dropdown
              options={cityOptions}
              onChange={handleCityNameDropdownChange}
              {...dropdownProps}
            />
          </div>
        </div>
        <button
          className={`mt-6 px-8 py-2.5 rounded-lg bg-red-600 text-white cursor-pointer hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed`}
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

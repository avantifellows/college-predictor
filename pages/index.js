import React, { useState } from "react";
import Script from "next/script";
import Dropdown from "../components/dropdown";
import { useRouter } from "next/router";

import getConstants from "../constants";

const HomePage = () => {
  const categoryOptions = getConstants().CATEGORY_OPTIONS;
  const genderOptions = getConstants().GENDER_OPTIONS;
  const roundNumberOptions = getConstants().ROUND_NUMBER_OPTIONS;
  const examOptions = getConstants().EXAM_OPTIONS;
  const stateOptions = getConstants().STATE_OPTIONS;

  const [rank, setRank] = useState("");
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
    setRank(event.target.value);
  };

  const handleSubmit = () => {
    const queryParams = {
      rank,
      category,
      roundNumber,
      exam,
      ...(exam !== "NEET" && { gender, stateName })
    };
    const queryString = Object.keys(queryParams)
      .map((key) => `${key}=${queryParams[key]}`)
      .join("&");
    router.push(`/college_predictor?${queryString}`);
  };

  const isCategoryInOptions = categoryOptions.some(
    (option) => option.label === category
  );
  const isRoundNumberInOptions = roundNumberOptions.some(
    (option) => option.label === roundNumber
  );
  const isGenderInOptions = genderOptions.some(
    (option) => option.label === gender
  );
  const isExamInOptions = examOptions.some((option) => option.label === exam);
  const isStateNameInOptions = stateOptions.some(
    (option) => option.label === stateName
  );

  const isSubmitDisabled =
    !rank ||
    !isCategoryInOptions ||
    !isRoundNumberInOptions ||
    (exam !== "NEET" &&
      (!isGenderInOptions || !isExamInOptions || !isStateNameInOptions));

  return (
    <div className="flex flex-col h-screen justify-center items-center bg-gray-100">
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
      <div className="text-center flex flex-col items-center w-full md:w-1/2 p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-xl font-semibold mb-4">{getConstants().TITLE}</h1>
        <div className="flex flex-wrap justify-between w-full mb-4">
          <label className="block w-full lg:w-1/3 font-semibold text-gray-700">
            {getConstants().EXAM_LABEL}
          </label>
          <div className="w-full lg:w-2/3">
            <Dropdown
              options={examOptions}
              onChange={handleExamDropdownChange}
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-between w-full mb-4">
          <label className="block w-full lg:w-1/3 font-semibold text-gray-700">
            {getConstants().CATEGORY_LABEL}
          </label>
          <div className="w-full lg:w-2/3">
            <Dropdown
              options={categoryOptions}
              onChange={handleCategoryDropdownChange}
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-between w-full mb-4">
          <label className="block w-full lg:w-1/3 font-semibold text-gray-700">
            {exam === "NEET"
              ? `${getConstants().NEET_RANK_LABEL} (${exam}):`
              : `${getConstants().RANK_LABEL} (${exam}):`}
          </label>
          <div className="w-full lg:w-2/3">
            <input
              type="number"
              value={rank}
              onChange={handleRankChange}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder="Enter rank"
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-between w-full mb-4">
          <label className="block w-full lg:w-1/3 font-semibold text-gray-700">
            {getConstants().ROUND_NUMBER_LABEL}
          </label>
          <div className="w-full lg:w-2/3">
            <Dropdown
              options={roundNumberOptions}
              onChange={handleRoundNumberDropdownChange}
            />
          </div>
        </div>
        {exam !== "NEET" && (
          <>
            <div className="flex flex-wrap justify-between w-full mb-4">
              <label className="block w-full lg:w-1/3 font-semibold text-gray-700">
                {getConstants().GENDER_LABEL}
              </label>
              <div className="w-full lg:w-2/3">
                <Dropdown
                  options={genderOptions}
                  onChange={handleGenderDropdownChange}
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-between w-full mb-4">
              <label className="block w-full lg:w-1/3 font-semibold text-gray-700">
                {getConstants().STATE_LABEL}
              </label>
              <div className="w-full lg:w-2/3">
                <Dropdown
                  options={stateOptions}
                  onChange={handleStateNameDropdownChange}
                />
              </div>
            </div>
          </>
        )}
        <button
          className={`mt-4 px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed border border-transparent focus:outline-none focus:border-red-700`}
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

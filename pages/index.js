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
      );
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
  const isExamInOptions = examOptions.some((option) => option.label === exam);
  const isStateNameInOptions = stateOptions.some(
    (option) => option.label === stateName
  );

  const isSubmitDisabled =
    rank <= 0 ||
    !isCategoryInOptions ||
    !isRoundNumberInOptions ||
    (exam !== "NEET" &&
      (!isGenderInOptions || !isExamInOptions || !isStateNameInOptions));

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-center items-center flex-col flex-grow px-10">
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
        <div className="md:text-xl lg:text-2xl text-sm text-center flex flex-col items-center w-full md:w-1/2  ">
          <h1 className="text-md font-semibold">{getConstants().TITLE}</h1>
          <label className="mt-4 w-full block text-md font-semibold text-gray-700 m-2">
            {getConstants().EXAM_LABEL}
          </label>
          <Dropdown options={examOptions} onChange={handleExamDropdownChange} />
          <div className="flex gap-4 flex-wrap">
            <div className="my-4 w-full">
              <label className="block text-md font-semibold text-gray-700 m-2">
                {getConstants().CATEGORY_LABEL}
              </label>
              <Dropdown
                options={categoryOptions}
                onChange={handleCategoryDropdownChange}
              />
            </div>
            <div className="my-4 w-full">
              <label className="block text-md font-semibold text-gray-700 m-2">
                {exam === "NEET"
                  ? getConstants().NEET_RANK_LABEL + "(" + exam + "):"
                  : getConstants().RANK_LABEL + "(" + exam + "):"}
              </label>
              <input
                type="number"
                value={rank}
                onChange={handleRankChange}
                className=" border border-gray-300 rounded w-1/3 md:w-1/2 lg:w-full"
              />
            </div>
          </div>
          <div className="my-4 w-full">
            <label className="block text-md font-semibold text-gray-700 m-2">
              {getConstants().ROUND_NUMBER_LABEL}
            </label>
            <Dropdown
              options={roundNumberOptions}
              onChange={handleRoundNumberDropdownChange}
            />
          </div>
          {exam != "NEET" && (
            <>
              <div className="my-4 w-full">
                <label className="block text-md font-semibold text-gray-700 m-2">
                  {getConstants().GENDER_LABEL}
                </label>
                <Dropdown
                  options={genderOptions}
                  onChange={handleGenderDropdownChange}
                  isDisabled={exam === "NEET"}
                />
              </div>
              <div className="my-4 w-full">
                <label className="block text-md font-semibold text-gray-700 m-2">
                  {getConstants().STATE_LABEL}
                </label>
                <Dropdown
                  options={stateOptions}
                  onChange={handleStateNameDropdownChange}
                  isDisabled={exam === "NEET"}
                />
              </div>
            </>
          )}

          <button
            className="mt-2 px-5 py-2 rounded-lg bg-red-600 text-white cursor-pointer hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
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

export default HomePage;

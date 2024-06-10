import React, { useState } from "react";
import Script from "next/script";
import Dropdown from "../components/dropdown";
import { useRouter } from "next/router";
import getConstants from "../constants";

const HomePage = () => {
  const categoryOptions = getConstants().CATEGORY_OPTIONS;
  const mhtcetCategoryOptions = getConstants().MHTCET_CATEGORY_OPTIONS;
  const kcetCategoryOptions = getConstants().KCET_CATEGORY_OPTIONS;
  const jacCategoryOptions = getConstants().JAC_CATEGORY_OPTIONS;

  const genderOptions = getConstants().GENDER_OPTIONS;
  const mhtcetGenderOptions = getConstants().MHTCET_GENDER_OPTIONS;

  const roundNumberOptions = getConstants().ROUND_NUMBER_OPTIONS;

  const pwdOptions = getConstants().MHTCET_PWD_OPTIONS;

  const defenseOptions = getConstants().MHTCET_DEFENSE_OPTIONS;

  const courseTypeOptions = getConstants().KCET_COURSETYPE_OPTIONS;

  const examOptions = getConstants().EXAM_OPTIONS;

  const stateOptions = getConstants().STATE_OPTIONS;
  const mhtcetStateOptions = getConstants().MHTCET_STATE_OPTIONS;
  const kcetStateOptions = getConstants().KCET_STATE_OPTIONS;
  const jacStateOptions = getConstants().JAC_STATE_OPTIONS;

  const counsellingOptions = getConstants().COUNSELLING_OPTIONS;

  const kcetLanguageOptions = getConstants().KCET_LANGUAGE_OPTIONS;

  const kcetRuralOptions = getConstants().KCET_RURAL_OPTIONS;

  const [rank, setRank] = useState(0);
  const [roundNumber, setRoundNumber] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [exam, setExam] = useState("");
  const [stateName, setStateName] = useState("");
  const [defense, setDefense] = useState("");
  const [courseType, setCourseType] = useState("");
  const [pwd, setPwd] = useState("");
  const [language, setLanguage] = useState("");
  const [rural, setRural] = useState("");
  const [counselling, setCounselling] = useState("");
  const router = useRouter();

  const handleCategoryDropdownChange = (selectedOption) => {
    setCategory(selectedOption.label);
  };

  const handleCounsellingDropdownChange = (selectedOption) => {
    setCounselling(selectedOption.label);
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

  const handleCourseTypeDropdownChange = (selectedOption) => {
    setCourseType(selectedOption.label);
  };

  const handleStateNameDropdownChange = (selectedOption) => {
    setStateName(selectedOption.label);
  };

  const handlePwdDropdownChange = (selectedOption) => {
    setPwd(selectedOption.label);
  };

  const handleDefenseDropdownChange = (selectedOption) => {
    setDefense(selectedOption.label);
  };

  const handleRankChange = (event) => {
    const enteredRank = event.target.value;
    setRank(enteredRank);
  };

  const handleRuralChange = (selectedOption) => {
    setRural(selectedOption.label);
  };

  const handleLanguageChange = (selectedOption) => {
    setLanguage(selectedOption.label);
  };

  const handleSubmit = () => {
    if (exam === "NEET") {
      router.push(
        `/college_predictor?rank=${rank}&category=${category}&roundNumber=${roundNumber}&exam=${exam}`
      );
    } else if (exam === "JEE Main" || exam === "JEE Advanced") {
      if (counselling == "JAC") {
        router.push(
          `/college_predictor?rank=${rank}&category=${category}&exam=${exam}&counselling=${counselling}&gender=${gender}&stateName=${stateName}&pwd=${pwd}&defense=${defense}`
        );
      } else {
        router.push(
          `/college_predictor?rank=${rank}&category=${category}&roundNumber=${roundNumber}&exam=${exam}&gender=${gender}&stateName=${stateName}`
        );
      }
      
    } else if (exam === "MHT CET") {
      router.push(
        `/college_predictor?rank=${rank}&category=${category}&exam=${exam}&gender=${gender}&stateName=${stateName}&defense=${defense}&pwd=${pwd}`
      );
    } else if (exam === "KCET") {
      router.push(
        `/college_predictor?rank=${rank}&category=${category}&exam=${exam}&stateName=${stateName}&rural=${rural}&language=${language}&courseType=${courseType}`
      );
    }
  };

  const isCategoryInOptions = categoryOptions.some(
    (option) => option.label === category
  );
  const isCounsellingInOptions = counsellingOptions.some(
    (option) => option.label === counselling
  );
  const isCourseTypeInOptions = courseTypeOptions.some(
    (option) => option.label === courseType
  );
  const isMhtcetCategoryInOptions = mhtcetCategoryOptions.some(
    (option) => option.label === category
  );
  const isKcetCategoryInOptions = kcetCategoryOptions.some(
    (option) => option.label === category
  );
  const isJacCategoryInOptions = jacCategoryOptions.some(
    (option) => option.label === category
  );
  const isRoundNumberInOptions = roundNumberOptions.some(
    (option) => option.label === roundNumber
  );
  const isGenderInOptions = genderOptions.some(
    (option) => option.label === gender
  );
  const isMhtcetGenderInOptions = mhtcetGenderOptions.some(
    (option) => option.label === gender
  );
  const isExamInOptions = examOptions.some((option) => option.label === exam);
  const isStateNameInOptions = stateOptions.some(
    (option) => option.label === stateName
  );
  const isMhtcetStateNameInOptions = mhtcetStateOptions.some(
    (option) => option.label === stateName
  );
  const isKcetStateNameInOptions = kcetStateOptions.some(
    (option) => option.label === stateName
  );
  const isJacStateNameInOptions = jacStateOptions.some(
    (option) => option.label === stateName
  );
  const isDefenseInOptions = defenseOptions.some(
    (option) => option.label === defense
  );
  const isPwdInOptions = pwdOptions.some(
    (option) => option.label === pwd
  );
  const isLanguageInOptions = kcetLanguageOptions.some(
    (option) => option.label === language
  );
  const isRuralInOptions = kcetRuralOptions.some(
    (option) => option.label === rural
  );


  const isSubmitDisabled =
    rank <= 0 ||
    ((exam !== "MHT CET" && exam !== "KCET" && counselling !== "JAC") &&
      (!isCategoryInOptions || !isRoundNumberInOptions)) ||
    (((exam === "JEE Main" && counselling === "JOSAA") || exam === "JEE Advanced") &&
      (!isGenderInOptions || !isExamInOptions || !isStateNameInOptions)) ||
    ((exam === "JEE Main" && counselling === "JAC") && 
      (!isJacCategoryInOptions || !isJacStateNameInOptions || !isMhtcetGenderInOptions || !isPwdInOptions || !isDefenseInOptions)) ||
    (exam === "MHT CET" &&
      (!isMhtcetCategoryInOptions || !isMhtcetGenderInOptions || !isMhtcetStateNameInOptions ||
       !isDefenseInOptions || !isPwdInOptions)) ||
    (exam === "KCET" && 
      (!isKcetCategoryInOptions || !isKcetStateNameInOptions || !isLanguageInOptions || !isRuralInOptions || !isCourseTypeInOptions)
    );

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-center items-center flex-col flex-grow px-4 sm:px-10">
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
        <div className="text-center flex flex-col items-center w-full sm:w-3/4 md:w-2/3 lg:w-1/2 mt-8 pb-10 border-b-2 border-gray-200">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">{getConstants().TITLE}</h1>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap w-full">
            <div className="my-4 w-full">
            <label className="block text-md font-semibold text-gray-700 mb-2">
                {getConstants().EXAM_LABEL}
              </label>
              <Dropdown
                options={examOptions}
                onChange={handleExamDropdownChange}
                className="w-full"
              />
            </div>
            {(exam == "JEE Main") && (
            <div className="my-4 w-full">
              <label className="block text-md font-semibold text-gray-700 mb-2">
                {getConstants().COUNSELLING_LABEL}
              </label>
              <Dropdown
                options={counsellingOptions}
                onChange={handleCounsellingDropdownChange}
                isDisabled={exam !== "JEE Main"}
                className="w-full"
              />
            </div>
            )}
            <div className="my-4 w-full">
              <label className="block text-md font-semibold text-gray-700 mb-2">
                {getConstants().CATEGORY_LABEL}
              </label>
              <Dropdown
                options={
                  exam === "MHT CET"
                    ? mhtcetCategoryOptions
                    : exam === "KCET"
                    ? kcetCategoryOptions
                    : (exam === "JEE Main" && counselling === "JAC")
                    ? jacCategoryOptions
                    : categoryOptions
                }
                onChange={handleCategoryDropdownChange}
                className="w-full"
              />
            </div>
            {exam === "KCET" && (
            <>
              <div className="my-4 w-full">
                <label className="block text-md font-semibold text-gray-700 mb-2">
                  {getConstants().KCET_COURSETYPE_LABEL}
                </label>
                <Dropdown
                  options={courseTypeOptions}
                  onChange={handleCourseTypeDropdownChange}
                  isDisabled={exam !== "KCET"}
                  className="w-full"
                />
              </div>
            </>
          )}
            <div className="my-4 w-full">
              <label className="block text-md font-semibold text-gray-700 mb-2">
                {exam === "NEET" || exam === "MHT CET" || exam === "KCET" || (exam === "JEE Main" && counselling === "JAC")
                  ? `${getConstants().NEET_RANK_LABEL} (${exam}):`
                  : `${getConstants().RANK_LABEL} (${exam}):`}
              </label>
              <input
                type="number"
                value={rank}
                onChange={handleRankChange}
                className="border border-gray-300 rounded w-full p-2 text-center"
              />
            </div>
          </div>
          {(exam !== "MHT CET" && exam !== "KCET" && counselling !== "JAC") && (
            <div className="my-4 w-full">
              <label className="block text-md font-semibold text-gray-700 mb-2">
                {getConstants().ROUND_NUMBER_LABEL}
              </label>
              <Dropdown
                options={roundNumberOptions}
                onChange={handleRoundNumberDropdownChange}
                isDisabled={exam === "MHT CET" || exam === "KCET" || counselling === "JAC"}
                className="w-full"
              />
            </div>
          )}
          {(exam !== "NEET" && exam !== "KCET") && (
            <div className="my-4 w-full">
              <label className="block text-md font-semibold text-gray-700 mb-2">
                {getConstants().GENDER_LABEL}
              </label>
              <Dropdown
                options={exam === "MHT CET" || counselling === "JAC" ? mhtcetGenderOptions : genderOptions}
                onChange={handleGenderDropdownChange}
                isDisabled={exam === "NEET" || exam === "KCET"}
                className="w-full"
              />
            </div>
          )}
          {exam !== "NEET" && (
            <div className="my-4 w-full">
              <label className="block text-md font-semibold text-gray-700 mb-2">
                {getConstants().STATE_LABEL}
              </label>
              <Dropdown
                options={
                  exam === "MHT CET"
                    ? mhtcetStateOptions
                    : exam === "KCET"
                    ? kcetStateOptions
                    : (exam === "JEE Main" && counselling === "JAC")
                    ? jacStateOptions
                    : stateOptions
                }
                onChange={handleStateNameDropdownChange}
                isDisabled={exam === "NEET"}
                className="w-full max-h-40 overflow-y-auto"
              />
            </div>
          )}
          {(exam === "MHT CET" || counselling === "JAC") && (
            <>
              <div className="my-4 w-full">
                <label className="block text-md font-semibold text-gray-700 mb-2">
                  {getConstants().MHTCET_PWD_LABEL}
                </label>
                <Dropdown
                  options={pwdOptions}
                  onChange={handlePwdDropdownChange}
                  isDisabled={exam !== "MHT CET" && counselling !== "JAC"}
                  className="w-full"
                />
              </div>
              <div className="my-4 w-full">
                <label className="block text-md font-semibold text-gray-700 mb-2">
                  {getConstants().MHTCET_DEFENSE_LABEL}
                </label>
                <Dropdown
                  options={defenseOptions}
                  onChange={handleDefenseDropdownChange}
                  isDisabled={exam !== "MHT CET" && counselling !== "JAC"}
                  className="w-full"
                />
              </div>
            </>
          )}
          {exam === "KCET" && (
            <>
              <div className="my-4 w-full">
                <label className="block text-md font-semibold text-gray-700 mb-2">
                  {getConstants().KCET_LANGUAGE_LABEL}
                </label>
                <Dropdown
                  options={kcetLanguageOptions}
                  onChange={handleLanguageChange}
                  isDisabled={exam !== "KCET"}
                  className="w-full"
                />
              </div>
              <div className="my-4 w-full">
                <label className="block text-md font-semibold text-gray-700 mb-2">
                  {getConstants().KCET_RURAL_LABEL}
                </label>
                <Dropdown
                  options={kcetRuralOptions}
                  onChange={handleRuralChange}
                  isDisabled={exam !== "KCET"}
                  className="w-full"
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

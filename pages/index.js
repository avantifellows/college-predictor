import React, { useState } from "react";
import Script from "next/script";
import getConstants from "../constants";
import examConfigs from "../examConfig";
import { useRouter } from "next/router";
import Head from "next/head";
import dynamic from "next/dynamic";
import TneaScoreCalculator from "../components/TneaScoreCalculator";

// Dynamically import Dropdown with SSR disabled
const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

const ExamForm = () => {
  const [selectedExam, setSelectedExam] = useState("");
  const [formData, setFormData] = useState({});
  const [config, setConfig] = useState(null);
  const [rankError, setRankError] = useState("");
  const router = useRouter();

  const handleExamChange = (selectedOption) => {
    setSelectedExam(selectedOption.value);
    setConfig(examConfigs[selectedOption.value]);
    const baseFormData = {
      exam: selectedOption.value,
      rank: selectedOption.value === "TNEA" ? "" : 0,
    };
    if (selectedOption.code !== undefined) {
      baseFormData.code = selectedOption.code;
    }
    setFormData(baseFormData);
  };

  const handleInputChange = (name) => (selectedOption) => {
    const newFormData = {
      ...formData,
      [name]: selectedOption.label,
    };

    // If this is JoSAA exam and the user is changing qualifiedJeeAdv
    if (selectedExam === "JoSAA" && name === "qualifiedJeeAdv") {
      // If they select "No", remove advRank if it exists
      if (selectedOption.label === "No" && newFormData.advRank) {
        delete newFormData.advRank;
      }
    }

    setFormData(newFormData);
  };

  const handleRankChange = (e) => {
    const enteredRank = e.target.value;
    const newFormData = {
      ...formData,
    };

    // If this is JoSAA exam, set mainRank directly instead of using rank
    if (selectedExam === "JoSAA") {
      newFormData.mainRank = enteredRank;
    } else {
      // For other exams, use the general rank parameter
      newFormData.rank = enteredRank;
    }

    setFormData(newFormData);
  };

  const handleAdvancedRankChange = (e) => {
    let enteredRank = e.target.value;

    // Validate input format: must be a positive integer or positive integer followed by 'P' or 'p'
    const isValidFormat = /^\d+[pP]?$/.test(enteredRank) || enteredRank === "";

    if (!isValidFormat) {
      setRankError("Please enter a valid rank (e.g., 104 or 104P)");
    } else {
      setRankError("");
    }

    // Convert lowercase 'p' to uppercase 'P' if it's the last character
    if (enteredRank.endsWith("p")) {
      enteredRank = enteredRank.slice(0, -1) + "P";
    }

    setFormData((prevData) => ({
      ...prevData,
      advRank: enteredRank,
    }));
  };

  const handleTneaScoreChange = (score, physics, chemistry, maths) => {
    setFormData((prevData) => ({
      ...prevData,
      rank: score,
      physicsMarks: physics,
      chemistryMarks: chemistry,
      mathsMarks: maths,
    }));
  };

  const handleSubmit = async () => {
    // For JoSAA exam
    if (selectedExam === "JoSAA") {
      // Validate mainRank is provided
      if (!formData.mainRank || formData.mainRank === "") {
        alert("Please enter your JEE Main rank.");
        return;
      }

      // Validate JEE Advanced rank if user selected Yes for JEE Advanced qualification
      if (
        formData.qualifiedJeeAdv === "Yes" &&
        (!formData.advRank || formData.advRank === "")
      ) {
        alert(
          "Please enter your JEE Advanced rank since you qualified for JEE Advanced."
        );
        return;
      }

      // Remove general rank parameter for JoSAA if it exists
      const cleanedFormData = { ...formData };
      if (cleanedFormData.rank) {
        delete cleanedFormData.rank;
      }

      const queryString = Object.entries(cleanedFormData)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
      router.push(`/college_predictor?${queryString}`);
    } else {
      // For other exams, proceed as usual
      const queryString = Object.entries(formData)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
      router.push(`/college_predictor?${queryString}`);
    }
  };

  const isSubmitDisabled = () => {
    // For TNEA exam
    if (selectedExam === "TNEA") {
      return (
        !formData.rank ||
        formData.rank === "" ||
        Object.entries(formData)
          .filter(
            ([key]) =>
              ![
                "rank",
                "physicsMarks",
                "chemistryMarks",
                "mathsMarks",
              ].includes(key)
          )
          .some(([_, value]) => !value)
      );
    }

    // For JoSAA exam with JEE Advanced qualification
    if (selectedExam === "JoSAA") {
      // Basic validation for all JoSAA fields
      const requiredFields = [
        "exam",
        "category",
        "gender",
        "program",
        "homeState",
        "qualifiedJeeAdv",
        "mainRank",
      ];
      const missingRequiredField = requiredFields.some(
        (field) => !formData[field]
      );

      // If user qualified for JEE Advanced, also require advRank
      if (formData.qualifiedJeeAdv === "Yes") {
        return (
          missingRequiredField || !formData.advRank || formData.advRank === ""
        );
      }

      return (
        missingRequiredField || !formData.mainRank || formData.mainRank === ""
      );
    }

    // For all other exams
    return (
      !formData.rank ||
      formData.rank === "" ||
      formData.rank === 0 ||
      Object.entries(formData)
        .filter(([key]) => key !== "rank")
        .some(([_, value]) => !value)
    );
  };

  const renderFields = () => {
    if (!selectedExam) return null;

    if (!config) return null;

    return config.fields.map((field) => (
      <div key={field.name} className="my-4 w-full sm:w-3/4">
        <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-4">
          {typeof field.label === "function"
            ? field.label(formData)
            : field.label}
        </label>
        <Dropdown
          options={field.options.map((option) =>
            typeof option === "string"
              ? { value: option, label: option }
              : option
          )}
          onChange={handleInputChange(field.name)}
          className="w-full"
        />
      </div>
    ));
  };

  return (
    <>
      <Head>
        <title>College Predictor - Home</title>
      </Head>
      <div className="flex flex-col h-fit">
        <div className="flex flex-col justify-start items-center w-full mt-8 pb-10">
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
          <div className="text-center flex flex-col items-center w-full sm:w-3/4 md:w-2/3 lg:w-1/2 mt-8 p-8 pb-10 bg-[#f8f9fa] shadow-inner drop-shadow-md rounded-md">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">
              {getConstants().TITLE}
            </h1>

            {/* TGEAPCET Disclaimer - Shows when EWS category is selected */}
            {selectedExam === "TGEAPCET" && formData.category === "EWS" && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 w-full">
                <p className="text-red-700 text-sm">
                  Showing OC category data as EWS-specific data is limited.
                </p>
              </div>
            )}

            <div className="flex flex-col justify-center sm:flex-row flex-wrap w-full">
              <div className="my-4 w-full sm:w-3/4">
                <label
                  htmlFor="exam"
                  className="block text-md font-semibold text-gray-700 mb-2 -translate-x-4"
                >
                  Select Exam/Counselling Process
                </label>
                <Dropdown
                  options={Object.keys(examConfigs)
                    .filter(
                      (exam) =>
                        exam !== "JEE Main-JOSAA" &&
                        exam !== "JEE Advanced" &&
                        exam !== "NEET"
                    ) // Temporarily removed JEE MAIN/Advanced(merged into JOSSA) and NEET(cus of old data)
                    .map((exam) => ({
                      value: exam,
                      label: exam,
                      code: examConfigs[exam].code,
                      apiEndpoint: examConfigs[exam].apiEndpoint,
                    }))}
                  onChange={handleExamChange}
                  className="w-full"
                />
              </div>
              {renderFields()}

              {selectedExam && selectedExam === "TNEA" ? (
                <TneaScoreCalculator onScoreChange={handleTneaScoreChange} />
              ) : (
                selectedExam && (
                  <>
                    <div className="my-4 w-full sm:w-3/4">
                      <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                        {selectedExam === "JEE Main-JAC"
                          ? "Enter All India Rank"
                          : selectedExam === "JoSAA"
                          ? "Enter JEE Main Category Rank"
                          : "Enter Category Rank"}
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={
                          selectedExam === "JoSAA"
                            ? formData.mainRank || ""
                            : formData.rank || ""
                        }
                        onChange={handleRankChange}
                        className="border border-gray-300 rounded w-full p-2 text-center"
                        placeholder={
                          selectedExam === "JEE Main-JAC"
                            ? "Enter All India Rank"
                            : selectedExam === "JoSAA"
                            ? "Enter JEE Main rank"
                            : "Enter your rank"
                        }
                      />
                    </div>

                    {/* JEE Advanced Rank input field - only show if user selected Yes for qualifiedJeeAdv */}
                    {selectedExam === "JoSAA" &&
                      formData.qualifiedJeeAdv === "Yes" && (
                        <div className="my-4 w-full sm:w-3/4">
                          <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                            Enter JEE Advanced Category Rank
                          </label>
                          <div className="flex flex-col w-full">
                            <input
                              type="string"
                              step="1"
                              value={formData.advRank || ""}
                              onChange={handleAdvancedRankChange}
                              onKeyDown={(e) => {
                                if (
                                  [".", "e", "E", "+", "-", " "].includes(e.key)
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              className={`border ${
                                rankError ? "border-red-500" : "border-gray-300"
                              } rounded w-full p-2 text-center`}
                              placeholder="e.g., 104 or 104P"
                            />
                            {rankError && (
                              <p className="text-red-500 text-sm mt-1">
                                {rankError}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Enter rank (e.g., 104) or rank with 'P' suffix
                              (e.g., 104P)
                            </p>
                          </div>
                        </div>
                      )}
                  </>
                )
              )}
            </div>

            {selectedExam && (
              <>
                <button
                  className="mt-2 px-5 py-2 rounded-lg bg-red-600 text-white cursor-pointer hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed -translate-x-4"
                  disabled={isSubmitDisabled()}
                  onClick={handleSubmit}
                >
                  Submit
                </button>
                {isSubmitDisabled() && (
                  <p className="text-red-600 text-sm mt-2 -translate-x-4">
                    {selectedExam === "JoSAA" &&
                    formData.qualifiedJeeAdv === "Yes" &&
                    (!formData.advRank || formData.advRank === "")
                      ? "Please enter your JEE Advanced rank."
                      : selectedExam === "JoSAA" &&
                        (!formData.mainRank || formData.mainRank === "")
                      ? "Please enter your JEE Main rank."
                      : "Please fill all the required fields before submitting!"}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ExamForm;

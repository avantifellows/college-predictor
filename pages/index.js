import React, { useState } from "react";
import Script from "next/script";
import getConstants from "../constants";
import examConfigs from "../examConfig";
import Dropdown from "../components/dropdown";
import { useRouter } from "next/router";
import Head from "next/head";

const ExamForm = () => {
  const [selectedExam, setSelectedExam] = useState("");
  const [formData, setFormData] = useState({});
  const [config, setConfig] = useState(null);
  const [inputError, setInputError] = useState(""); // State for input error
  const router = useRouter();

  const handleExamChange = (selectedOption) => {
    setSelectedExam(selectedOption.value);
    setConfig(examConfigs[selectedOption.value]);
    if (selectedOption.code !== undefined) {
      setFormData({
        exam: selectedOption.value,
        rank: 0, // rank is set to 0 (a valid number)
        code: selectedOption.code,
      });
    } else {
      setFormData({
        exam: selectedOption.value,
        rank: 0,
      });
    }
  };

  const handleInputChange = (name) => (selectedOption) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: selectedOption.label,
    }));
  };

  const handleRankChange = (e) => {
    const enteredValue = e.target.value;
    const enteredRank = Number(enteredValue);

    setFormData((prevData) => ({
      ...prevData,
      rank: enteredRank,
    }));

    // Error validation only for rank-based exams (not for TNEA)
    if (selectedExam !== "TNEA") {
      if (enteredValue === "") {
        setInputError("Please enter a rank");
      } else if (isNaN(enteredRank) || enteredRank < 0) {
        setInputError("Please enter a valid rank");
      } else {
        setInputError("");
      }
    } else {
      // No error for TNEA (marks input)
      setInputError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedExam !== "TNEA" && (inputError || isNaN(formData.rank) || formData.rank < 0)) {
      return;
    }
    const queryString = Object.entries(formData)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    router.push(`/college_predictor?${queryString}`);
  };

  const isSubmitDisabled =
    selectedExam !== "TNEA" && (inputError.length > 0 || !formData.exam || formData.rank === "" || formData.rank === undefined);

  const renderFields = () => {
    if (!selectedExam || !config) return null;
    return config.fields.map((field) => (
      <div key={field.name} className="my-4 w-full sm:w-3/4">
        <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-4">
          {field.label}
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
            <form onSubmit={handleSubmit} className="w-full">
              <div className="flex flex-col justify-center sm:flex-row flex-wrap w-full">
                <div className="my-4 w-full sm:w-3/4">
                  <label
                    htmlFor="exam"
                    className="block text-md font-semibold text-gray-700 mb-2 -translate-x-4"
                  >
                    Select an exam
                  </label>
                  <Dropdown
                    options={Object.keys(examConfigs).map((exam) => ({
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
                {selectedExam && (
                  <div className="my-4 w-full sm:w-3/4">
                    <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                      {selectedExam === "TNEA" ? "Enter Marks" : "Enter Category Rank"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={selectedExam === "TNEA" ? "0.01" : "1"}
                      value={formData.rank || ""}
                      onChange={handleRankChange}
                      className="border border-gray-300 rounded w-full p-2 text-center"
                      placeholder={
                        selectedExam === "TNEA"
                          ? "Enter your marks"
                          : "Enter your rank"
                      }
                    />
                    {/* Show error only for rank-based exams */}
                    {selectedExam !== "TNEA" && inputError && (
                      <p className="text-red-600 text-sm mt-2 -translate-x-4 font-medium">
                        {inputError}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {selectedExam && (
                <>
                  <button
                    type="submit"
                    className="mt-2 px-5 py-2 rounded-lg bg-red-600 text-white cursor-pointer hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed -translate-x-4"
                    disabled={isSubmitDisabled}
                  >
                    Submit
                  </button>
                  {isSubmitDisabled && selectedExam !== "TNEA" && (
                    <p className="text-red-600 text-sm mt-2 -translate-x-4">
                      Please fill all the fields before submitting!
                    </p>
                  )}
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExamForm;

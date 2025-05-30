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
      rank: enteredRank,
    };

    // If this is JoSAA exam, also set mainRank to be the same as rank
    if (selectedExam === "JoSAA") {
      newFormData.mainRank = enteredRank;
    }

    setFormData(newFormData);
  };

  const handleAdvancedRankChange = (e) => {
    const enteredRank = e.target.value;
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
    const queryString = Object.entries(formData)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    router.push(`/college_predictor?${queryString}`);
  };

  const isSubmitDisabled = () => {
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
    return (
      formData.rank === 0 || Object.values(formData).some((value) => !value)
    );
  };

  const renderFields = () => {
    if (!selectedExam) return null;

    if (!config) return null;

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
            <div className="flex flex-col justify-center sm:flex-row  flex-wrap w-full">
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
                          ? "Enter JEE Main Rank"
                          : "Enter Category Rank"}
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={formData.rank || ""}
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
                            Enter JEE Advanced Rank
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={formData.advRank || ""}
                            onChange={handleAdvancedRankChange}
                            className="border border-gray-300 rounded w-full p-2 text-center"
                            placeholder="Enter JEE Advanced rank"
                          />
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
                    Please fill all the fields before submitting!
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

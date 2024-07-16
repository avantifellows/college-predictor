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
  const router = useRouter();

  const handleExamChange = (selectedOption) => {
    setSelectedExam(selectedOption.value);
    if (selectedOption.code !== undefined) {
      setFormData({
        exam: selectedOption.value,
        rank: 0,
        code: selectedOption.code,
      });
    } else {
      setFormData({ exam: selectedOption.value, rank: 0 });
    }
  };

  const handleInputChange = (name) => (selectedOption) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: selectedOption.label,
    }));
  };

  const handleRankChange = (e) => {
    const enteredRank = e.target.value;
    setFormData((prevData) => ({
      ...prevData,
      rank: enteredRank,
    }));
  };
  const handleSubmit = async () => {
    if (formData.exam === "NEET") {
      router.push(
        `/college_predictor?rank=${formData.rank}&category=${formData.category}&roundNumber=${formData.roundNumber}&exam=${formData.exam}`,
      );
    } else if (formData.exam === "MHT CET") {
      router.push(
        `/college_predictor?rank=${formData.rank}&category=${formData.category}&exam=${formData.exam}&gender=${formData.gender}&stateName=${formData.homeState}&defense=${formData.isDefenseWard}&pwd=${formData.isPWD}`,
      );
    } else if (formData.exam === "KCET") {
      router.push(
        `/college_predictor?rank=${formData.rank}&category=${formData.category}&exam=${formData.exam}&stateName=${formData.homeState}&rural=${formData.region}&language=${formData.language}&courseType=${formData.courseType}`,
      );
    } else if (
      formData.code === "JEE Main" &&
      formData.exam === "JEE Main - JOSAA"
    ) {
      router.push(
        `/college_predictor?rank=${formData.rank}&category=${formData.category}&roundNumber=${formData.roundNumber}&exam=${formData.code}&gender=${formData.gender}&stateName=${formData.homeState}`,
      );
    } else if (formData.code === "JEE Advanced") {
      router.push(
        `/college_predictor?rank=${formData.rank}&category=${formData.category}&roundNumber=${formData.roundNumber}&exam=${formData.exam}&gender=${formData.gender}&stateName=${formData.homeState}`,
      );
    } else if (
      formData.exam === "JEE Main - JAC" &&
      formData.code === "JEE Main"
    ) {
      router.push(
        `/college_predictor?rank=${formData.rank}&category=${formData.category}&exam=${formData.code}&counselling=JAC&gender=${formData.gender}&stateName=${formData.homeState}&pwd=${formData.isPWD}&defense=${formData.isDefenseWard}`,
      );
    }
  };
  const isSubmitDisabled = Object.values(formData).some((value) => !value);
  const renderFields = () => {
    if (!selectedExam) return null;

    const config = examConfigs[selectedExam];
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
              : option,
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
                  }))}
                  onChange={handleExamChange}
                  className="w-full"
                />
              </div>
              {renderFields()}
              {selectedExam && (
                <div className="my-4 sm:w-3/4 flex">
                  <label className="block text-md font-semibold text-gray-700 -translate-x-4 flex-1 content-center">
                    Enter Category Rank
                  </label>
                  <input
                    type="number"
                    value={formData.rank || ""}
                    onChange={handleRankChange}
                    className="border border-gray-300 rounded text-center h-fit p-1 flex-1"
                    placeholder="Rank"
                  />
                </div>
              )}
            </div>
            {selectedExam && (
              <>
                <button
                  className="mt-2 px-5 py-2 rounded-lg bg-red-600 text-white cursor-pointer hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed -translate-x-4"
                  disabled={isSubmitDisabled}
                  onClick={handleSubmit}
                >
                  Submit
                </button>
                {isSubmitDisabled && (
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

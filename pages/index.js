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
  const [physicsMarks, setPhysicsMarks] = useState("");
  const [chemistryMarks, setChemistryMarks] = useState("");
  const [mathsMarks, setMathsMarks] = useState("");
  const router = useRouter();

  const handleExamChange = (selectedOption) => {
    setSelectedExam(selectedOption.value);
    setConfig(examConfigs[selectedOption.value]);
    if (selectedOption.code !== undefined) {
      setFormData({
        exam: selectedOption.value,
        rank: 0,
        code: selectedOption.code,
        // apiEndpoint: selectedOption.apiEndpoint,
      });
    } else {
      setFormData({
        exam: selectedOption.value,
        rank: 0,
        // apiEndpoint: selectedOption.apiEndpoint,
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
    const enteredRank = e.target.value;
    setFormData((prevData) => ({
      ...prevData,
      rank: enteredRank,
    }));
  };
  
  const handlePhysicsMarksChange = (e) => {
    const value = e.target.value;
    if (value === "" || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
      setPhysicsMarks(value);
      calculateCompositeScore(value, chemistryMarks, mathsMarks);
    }
  };
  
  const handleChemistryMarksChange = (e) => {
    const value = e.target.value;
    if (value === "" || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
      setChemistryMarks(value);
      calculateCompositeScore(physicsMarks, value, mathsMarks);
    }
  };
  
  const handleMathsMarksChange = (e) => {
    const value = e.target.value;
    if (value === "" || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
      setMathsMarks(value);
      calculateCompositeScore(physicsMarks, chemistryMarks, value);
    }
  };
  
  const calculateCompositeScore = (physics, chemistry, maths) => {
    if (physics !== "" && chemistry !== "" && maths !== "") {
      // Scale Physics to 50
      const scaledPhysics = (parseFloat(physics) / 100) * 50;
      // Scale Chemistry to 50
      const scaledChemistry = (parseFloat(chemistry) / 100) * 50;
      // Scale Mathematics to 100
      const scaledMaths = parseFloat(maths);
      
      // Calculate composite score
      const compositeScore = scaledPhysics + scaledChemistry + scaledMaths;
      
      setFormData((prevData) => ({
        ...prevData,
        rank: compositeScore.toFixed(2),
      }));
    }
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
        physicsMarks === "" || 
        chemistryMarks === "" || 
        mathsMarks === "" ||
        Object.entries(formData)
          .filter(([key]) => key !== "rank")
          .some(([_, value]) => !value)
      );
    }
    return Object.values(formData).some((value) => !value);
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
                <>
                  <div className="my-4 w-full sm:w-3/4">
                    <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                      Enter your Physics marks out of 100
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={physicsMarks}
                      onChange={handlePhysicsMarksChange}
                      className="border border-gray-300 rounded w-full p-2 text-center"
                      placeholder="Enter Physics marks (0-100)"
                    />
                  </div>
                  <div className="my-4 w-full sm:w-3/4">
                    <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                      Enter your Chemistry marks out of 100
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={chemistryMarks}
                      onChange={handleChemistryMarksChange}
                      className="border border-gray-300 rounded w-full p-2 text-center"
                      placeholder="Enter Chemistry marks (0-100)"
                    />
                  </div>
                  <div className="my-4 w-full sm:w-3/4">
                    <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                      Enter your Mathematics marks out of 100
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={mathsMarks}
                      onChange={handleMathsMarksChange}
                      className="border border-gray-300 rounded w-full p-2 text-center"
                      placeholder="Enter Mathematics marks (0-100)"
                    />
                  </div>
                  <div className="my-4 w-full sm:w-3/4">
                    <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                      Composite Score (out of 200)
                    </label>
                    <input
                      type="text"
                      value={formData.rank || ""}
                      readOnly
                      className="border border-gray-300 rounded w-full p-2 text-center bg-gray-100"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      (Physics × 0.5) + (Chemistry × 0.5) + Mathematics = Composite Score
                    </p>
                  </div>
                </>
              ) : selectedExam && (
                <div className="my-4 w-full sm:w-3/4">
                  <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                    Enter Category Rank
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.rank || ""}
                    onChange={handleRankChange}
                    className="border border-gray-300 rounded w-full p-2 text-center"
                    placeholder="Enter your rank"
                  />
                </div>
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
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
  const [validationErrors, setValidationErrors] = useState({});
  const router = useRouter();

  const handleExamChange = (selectedOption) => {
    setSelectedExam(selectedOption.value);
    setConfig(examConfigs[selectedOption.value]);
    
    
    const newFormData = {
      exam: selectedOption.value,
      rank: "",  
    };
    
  
    if (selectedOption.code !== undefined) {
      newFormData.code = selectedOption.code;
    }
    
    setFormData(newFormData);
    setValidationErrors({});
  };

  const handleInputChange = (name) => (selectedOption) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: selectedOption.label,
    }));
    
   
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleRankChange = (e) => {
    const value = e.target.value;
    
   
    if (value < 0) {
      return;
    }
    
    setFormData((prevData) => ({
      ...prevData,
      rank: value,
    }));
    
    // Clear validation error for rank if it exists
    if (validationErrors.rank) {
      setValidationErrors((prev) => {
        const newErrors = {...prev};
        delete newErrors.rank;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
   
    if (!selectedExam) {
      errors.exam = true;
    }
    
    // Check all required fields for the selected exam
    if (config && config.fields) {
      config.fields.forEach((field) => {
        if (!formData[field.name]) {
          errors[field.name] = true;
        }
      });
    }
    
    // Check rank field
    if (!formData.rank || formData.rank === "" || parseFloat(formData.rank) < 0) {
      errors.rank = true;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const queryString = Object.entries(formData)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    router.push(`/college_predictor?${queryString}`);
  };

  // Check if form is ready to submit
  const isSubmitDisabled = () => {
    if (!selectedExam) return true;
    if (!formData.rank || formData.rank === "" || parseFloat(formData.rank) < 0) return true;
    
    // Check if all required fields for this exam are filled
    if (config && config.fields) {
      for (const field of config.fields) {
        if (!formData[field.name]) return true;
      }
    }
    
    return false;
  };

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
        {validationErrors[field.name] && (
          <p className="text-red-600 text-sm mt-1">
            Please {field.label.toLowerCase()}
          </p>
        )}
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
                {validationErrors.exam && (
                  <p className="text-red-600 text-sm mt-1">
                    Please select an exam
                  </p>
                )}
              </div>

              {renderFields()}

              {selectedExam && (
                <div className="my-4 w-full sm:w-3/4">
                  <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                    {selectedExam === "TNEA"
                      ? "Enter Marks"
                      : "Enter Category Rank"}
                  </label>
                  <input
                    type="number"
                    step={selectedExam === "TNEA" ? "0.01" : "1"}
                    min="0"
                    value={formData.rank || ""}
                    onChange={handleRankChange}
                    onInput={(e) => {
                      // Extra prevention for negative values
                      if (e.target.value < 0) {
                        e.target.value = 0;
                      }
                    }}
                    className={`border ${
                      validationErrors.rank ? "border-red-500" : "border-gray-300"
                    } rounded w-full p-2 text-center`}
                    placeholder={
                      selectedExam === "TNEA"
                        ? "Enter your marks"
                        : "Enter your rank"
                    }
                  />
                  {validationErrors.rank && (
                    <p className="text-red-600 text-sm mt-1">
                      {selectedExam === "TNEA"
                        ? "Please enter your marks"
                        : "Please enter your rank"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {selectedExam && (
              <>
                <button
                  className="mt-2 px-5 py-2 rounded-lg bg-red-600 text-white cursor-pointer hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed -translate-x-4"
                  onClick={handleSubmit}
                  disabled={isSubmitDisabled()}
                >
                  Submit
                </button>
                {Object.keys(validationErrors).length > 0 && (
                  <p className="text-red-600 text-sm mt-1 -translate-x-4">
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
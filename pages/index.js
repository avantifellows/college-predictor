"use client";

import { useState } from "react";
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

    return config.fields.map((field, index) => (
      <div
        key={field.name}
        className="space-y-2 relative"
        style={{ zIndex: 50 - index }}
      >
        <label className="block text-sm font-medium text-slate-700">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-red-100">
        <div className="container mx-auto px-4 py-8">
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

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-visible">
              <div
                className="px-8 py-6"
                style={{
                  background: "linear-gradient(to right, #B52326, #B52326)",
                }}
              >
                <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
                  {getConstants().TITLE}
                </h1>
              </div>

              <div className="p-8">
                {selectedExam === "TGEAPCET" && formData.category === "EWS" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <div
                        className="w-2 h-2 rounded-full mr-3"
                        style={{ backgroundColor: "#B52326" }}
                      ></div>
                      <p className="text-amber-800 text-sm font-medium">
                        Showing OC category data as EWS-specific data is
                        limited.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Select Exam/Counselling Process
                    </label>
                    <div className="relative z-50">
                      <Dropdown
                        options={Object.keys(examConfigs)
                          .filter(
                            (exam) =>
                              exam !== "JEE Main-JOSAA" &&
                              exam !== "JEE Advanced"
                          )
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
                  </div>

                  <div className="grid gap-6">{renderFields()}</div>

                  {selectedExam && selectedExam === "TNEA" ? (
                    <TneaScoreCalculator
                      onScoreChange={handleTneaScoreChange}
                    />
                  ) : (
                    selectedExam && (
                      <>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            {selectedExam === "JEE Main-JAC"
                              ? "Enter All India Rank"
                              : selectedExam === "JoSAA"
                              ? "Enter JEE Main Category Rank"
                              : selectedExam === "GUJCET"
                              ? "Enter your Marks"
                              : selectedExam === "NEETUG"
                              ? "Enter All India Rank"
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
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                            style={{ "--tw-ring-color": "#B52326" }}
                            onFocus={(e) =>
                              (e.target.style.boxShadow = `0 0 0 2px #B52326`)
                            }
                            onBlur={(e) => (e.target.style.boxShadow = "none")}
                            placeholder={
                              selectedExam === "JEE Main-JAC"
                                ? "Enter All India Rank"
                                : selectedExam === "JoSAA"
                                ? "Enter JEE Main rank"
                                : selectedExam === "GUJCET"
                                ? "100"
                                : "Enter your rank"
                            }
                          />
                        </div>

                        {selectedExam === "JoSAA" &&
                          formData.qualifiedJeeAdv === "Yes" && (
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-slate-700">
                                Enter JEE Advanced Category Rank
                              </label>
                              <div className="space-y-2">
                                <input
                                  type="string"
                                  step="1"
                                  value={formData.advRank || ""}
                                  onChange={handleAdvancedRankChange}
                                  onKeyDown={(e) => {
                                    if (
                                      [".", "e", "E", "+", "-", " "].includes(
                                        e.key
                                      )
                                    ) {
                                      e.preventDefault();
                                    }
                                  }}
                                  className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                                    rankError
                                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                      : "border-slate-300 focus:border-transparent"
                                  }`}
                                  style={
                                    !rankError
                                      ? { "--tw-ring-color": "#B52326" }
                                      : {}
                                  }
                                  onFocus={(e) =>
                                    !rankError &&
                                    (e.target.style.boxShadow = `0 0 0 2px #B52326`)
                                  }
                                  onBlur={(e) =>
                                    (e.target.style.boxShadow = "none")
                                  }
                                  placeholder="e.g., 104 or 104P"
                                />
                                {rankError && (
                                  <p className="text-red-600 text-sm flex items-center">
                                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                                    {rankError}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500">
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
                  <div className="mt-8 space-y-4">
                    <button
                      className="w-full px-6 py-3 text-white font-semibold rounded-lg focus:ring-4 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                      style={{
                        background: isSubmitDisabled()
                          ? "linear-gradient(to right, #94a3b8, #94a3b8)"
                          : "linear-gradient(to right, #B52326, #B52326)",
                        focusRingColor: "#B52326",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitDisabled()) {
                          e.target.style.background =
                            "linear-gradient(to right, #9e1f22, #9e1f22)";
                          e.target.style.transform = "translateY(-1px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSubmitDisabled()) {
                          e.target.style.background =
                            "linear-gradient(to right, #B52326, #B52326)";
                          e.target.style.transform = "translateY(0)";
                        }
                      }}
                      disabled={isSubmitDisabled()}
                      onClick={handleSubmit}
                    >
                      Get College Predictions
                    </button>
                    {isSubmitDisabled() && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700 text-sm flex items-center">
                          <span
                            className="w-2 h-2 rounded-full mr-3"
                            style={{ backgroundColor: "#B52326" }}
                          ></span>
                          {selectedExam === "JoSAA" &&
                          formData.qualifiedJeeAdv === "Yes" &&
                          (!formData.advRank || formData.advRank === "")
                            ? "Please enter your JEE Advanced rank."
                            : selectedExam === "JoSAA" &&
                              (!formData.mainRank || formData.mainRank === "")
                            ? "Please enter your JEE Main rank."
                            : "Please fill all the required fields before submitting!"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExamForm;

import React, { useState } from "react";
import Script from "next/script";
import getConstants from "../constants";
import examConfigs from "../examConfig";
import { useRouter } from "next/router";
import Head from "next/head";
import dynamic from "next/dynamic";
import TneaScoreCalculator from "../components/TneaScoreCalculator";
import { GraduationCap, Search, Award, TrendingUp, CheckCircle, ArrowRight } from "lucide-react";

// Dynamically import Dropdown with SSR disabled
const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

const defaultPrimaryInputConfig = {
  label: "Enter Rank",
  placeholder: "Enter your rank",
  step: "1",
  min: "0",
  allowDecimal: false,
};

const getPrimaryInputConfig = (exam) =>
  examConfigs[exam]?.primaryInput || defaultPrimaryInputConfig;

const validatePrimaryInputValue = (exam, value) => {
  if (value === "") return "";

  const inputConfig = getPrimaryInputConfig(exam);
  const numericValue = Number(value);
  const rangeMessage =
    inputConfig.max !== undefined
      ? `Please enter a value between ${inputConfig.min} and ${inputConfig.max}.`
      : `Please enter a value greater than or equal to ${inputConfig.min}.`;

  if (Number.isNaN(numericValue)) {
    return "Please enter a valid value.";
  }

  if (
    inputConfig.min !== undefined &&
    numericValue < Number(inputConfig.min)
  ) {
    return rangeMessage;
  }

  if (
    inputConfig.max !== undefined &&
    numericValue > Number(inputConfig.max)
  ) {
    return rangeMessage;
  }

  return "";
};

const normalizePrimaryInputValue = (exam, value) => {
  if (value === "") return "";
  const inputConfig = getPrimaryInputConfig(exam);
  if (inputConfig.allowDecimal) {
    return value;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "";
  return String(Math.floor(numericValue));
};

const getCleanQueryEntries = (data) =>
  Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== "");

const ExamForm = () => {
  const [selectedExam, setSelectedExam] = useState("");
  const [formData, setFormData] = useState({});
  const [config, setConfig] = useState(null);
  const [rankError, setRankError] = useState("");
  const [primaryInputError, setPrimaryInputError] = useState("");
  const [rankMode, setRankMode] = useState("estimate");
  const [marksInput, setMarksInput] = useState("");
  const [marksError, setMarksError] = useState("");
  const [percentileInput, setPercentileInput] = useState("");
  const [percentileError, setPercentileError] = useState("");
  const [estimateInputType, setEstimateInputType] = useState("marks");
  const [estimateError, setEstimateError] = useState("");
  const [estimatedRank, setEstimatedRank] = useState(null);
  const [estimatedPercentile, setEstimatedPercentile] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const router = useRouter();

  const handleExamChange = (selectedOption) => {
    setSelectedExam(selectedOption.value);
    setConfig(examConfigs[selectedOption.value]);
    setPrimaryInputError("");
    const baseFormData = {
      exam: selectedOption.value,
      rank: "",
    };
    if (selectedOption.code !== undefined) {
      baseFormData.code = selectedOption.code;
    }
    if (selectedOption.value === "JoSAA") {
      baseFormData.qualifiedJeeAdv = "No";
      baseFormData.rankMode = "estimate";
      setRankMode("estimate");
      setMarksInput("");
      setMarksError("");
      setPercentileInput("");
      setPercentileError("");
      setEstimateInputType("marks");
      setEstimateError("");
      setEstimatedRank(null);
      setEstimatedPercentile(null);
    } else {
      setRankMode("known");
      setMarksInput("");
      setMarksError("");
      setPercentileInput("");
      setPercentileError("");
      setEstimateInputType("marks");
      setEstimateError("");
      setEstimatedRank(null);
      setEstimatedPercentile(null);
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

    if (
      selectedExam === "JoSAA" &&
      rankMode === "estimate" &&
      name === "category"
    ) {
      newFormData.mainRank = "";
      setEstimatedRank(null);
      setEstimatedPercentile(null);
      setEstimateError("");
    }

    setFormData(newFormData);
  };

  const handleRankModeChange = (mode) => {
    setRankMode(mode);
    if (mode === "estimate") {
      setFormData((prevData) => {
        const nextData = {
          ...prevData,
          qualifiedJeeAdv: "No",
          mainRank: "",
          rankMode: "estimate",
        };
        delete nextData.advRank;
        return nextData;
      });
      setEstimatedRank(null);
      setEstimatedPercentile(null);
      setMarksInput("");
      setMarksError("");
      setPercentileInput("");
      setPercentileError("");
      setEstimateInputType("marks");
      setEstimateError("");
    } else {
      setFormData((prevData) => ({
        ...prevData,
        rankMode: "known",
      }));
      setEstimatedRank(null);
      setEstimatedPercentile(null);
      setMarksInput("");
      setMarksError("");
      setPercentileInput("");
      setPercentileError("");
      setEstimateInputType("marks");
      setEstimateError("");
    }
  };

  const handleEstimateInputTypeChange = (type) => {
    setEstimateInputType(type);
    setEstimatedRank(null);
    setEstimatedPercentile(null);
    setEstimateError("");
    setMarksInput("");
    setMarksError("");
    setPercentileInput("");
    setPercentileError("");
  };

  const handleMarksChange = (e) => {
    const value = e.target.value;
    setMarksInput(value);
    setEstimatedRank(null);
    setEstimatedPercentile(null);
    setEstimateError("");
    if (value === "") {
      setMarksError("");
      return;
    }
    const marks = Number(value);
    if (Number.isNaN(marks) || marks < 0 || marks > 300) {
      setMarksError("Please enter marks between 0 and 300.");
      return;
    }
    setMarksError("");
  };

  const handlePercentileChange = (e) => {
    const value = e.target.value;
    setPercentileInput(value);
    setEstimatedRank(null);
    setEstimatedPercentile(null);
    setEstimateError("");
    if (value === "") {
      setPercentileError("");
      return;
    }
    const percentileValue = Number(value);
    if (
      Number.isNaN(percentileValue) ||
      percentileValue < 0 ||
      percentileValue > 100
    ) {
      setPercentileError("Please enter percentile between 0 and 100.");
      return;
    }
    setPercentileError("");
  };

  const handleEstimateRank = async () => {
    if (!formData.category) {
      setEstimateError("Please select your category first.");
      return;
    }
    if (estimateInputType === "marks") {
      if (marksInput === "") {
        setMarksError("Please enter your marks.");
        return;
      }
      if (marksError) return;
    } else {
      if (percentileInput === "") {
        setPercentileError("Please enter your percentile.");
        return;
      }
      if (percentileError) return;
    }

    setIsEstimating(true);
    setEstimateError("");
    try {
      const response = await fetch("/api/jee-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marks: estimateInputType === "marks" ? Number(marksInput) : undefined,
          percentile:
            estimateInputType === "percentile"
              ? Number(percentileInput)
              : undefined,
          category: formData.category,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setEstimateError(data.error || "Unable to estimate rank.");
        setIsEstimating(false);
        return;
      }

      setEstimatedRank(data.categoryRank);
      setEstimatedPercentile(data.percentile);
      setFormData((prevData) => {
        const nextData = {
          ...prevData,
          mainRank: String(data.categoryRank),
          qualifiedJeeAdv: "No",
          rankMode: "estimate",
        };
        delete nextData.advRank;
        return nextData;
      });
    } catch (error) {
      setEstimateError("Unable to estimate rank right now.");
    } finally {
      setIsEstimating(false);
    }
  };

  const handleRankChange = (e) => {
    const enteredRank = normalizePrimaryInputValue(
      selectedExam,
      e.target.value
    );
    const validationError = validatePrimaryInputValue(
      selectedExam,
      enteredRank
    );
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

    setPrimaryInputError(validationError);
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

      const queryString = getCleanQueryEntries(cleanedFormData)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
      router.push(`/college_predictor?${queryString}`);
    } else {
      // For other exams, proceed as usual
      if (primaryInputError) {
        alert(primaryInputError);
        return;
      }
      const queryString = getCleanQueryEntries(formData)
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
      !!primaryInputError ||
      !formData.rank ||
      formData.rank === "" ||
      formData.rank === 0 ||
      Object.entries(formData)
        .filter(([key]) => key !== "rank")
        .some(([_, value]) => !value)
    );
  };

  const renderFormCard = (
    key,
    label,
    control,
    helperText = null,
    errorText = null,
    fullWidth = false
  ) => (
    <div
      key={key}
      className={`${fullWidth ? "md:col-span-2" : ""} rounded-xl border border-[#eaded8] bg-[#fffdfa] p-4 text-left shadow-sm`}
    >
      <label className="mb-2 block text-sm font-semibold text-[#4a3935]">
        {label}
      </label>
      {control}
      {helperText && (
        <p className="mt-2 text-xs leading-5 text-[#6d5550]">{helperText}</p>
      )}
      {errorText && <p className="mt-2 text-sm text-red-500">{errorText}</p>}
    </div>
  );

  const renderFields = () => {
    if (!selectedExam) return null;

    if (!config) return null;

    const fieldsToRender =
      selectedExam === "JoSAA"
        ? config.fields.filter((field) => field.name !== "qualifiedJeeAdv")
        : config.fields;

    return fieldsToRender.map((field) =>
      renderFormCard(
        field.name,
        typeof field.label === "function"
          ? field.label(formData)
          : field.label,
        <Dropdown
          options={field.options.map((option) =>
            typeof option === "string"
              ? { value: option, label: option }
              : option
          )}
          onChange={handleInputChange(field.name)}
          selectedValue={formData[field.name]}
          className="w-full"
        />
      )
    );
  };

  return (
    <>
      <Head>
        <title>College Predictor - Home</title>
      </Head>
      <div className="flex min-h-[calc(100vh-120px)] flex-col bg-[#fdf8f6]">
        {/* Hero Section - Only show when no exam is selected */}
        {!selectedExam && (
          <div className="relative w-full overflow-hidden bg-white py-12 md:py-20">
            <div className="mx-auto max-w-6xl px-4 md:px-8">
              <div className="flex flex-col items-center gap-10 md:flex-row">
                <div className="flex-1 text-center md:text-left">
                  <span className="mb-4 inline-block rounded-full bg-[#f4d5d6] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#b52326]">
                    Welcome to Futures
                  </span>
                  <h2 className="mb-6 text-4xl font-extrabold leading-tight text-[#2f2320] md:text-5xl lg:text-6xl">
                    Find Your Perfect <span className="text-[#b52326]">College</span> & <span className="text-[#b52326]">Scholarship</span>
                  </h2>
                  <p className="mb-8 text-lg text-[#6d5550] md:text-xl">
                    Smart predictions for JoSAA, NEET, WBJEE, and more. Use our AI-powered tool to navigate your path to higher education.
                  </p>
                  <div className="flex flex-col justify-center gap-4 sm:flex-row md:justify-start">
                    <button 
                      onClick={() => document.getElementById('exam-selector').scrollIntoView({ behavior: 'smooth' })}
                      className="group flex items-center justify-center gap-2 rounded-full bg-[#b52326] px-8 py-4 text-lg font-bold text-white transition hover:bg-[#9e1f22]"
                    >
                      Start Prediction <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                    </button>
                    <button 
                      onClick={() => router.push('/scholarships')}
                      className="rounded-full border-2 border-[#b52326] px-8 py-4 text-lg font-bold text-[#b52326] transition hover:bg-[#b52326] hover:text-white"
                    >
                      Explore Scholarships
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative h-[300px] w-full overflow-hidden rounded-3xl border-4 border-[#eaded8] shadow-2xl md:h-[400px]">
                    <img
                      src="/images/hero-predictor.png"
                      alt="Hero Predictor"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2f2320]/40 to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div id="exam-selector" className="flex w-full flex-col items-center justify-start px-4 pb-16 pt-8 sm:pt-12">
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
          <div className="mt-4 flex w-full max-w-4xl flex-col items-center rounded-2xl border border-[#eaded8] bg-white p-5 pb-6 text-center shadow-sm sm:mt-6 sm:p-6">
            <h1 className="mb-2 text-2xl font-bold text-[#2f2320] md:text-3xl">
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

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
              {renderFormCard(
                "exam",
                "Select Exam/Counselling Process",
                <Dropdown
                  options={Object.keys(examConfigs)
                    .filter(
                      (exam) =>
                        exam !== "JEE Main-JOSAA" && exam !== "JEE Advanced"
                    )
                    .map((exam) => ({
                      value: exam,
                      label: exam,
                      code: examConfigs[exam].code,
                      apiEndpoint: examConfigs[exam].apiEndpoint,
                    }))}
                  onChange={handleExamChange}
                  selectedValue={selectedExam}
                  className="w-full"
                />,
                null,
                null,
                true
              )}
              {renderFields()}

              {selectedExam && selectedExam === "TNEA" ? (
                <div className="md:col-span-2">
                  <TneaScoreCalculator onScoreChange={handleTneaScoreChange} />
                </div>
              ) : (
                selectedExam && (
                  <>
                    {selectedExam === "JoSAA" && (
                      renderFormCard(
                        "rankMode",
                        "Do you want rank prediction?",
                        <div className="flex justify-center w-full">
                          <div className="inline-flex w-full overflow-hidden rounded-xl border border-[#d8c7c1]">
                            <button
                              type="button"
                              onClick={() => handleRankModeChange("estimate")}
                              className={`flex-1 px-4 py-2 text-sm ${
                                rankMode === "estimate"
                                  ? "bg-[#B52326] text-white"
                                  : "bg-white text-gray-700"
                              }`}
                            >
                              Yes, estimate rank
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRankModeChange("known")}
                              className={`flex-1 px-4 py-2 text-sm ${
                                rankMode === "known"
                                  ? "bg-[#B52326] text-white"
                                  : "bg-white text-gray-700"
                              }`}
                            >
                              No, I know my rank
                            </button>
                          </div>
                        </div>,
                        null,
                        null,
                        true
                      )
                    )}

                    {selectedExam === "JoSAA" &&
                      rankMode === "known" &&
                      config?.fields?.find(
                        (field) => field.name === "qualifiedJeeAdv"
                      ) && (
                        renderFormCard(
                          "qualifiedJeeAdv",
                          config.fields.find(
                            (field) => field.name === "qualifiedJeeAdv"
                          ).label,
                          <Dropdown
                            options={config.fields
                              .find((field) => field.name === "qualifiedJeeAdv")
                              .options.map((option) =>
                                typeof option === "string"
                                  ? { value: option, label: option }
                                  : option
                              )}
                            onChange={handleInputChange("qualifiedJeeAdv")}
                            className="w-full"
                            selectedValue={formData.qualifiedJeeAdv}
                          />
                        )
                      )}

                    {selectedExam === "JoSAA" && rankMode === "estimate" ? (
                      renderFormCard(
                        "estimate",
                        estimateInputType === "marks"
                          ? config?.estimateMarksInput?.label ||
                            "Enter JEE Main marks out of 300"
                          : config?.estimatePercentileInput?.label ||
                            "Enter JEE Main percentile",
                        <div className="flex flex-col gap-2.5">
                          <div className="flex justify-center w-full">
                            <div className="inline-flex w-full overflow-hidden rounded-xl border border-[#d8c7c1]">
                              <button
                                type="button"
                                onClick={() =>
                                  handleEstimateInputTypeChange("marks")
                                }
                                className={`flex-1 px-4 py-2 text-sm ${
                                  estimateInputType === "marks"
                                    ? "bg-[#B52326] text-white"
                                    : "bg-white text-gray-700"
                                }`}
                              >
                                Marks
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleEstimateInputTypeChange("percentile")
                                }
                                className={`flex-1 px-4 py-2 text-sm ${
                                  estimateInputType === "percentile"
                                    ? "bg-[#B52326] text-white"
                                    : "bg-white text-gray-700"
                                }`}
                              >
                                Percentile
                              </button>
                            </div>
                          </div>
                          {estimateInputType === "marks" ? (
                            <>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="300"
                                value={marksInput}
                                onChange={handleMarksChange}
                                onKeyDown={(e) => {
                                  if (
                                    [".", "e", "E", "+", "-", " "].includes(
                                      e.key
                                    )
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                                className={`w-full rounded-xl border bg-[#fffdfa] p-3 text-center outline-none transition focus:ring-2 focus:ring-[#f4d5d6] ${
                                  marksError
                                    ? "border-red-500 focus:border-red-500"
                                    : "border-[#d8c7c1] focus:border-[#b52326]"
                                }`}
                                placeholder={
                                  config?.estimateMarksInput?.placeholder ||
                                  "e.g., 182"
                                }
                              />
                              {marksError && (
                                <p className="text-red-500 text-sm">
                                  {marksError}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={percentileInput}
                                onChange={handlePercentileChange}
                                onKeyDown={(e) => {
                                  if (
                                    ["e", "E", "+", "-", " "].includes(e.key)
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                                className={`w-full rounded-xl border bg-[#fffdfa] p-3 text-center outline-none transition focus:ring-2 focus:ring-[#f4d5d6] ${
                                  percentileError
                                    ? "border-red-500 focus:border-red-500"
                                    : "border-[#d8c7c1] focus:border-[#b52326]"
                                }`}
                                placeholder={
                                  config?.estimatePercentileInput
                                    ?.placeholder || "e.g., 97.45"
                                }
                              />
                              {percentileError && (
                                <p className="text-red-500 text-sm">
                                  {percentileError}
                                </p>
                              )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={handleEstimateRank}
                            disabled={
                              isEstimating ||
                              (estimateInputType === "marks"
                                ? marksInput === "" || !!marksError
                                : percentileInput === "" ||
                                  !!percentileError) ||
                              !formData.category
                            }
                            className="rounded-lg bg-[#B52326] px-4 py-2 text-white hover:bg-[#9E1F22] disabled:bg-gray-300 disabled:text-gray-600"
                          >
                            {isEstimating ? "Estimating..." : "Estimate Rank"}
                          </button>
                          {estimateError && (
                            <p className="text-red-500 text-sm">
                              {estimateError}
                            </p>
                          )}
                          {estimatedRank && estimatedPercentile !== null && (
                            <div className="rounded-xl border border-[#eaded8] bg-[#fffdfa] p-4 text-left text-sm text-gray-700">
                              <p>
                                Predicted Percentile:{" "}
                                <strong>{estimatedPercentile}</strong>
                              </p>
                              <p>
                                Predicted Category Rank:{" "}
                                <strong>{estimatedRank}</strong>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Results are based on average data of 10k+
                                students from 2024 and 2025. Actual 2025/26
                                results may vary depending on the paper slot.
                              </p>
                            </div>
                          )}
                        </div>,
                        null,
                        null,
                        true
                      )
                    ) : (
                      renderFormCard(
                        "primaryInput",
                        getPrimaryInputConfig(selectedExam).label,
                        <input
                          type="number"
                          step={getPrimaryInputConfig(selectedExam).step}
                          min={getPrimaryInputConfig(selectedExam).min}
                          max={getPrimaryInputConfig(selectedExam).max}
                          value={
                            selectedExam === "JoSAA"
                              ? formData.mainRank || ""
                              : formData.rank || ""
                          }
                          onChange={handleRankChange}
                          onKeyDown={(e) => {
                            if (
                              ["e", "E", "+", "-", " "].includes(e.key) ||
                              (!getPrimaryInputConfig(selectedExam)
                                .allowDecimal &&
                                e.key === ".")
                            ) {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full rounded-xl border bg-white px-4 py-3 text-left text-sm outline-none transition focus:ring-2 focus:ring-[#f4d5d6] sm:text-base ${
                            primaryInputError
                              ? "border-red-500 focus:border-red-500"
                              : "border-[#d8c7c1] focus:border-[#b52326]"
                          }`}
                          placeholder={
                            getPrimaryInputConfig(selectedExam).placeholder
                          }
                        />,
                        getPrimaryInputConfig(selectedExam).helperText,
                        primaryInputError
                      )
                    )}

                    {/* JEE Advanced Rank input field - only show if user selected Yes for qualifiedJeeAdv */}
                    {selectedExam === "JoSAA" &&
                      rankMode === "known" &&
                      formData.qualifiedJeeAdv === "Yes" && (
                        renderFormCard(
                          "advRank",
                          config?.advancedInput?.label ||
                            "Enter JEE Advanced Category Rank",
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
                              className={`w-full rounded-xl border bg-[#fffdfa] p-3 text-center outline-none transition focus:ring-2 focus:ring-[#f4d5d6] ${
                                rankError
                                  ? "border-red-500 focus:border-red-500"
                                  : "border-[#d8c7c1] focus:border-[#b52326]"
                              }`}
                              placeholder={
                                config?.advancedInput?.placeholder ||
                                "e.g., 104 or 104P"
                              }
                            />
                            <p className="text-xs text-gray-500 mt-2 leading-5">
                              Enter rank (e.g., 104) or rank with 'P' suffix
                              (e.g., 104P)
                            </p>
                          </div>,
                          null,
                          rankError
                        )
                      )}
                  </>
                )
              )}
            </div>

            {selectedExam && (
              <div className="mt-4 w-full max-w-xl">
                <button
                  className="w-full rounded-lg bg-[#B52326] px-5 py-3 text-white cursor-pointer hover:bg-[#9E1F22] active:bg-[#8A1B1E] disabled:bg-gray-300 disabled:cursor-not-allowed sm:w-auto"
                  disabled={isSubmitDisabled()}
                  onClick={handleSubmit}
                >
                  Submit
                </button>
                {isSubmitDisabled() && (
                  <p className="mt-2 text-sm text-red-600">
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
              </div>
            )}
          </div>

          {/* Additional Content - Only show when no exam is selected */}
          {!selectedExam && (
            <div className="mt-16 w-full max-w-6xl space-y-20">
              {/* Stats Section */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {[
                  { icon: GraduationCap, label: "10+ Exams", sub: "Comprehensive coverage" },
                  { icon: Award, label: "50+ Scholarships", sub: "Funding your future" },
                  { icon: TrendingUp, label: "Thousands of Ranks", sub: "Accurate 2024 data" },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm border border-[#eaded8]">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fdf8f6] text-[#b52326]">
                      <stat.icon className="h-8 w-8" />
                    </div>
                    <h3 className="mb-1 text-2xl font-bold text-[#2f2320]">{stat.label}</h3>
                    <p className="text-sm text-[#6d5550]">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* How it Works */}
              <div className="rounded-3xl bg-white p-8 md:p-12 shadow-sm border border-[#eaded8]">
                <h3 className="mb-12 text-center text-3xl font-bold text-[#2f2320]">How it Works</h3>
                <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
                  {[
                    { step: "01", title: "Select Your Exam", desc: "Choose your target counselling process from our list of supported exams." },
                    { step: "02", title: "Enter Your Rank", desc: "Provide your category, rank, and other details for accurate predictions." },
                    { step: "03", title: "Get Results", desc: "Instant list of colleges you're likely to get based on previous years' trends." },
                  ].map((step, i) => (
                    <div key={i} className="relative">
                      <span className="text-5xl font-black text-[#f4d5d6] opacity-50">{step.step}</span>
                      <div className="relative -mt-6 ml-4">
                        <h4 className="mb-2 text-xl font-bold text-[#b52326]">{step.title}</h4>
                        <p className="text-[#6d5550]">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust Section */}
              <div className="text-center">
                <h4 className="mb-8 text-sm font-bold uppercase tracking-widest text-[#6d5550]">Trusted by Students Across India</h4>
                <div className="flex flex-wrap justify-center gap-8 opacity-60 grayscale filter">
                   {/* Placeholder for logos or just text badges */}
                   <span className="text-2xl font-bold italic text-[#2f2320]">Jadavpur Univ.</span>
                   <span className="text-2xl font-bold italic text-[#2f2320]">NIT Trichy</span>
                   <span className="text-2xl font-bold italic text-[#2f2320]">IIT Bombay</span>
                   <span className="text-2xl font-bold italic text-[#2f2320]">VJTI Mumbai</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ExamForm;

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
    const baseFormData = {
      exam: selectedOption.value,
      rank: selectedOption.value === "TNEA" ? "" : 0,
    };
    if (selectedOption.code !== undefined) {
      baseFormData.code = selectedOption.code;
    }
    if (selectedOption.value === "JoSAA") {
      baseFormData.qualifiedJeeAdv = "No";
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

    const fieldsToRender =
      selectedExam === "JoSAA"
        ? config.fields.filter((field) => field.name !== "qualifiedJeeAdv")
        : config.fields;

    return fieldsToRender.map((field) => (
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
                        exam !== "JEE Main-JOSAA" && exam !== "JEE Advanced"
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
                    {selectedExam === "JoSAA" && (
                      <div className="my-4 w-full sm:w-3/4">
                        <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                          Do you want rank prediction?
                        </label>
                        <div className="flex justify-center w-full">
                          <div className="inline-flex w-full overflow-hidden rounded-md border border-gray-300">
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
                        </div>
                      </div>
                    )}

                    {selectedExam === "JoSAA" &&
                      rankMode === "known" &&
                      config?.fields?.find(
                        (field) => field.name === "qualifiedJeeAdv"
                      ) && (
                        <div className="my-4 w-full sm:w-3/4">
                          <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-4">
                            {
                              config.fields.find(
                                (field) => field.name === "qualifiedJeeAdv"
                              ).label
                            }
                          </label>
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
                        </div>
                      )}

                    {selectedExam === "JoSAA" && rankMode === "estimate" ? (
                      <div className="my-4 w-full sm:w-3/4">
                        <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
                          Enter your JEE Main details
                        </label>
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-center w-full">
                            <div className="inline-flex w-full overflow-hidden rounded-md border border-gray-300">
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
                                className={`border ${
                                  marksError
                                    ? "border-red-500"
                                    : "border-gray-300"
                                } rounded w-full p-2 text-center`}
                                placeholder="e.g., 182"
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
                                className={`border ${
                                  percentileError
                                    ? "border-red-500"
                                    : "border-gray-300"
                                } rounded w-full p-2 text-center`}
                                placeholder="e.g., 97.45"
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
                            className="px-4 py-2 rounded bg-[#B52326] text-white hover:bg-[#9E1F22] disabled:bg-gray-300 disabled:text-gray-600"
                          >
                            {isEstimating ? "Estimating..." : "Estimate Rank"}
                          </button>
                          {estimateError && (
                            <p className="text-red-500 text-sm">
                              {estimateError}
                            </p>
                          )}
                          {estimatedRank && estimatedPercentile !== null && (
                            <div className="text-sm text-gray-700">
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
                        </div>
                      </div>
                    ) : (
                      <div className="my-4 w-full sm:w-3/4">
                        <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-3">
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
                          className="border border-gray-300 rounded w-full p-2 text-center"
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
                    )}

                    {/* JEE Advanced Rank input field - only show if user selected Yes for qualifiedJeeAdv */}
                    {selectedExam === "JoSAA" &&
                      rankMode === "known" &&
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
                  className="mt-2 px-5 py-2 rounded-lg bg-[#B52326] text-white cursor-pointer hover:bg-[#9E1F22] active:bg-[#8A1B1E] disabled:bg-gray-300 disabled:cursor-not-allowed -translate-x-4"
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

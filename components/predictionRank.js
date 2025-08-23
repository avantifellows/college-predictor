"use client";

import { useState, useEffect } from "react";
import {
  predictFromMarks,
  getPerformanceCategory,
  loadModel,
} from "../lib/predictorService";

export default function JEEPredictor() {
  const [marks, setMarks] = useState("");
  const [category, setCategory] = useState("GEN");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [error, setError] = useState("");

  // Load model on component mount
  useEffect(() => {
    async function initModel() {
      try {
        await loadModel();
        setModelLoaded(true);
      } catch (err) {
        setError("Failed to load model: " + err.message);
      }
    }

    initModel();
  }, []);

  const handleSinglePredict = async () => {
    if (!marks || isNaN(marks)) {
      setError("Please enter valid marks");
      return;
    }

    const marksNum = Number.parseFloat(marks);
    if (marksNum < 0 || marksNum > 300) {
      setError("Marks must be between 0 and 300");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await predictFromMarks(marksNum, category);
      setPrediction({
        ...result,
        performanceCategory: getPerformanceCategory(result.percentile),
      });
    } catch (err) {
      setError("Prediction failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
            style={{ backgroundColor: "#B52326" }}
          >
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Futures</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Get accurate predictions for your JEE Main percentile and rank based
            on your marks and category
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-8 py-6">
            <div className="flex items-center justify-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  modelLoaded ? "bg-emerald-500" : "bg-amber-500"
                } animate-pulse`}
              ></div>
              <span className="font-semibold text-slate-700">
                Model Status:{" "}
                {modelLoaded ? "Ready to Predict" : "Loading Model..."}
              </span>
              <span className="text-xl">{modelLoaded ? "✨" : "⏳"}</span>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    JEE Main Marks
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="300"
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#B52326] focus:border-[#B52326] transition-all duration-200 text-lg font-medium"
                      placeholder="Enter marks (0-300)"
                      disabled={!modelLoaded}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                      /300
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#B52326] focus:border-[#B52326] transition-all duration-200 text-lg font-medium"
                    disabled={!modelLoaded}
                  >
                    <option value="GEN">General (GEN)</option>
                    <option value="OBC">Other Backward Class (OBC)</option>
                    <option value="SC">Scheduled Caste (SC)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSinglePredict}
                disabled={loading || !modelLoaded}
                className={`w-full px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200 transform shadow-lg text-white ${
                  loading || !modelLoaded
                    ? "bg-slate-300 cursor-not-allowed"
                    : ""
                }`}
                style={
                  loading || !modelLoaded ? {} : { backgroundColor: "#B52326" }
                }
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Predicting...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Predict My Results
                  </div>
                )}
              </button>
            </div>

            {prediction && (
              <div className="bg-gradient-to-br from-emerald-50 to-[#B52326] border border-emerald-200 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#B52326" }}
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    Your Prediction Results
                  </h3>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100">
                    <div
                      className="text-3xl font-bold mb-2"
                      style={{ color: "#B52326" }}
                    >
                      {prediction.marksOutOf300}
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      Marks (/300)
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100">
                    <div
                      className="text-3xl font-bold mb-2"
                      style={{ color: "#B52326" }}
                    >
                      {prediction.percentile}%
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      Percentile
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100">
                    <div
                      className="text-3xl font-bold mb-2"
                      style={{ color: "#B52326" }}
                    >
                      {prediction.air.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      All India Rank
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100">
                    <div
                      className="text-3xl font-bold mb-2"
                      style={{ color: "#B52326" }}
                    >
                      {prediction.categoryRank.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      {prediction.category} Rank
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <span
                    className="inline-flex items-center px-6 py-3 text-white rounded-full font-semibold text-lg shadow-lg"
                    style={{ backgroundColor: "#B52326" }}
                  >
                    🎯 {prediction.performanceCategory}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          className="mt-8 border rounded-3xl p-8"
          style={{ backgroundColor: "#F9E6E8", borderColor: "#B52326" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#B52326" }}
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h4 className="text-xl font-bold" style={{ color: "#B52326" }}>
              How to Use
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: "#B52326" }}
              >
                <span className="text-white text-sm font-bold">1</span>
              </div>
              <p className="font-medium" style={{ color: "#B52326" }}>
                Enter your JEE Main marks between 0 and 300
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: "#B52326" }}
              >
                <span className="text-white text-sm font-bold">2</span>
              </div>
              <p className="font-medium" style={{ color: "#B52326" }}>
                Select your category: General, OBC, or SC
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: "#B52326" }}
              >
                <span className="text-white text-sm font-bold">3</span>
              </div>
              <p className="font-medium" style={{ color: "#B52326" }}>
                Get instant predictions with detailed ranking info
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: "#B52326" }}
              >
                <span className="text-white text-sm font-bold">4</span>
              </div>
              <p className="font-medium" style={{ color: "#B52326" }}>
                View percentile, AIR, and category-specific rank
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

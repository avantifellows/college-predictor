import React, { useState, useEffect } from "react";

const TneaScoreCalculator = ({
  initialPhysics = "",
  initialChemistry = "",
  initialMaths = "",
  onScoreChange,
  readOnlyRank = false,
}) => {
  const [physicsMarks, setPhysicsMarks] = useState(initialPhysics);
  const [chemistryMarks, setChemistryMarks] = useState(initialChemistry);
  const [mathsMarks, setMathsMarks] = useState(initialMaths);
  const [compositeScore, setCompositeScore] = useState("");

  useEffect(() => {
    setPhysicsMarks(initialPhysics);
  }, [initialPhysics]);

  useEffect(() => {
    setChemistryMarks(initialChemistry);
  }, [initialChemistry]);

  useEffect(() => {
    setMathsMarks(initialMaths);
  }, [initialMaths]);

  useEffect(() => {
    calculateAndPropagateScore(physicsMarks, chemistryMarks, mathsMarks);
  }, [physicsMarks, chemistryMarks, mathsMarks]);

  const handleInputChange = (setter) => (e) => {
    const value = e.target.value;
    if (value === "" || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
      setter(value);
    }
  };

  const calculateAndPropagateScore = (physics, chemistry, maths) => {
    if (physics !== "" && chemistry !== "" && maths !== "") {
      const scaledPhysics = (parseFloat(physics) / 100) * 50;
      const scaledChemistry = (parseFloat(chemistry) / 100) * 50;
      const scaledMaths = parseFloat(maths);
      const score = scaledPhysics + scaledChemistry + scaledMaths;
      const finalScore = score.toFixed(2);
      setCompositeScore(finalScore);
      if (onScoreChange) {
        onScoreChange(finalScore, physics, chemistry, maths);
      }
    } else {
      const currentScore = "";
      setCompositeScore(currentScore);
      if (onScoreChange) {
        onScoreChange(currentScore, physics, chemistry, maths);
      }
    }
  };

  return (
    <>
      <div className="my-4 w-full rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:w-3/4">
        <label className="mb-2 block text-left text-sm font-semibold text-[#1f2937]">
          Enter your Physics marks out of 100
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={physicsMarks}
          onChange={handleInputChange(setPhysicsMarks)}
          className="ui-field text-center"
          placeholder="Enter Physics marks (0-100)"
        />
      </div>
      <div className="my-4 w-full rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:w-3/4">
        <label className="mb-2 block text-left text-sm font-semibold text-[#1f2937]">
          Enter your Chemistry marks out of 100
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={chemistryMarks}
          onChange={handleInputChange(setChemistryMarks)}
          className="ui-field text-center"
          placeholder="Enter Chemistry marks (0-100)"
        />
      </div>
      <div className="my-4 w-full rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:w-3/4">
        <label className="mb-2 block text-left text-sm font-semibold text-[#1f2937]">
          Enter your Mathematics marks out of 100
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={mathsMarks}
          onChange={handleInputChange(setMathsMarks)}
          className="ui-field text-center"
          placeholder="Enter Mathematics marks (0-100)"
        />
      </div>
      <div className="my-4 w-full rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:w-3/4">
        <label className="mb-2 block text-left text-sm font-semibold text-[#1f2937]">
          Composite Score (out of 200)
        </label>
        <input
          type="text"
          value={compositeScore}
          readOnly
          className="w-full rounded-xl border border-[#d1d5db] bg-[#f8fafc] p-3 text-center text-[#111827]"
        />
        {!readOnlyRank && (
          <p className="mt-2 text-xs text-[#64748b]">
            Calculated automatically using the formula: (Physics × 0.5) +
            (Chemistry × 0.5) + Mathematics = Composite Score
          </p>
        )}
      </div>
    </>
  );
};

export default TneaScoreCalculator;

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
      <div className="my-4 w-full sm:w-3/4">
        <label className="mb-2 block text-left text-md font-semibold text-gray-700">
          Enter your Physics marks out of 100
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={physicsMarks}
          onChange={handleInputChange(setPhysicsMarks)}
          className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] p-3 text-center outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
          placeholder="Enter Physics marks (0-100)"
        />
      </div>
      <div className="my-4 w-full sm:w-3/4">
        <label className="mb-2 block text-left text-md font-semibold text-gray-700">
          Enter your Chemistry marks out of 100
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={chemistryMarks}
          onChange={handleInputChange(setChemistryMarks)}
          className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] p-3 text-center outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
          placeholder="Enter Chemistry marks (0-100)"
        />
      </div>
      <div className="my-4 w-full sm:w-3/4">
        <label className="mb-2 block text-left text-md font-semibold text-gray-700">
          Enter your Mathematics marks out of 100
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={mathsMarks}
          onChange={handleInputChange(setMathsMarks)}
          className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] p-3 text-center outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
          placeholder="Enter Mathematics marks (0-100)"
        />
      </div>
      <div className="my-4 w-full sm:w-3/4">
        <label className="mb-2 block text-left text-md font-semibold text-gray-700">
          Composite Score (out of 200)
        </label>
        <input
          type="text"
          value={compositeScore}
          readOnly
          className="w-full rounded-xl border border-[#d8c7c1] bg-[#f8efec] p-3 text-center"
        />
        {!readOnlyRank && (
          <p className="text-xs text-gray-600 mt-1">
            Calculated automatically using the formula: (Physics × 0.5) +
            (Chemistry × 0.5) + Mathematics = Composite Score
          </p>
        )}
      </div>
    </>
  );
};

export default TneaScoreCalculator;

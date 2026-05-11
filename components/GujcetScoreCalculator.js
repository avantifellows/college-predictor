import React, { useState, useEffect } from "react";

const GujcetScoreCalculator = ({
  program,
  initialBoardPercentage = "",
  initialGujcetPercentile = "",
  initialScore = "",
  onScoreChange,
  readOnlyRank = false,
}) => {
  const [inputMode, setInputMode] = useState(
    initialBoardPercentage || initialGujcetPercentile 
      ? "calculate" 
      : (initialScore ? "known" : "calculate")
  );
  
  const [boardPercentage, setBoardPercentage] = useState(initialBoardPercentage);
  const [gujcetPercentile, setGujcetPercentile] = useState(initialGujcetPercentile);
  const [knownScore, setKnownScore] = useState(initialScore && !initialBoardPercentage && !initialGujcetPercentile ? initialScore : "");
  const [compositeScore, setCompositeScore] = useState("");

  useEffect(() => {
    setBoardPercentage(initialBoardPercentage);
  }, [initialBoardPercentage]);

  useEffect(() => {
    setGujcetPercentile(initialGujcetPercentile);
  }, [initialGujcetPercentile]);

  useEffect(() => {
    if (inputMode === "calculate") {
      calculateAndPropagateScore(boardPercentage, gujcetPercentile, program);
    } else {
      propagateKnownScore(knownScore);
    }
  }, [boardPercentage, gujcetPercentile, program, inputMode, knownScore]);

  const handleInputChange = (setter) => (e) => {
    const value = e.target.value;
    if (value === "" || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
      setter(value);
    }
  };

  const propagateKnownScore = (score) => {
    setCompositeScore(score);
    if (onScoreChange) {
      onScoreChange(score, "", "");
    }
  };

  const calculateAndPropagateScore = (board, gujcet, currentProgram) => {
    let finalScore = "";
    
    if (currentProgram === "Medical") {
      // For Medical/Nursing: only board percentage is considered
      if (board !== "") {
        finalScore = parseFloat(board).toFixed(2);
      }
    } else {
      // For Engineering and Pharmacy: 60% Board + 40% GUJCET
      if (board !== "" && gujcet !== "") {
        const boardWeight = parseFloat(board) * 0.6;
        const gujcetWeight = parseFloat(gujcet) * 0.4;
        finalScore = (boardWeight + gujcetWeight).toFixed(2);
      }
    }

    setCompositeScore(finalScore);
    if (onScoreChange) {
      onScoreChange(finalScore, board, gujcet);
    }
  };

  const getBoardLabel = () => {
    if (program === "Engineering") return "Enter 12th Board PCM Percentage";
    if (program === "Medical") return "Enter 12th Board PCB Percentage";
    if (program === "Pharmacy") return "Enter 12th Board PCB/PCM Percentage";
    return "Enter 12th Board Percentage";
  };

  const getFormulaText = () => {
    if (program === "Medical") {
      return "Medical/Nursing admissions do not use GUJCET. ACPC Merit Score = 12th Board PCB Percentage.";
    }
    return "ACPC Merit Score = (Board Percentage × 0.6) + (GUJCET Percentile × 0.4)";
  };

  return (
    <div className="w-full sm:w-3/4">
      {!readOnlyRank && (
        <div className="my-4">
          <label className="mb-2 block text-left text-md font-semibold text-gray-700">
            How would you like to enter your ACPC Merit Score?
          </label>
          <div className="flex w-full justify-center">
            <div className="inline-flex w-full overflow-hidden rounded-xl border border-[#d8c7c1]">
              <button
                type="button"
                onClick={() => setInputMode("calculate")}
                className={`flex-1 px-4 py-2 text-sm ${
                  inputMode === "calculate"
                    ? "bg-[#B52326] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Calculate from marks
              </button>
              <button
                type="button"
                onClick={() => setInputMode("known")}
                className={`flex-1 px-4 py-2 text-sm ${
                  inputMode === "known"
                    ? "bg-[#B52326] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                I know my score
              </button>
            </div>
          </div>
        </div>
      )}

      {inputMode === "calculate" ? (
        <>
          <div className="my-4 w-full sm:w-3/4">
            <label className="mb-2 block text-left text-md font-semibold text-gray-700">
          {getBoardLabel()}
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={boardPercentage}
          onChange={handleInputChange(setBoardPercentage)}
          className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] p-3 text-center outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
          placeholder="e.g., 85.50"
        />
      </div>

      {program !== "Medical" && (
        <div className="my-4 w-full sm:w-3/4">
          <label className="mb-2 block text-left text-md font-semibold text-gray-700">
            Enter GUJCET Percentile
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={gujcetPercentile}
            onChange={handleInputChange(setGujcetPercentile)}
            className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] p-3 text-center outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
            placeholder="e.g., 90.25"
          />
        </div>
      )}

      <div className="my-4 w-full sm:w-3/4">
        <label className="mb-2 block text-left text-md font-semibold text-gray-700">
          ACPC Merit Score Percentage (out of 100)
        </label>
        <input
          type="text"
          value={compositeScore}
          readOnly
          className="w-full rounded-xl border border-[#d8c7c1] bg-[#f8efec] p-3 text-center font-bold text-gray-800"
          placeholder="Calculated Score"
        />
            {!readOnlyRank && (
              <p className="text-xs text-gray-600 mt-1">
                {getFormulaText()}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="my-4 w-full sm:w-3/4">
          <label className="mb-2 block text-left text-md font-semibold text-gray-700">
            Enter Known ACPC Merit Score Percentage
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={knownScore}
            onChange={handleInputChange(setKnownScore)}
            className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] p-3 text-center outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
            placeholder="e.g., 85.50"
          />
        </div>
      )}
    </div>
  );
};

export default GujcetScoreCalculator;

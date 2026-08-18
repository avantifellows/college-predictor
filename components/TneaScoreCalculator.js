import React, { useState, useEffect } from "react";

// TNEA's cutoff is a 200-point composite, not a rank: Maths counts full (100)
// and Physics/Chemistry are halved (50 each). Students know their board marks,
// not the composite, so we take the three subjects and derive it.
const SUBJECTS = [
  { key: "physics", label: "Physics" },
  { key: "chemistry", label: "Chemistry" },
  { key: "maths", label: "Mathematics" },
];

const TneaScoreCalculator = ({
  initialPhysics = "",
  initialChemistry = "",
  initialMaths = "",
  onScoreChange,
  readOnlyRank = false,
}) => {
  const [marks, setMarks] = useState({
    physics: initialPhysics,
    chemistry: initialChemistry,
    maths: initialMaths,
  });
  const [compositeScore, setCompositeScore] = useState("");

  useEffect(() => {
    setMarks({
      physics: initialPhysics,
      chemistry: initialChemistry,
      maths: initialMaths,
    });
  }, [initialPhysics, initialChemistry, initialMaths]);

  useEffect(() => {
    const { physics, chemistry, maths } = marks;
    if (physics !== "" && chemistry !== "" && maths !== "") {
      const score =
        (parseFloat(physics) / 100) * 50 +
        (parseFloat(chemistry) / 100) * 50 +
        parseFloat(maths);
      const finalScore = score.toFixed(2);
      setCompositeScore(finalScore);
      onScoreChange?.(finalScore, physics, chemistry, maths);
    } else {
      setCompositeScore("");
      onScoreChange?.("", physics, chemistry, maths);
    }
    // onScoreChange is recreated each render by the parent; depending on it
    // would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks]);

  const handleChange = (key) => (e) => {
    const value = e.target.value;
    if (value === "" || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
      setMarks((prev) => ({ ...prev, [key]: value }));
    }
  };

  return (
    // One card holding the whole calculator, matching renderFormCard in
    // pages/index.js. Previously these were four full-width stacked blocks with
    // sentence-long labels ("Enter your Physics marks out of 100"), which pushed
    // the results far below the fold on a phone.
    <div className="rounded-xl border border-[#eaded8] bg-[#fffdfa] p-4 text-left shadow-sm">
      <label className="mb-1 block text-sm font-semibold text-[#4a3935]">
        Your Class 12 marks
      </label>
      <p className="mb-3 text-xs leading-5 text-[#6d5550]">
        Out of 100 each. We work out your TNEA cutoff from these.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SUBJECTS.map(({ key, label }) => (
          <div key={key}>
            <label
              htmlFor={`tnea-${key}`}
              className="mb-1 block text-xs font-medium text-[#6d5550]"
            >
              {label}
            </label>
            <input
              id={`tnea-${key}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="100"
              value={marks[key]}
              onChange={handleChange(key)}
              placeholder="0-100"
              className="w-full rounded-xl border border-[#d8c7c1] bg-white px-3 py-2.5 text-center text-sm outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#f8efec] px-4 py-3">
        <span className="text-sm font-semibold text-[#4a3935]">
          Your cutoff score
        </span>
        <span className="text-lg font-semibold tabular-nums text-[#8f2e31]">
          {compositeScore === "" ? "—" : compositeScore}
          <span className="ml-1 text-xs font-normal text-[#6d5550]">
            / 200
          </span>
        </span>
      </div>

      {!readOnlyRank && (
        <p className="mt-2 text-xs leading-5 text-[#6d5550]">
          Maths counts in full; Physics and Chemistry count for half each.
        </p>
      )}
    </div>
  );
};

export default TneaScoreCalculator;

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  LANGUAGES,
  SUBJECTS,
  GAT,
  MAX_PAPERS,
  MAX_PAPER_SCORE,
  parseScores,
  formatScores,
} from "../utils/cuetRules";

// The student's CUET papers, each with its score out of 250 as printed on the
// NTA scorecard. DU and BHU add up different papers for each course, so we
// ask for the papers rather than one total. `value` / `onChange` carry the URL
// form ("english-212,maths-165").
const rowsFrom = (value) => {
  const rows = Object.entries(parseScores(value)).map(([paper, score]) => ({
    paper,
    score: String(score),
  }));
  return rows.length ? rows : [{ paper: "", score: "" }];
};

const validScore = (s) =>
  s !== "" && Number(s) >= 0 && Number(s) <= MAX_PAPER_SCORE;

export default function CuetScoreInput({ value = "", onChange }) {
  const [rows, setRows] = useState(() => rowsFrom(value));
  const lastSent = useRef(value);

  // a new URL from outside (back button, shared link) replaces the rows
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setRows(rowsFrom(value));
    }
  }, [value]);

  const update = (next) => {
    setRows(next);
    const scores = {};
    for (const r of next) {
      if (r.paper && validScore(r.score)) scores[r.paper] = Number(r.score);
    }
    const text = formatScores(scores);
    if (text !== lastSent.current) {
      lastSent.current = text;
      onChange?.(text);
    }
  };

  const setRow = (i, patch) =>
    update(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const chosen = new Set(rows.map((r) => r.paper).filter(Boolean));
  const options = (own) => (list) =>
    list
      .filter(([id]) => id === own || !chosen.has(id))
      .map(([id, label]) => (
        <option key={id} value={id}>
          {label}
        </option>
      ));

  return (
    <div className="rounded-xl border border-[#eaded8] bg-[#fffdfa] p-4 text-left shadow-sm">
      <label className="mb-1 block text-sm font-semibold text-[#4a3935]">
        Your CUET scores
      </label>
      <p className="mb-3 text-xs leading-5 text-[#6d5550]">
        Each paper out of 250, as on your scorecard.
      </p>

      <div className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const bad = r.score !== "" && !validScore(r.score);
          return (
            <div key={i} className="flex items-center gap-2">
              <select
                aria-label={`Paper ${i + 1}`}
                value={r.paper}
                onChange={(e) => setRow(i, { paper: e.target.value })}
                className="min-w-0 flex-1 rounded-xl border border-[#d8c7c1] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
              >
                <option value="">Choose a paper</option>
                <optgroup label="Languages">
                  {options(r.paper)(LANGUAGES)}
                </optgroup>
                <optgroup label="Subjects">
                  {options(r.paper)(SUBJECTS)}
                </optgroup>
                <optgroup label="General">{options(r.paper)([GAT])}</optgroup>
              </select>
              <input
                aria-label={`Score ${i + 1}`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max={MAX_PAPER_SCORE}
                value={r.score}
                onChange={(e) => setRow(i, { score: e.target.value })}
                placeholder="0-250"
                className={`w-24 rounded-xl border bg-white px-3 py-2.5 text-center text-sm outline-none focus:ring-2 focus:ring-[#f4d5d6] ${
                  bad
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#d8c7c1] focus:border-[#b52326]"
                }`}
              />
              <button
                type="button"
                aria-label="Remove paper"
                onClick={() =>
                  update(
                    rows.length > 1
                      ? rows.filter((_, j) => j !== i)
                      : [{ paper: "", score: "" }]
                  )
                }
                className="rounded-full p-1.5 text-[#8f2e31] hover:bg-[#f8efec]"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {rows.length < MAX_PAPERS && (
        <button
          type="button"
          onClick={() => update([...rows, { paper: "", score: "" }])}
          className="mt-3 text-sm font-semibold text-[#8f2e31] hover:underline"
        >
          + Add a paper
        </button>
      )}
    </div>
  );
}

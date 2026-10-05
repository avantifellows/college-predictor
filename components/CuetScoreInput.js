import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Dropdown from "./dropdown";
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
  // most students write 4 or 5 papers: start with 4 rows so that's clear
  while (rows.length < 4) rows.push({ paper: "", score: "" });
  return rows;
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
  // the site's dropdown, grouped; a paper picked in another row is left out
  const groupsFor = (own) =>
    [
      ["Languages", LANGUAGES],
      ["Subjects", SUBJECTS],
      ["General", [GAT]],
    ].map(([label, list]) => ({
      label,
      options: list
        .filter(([id]) => id === own || !chosen.has(id))
        .map(([value, text]) => ({ value, label: text })),
    }));

  return (
    <div className="rounded-xl border border-[#eaded8] bg-[#fffdfa] p-4 text-left shadow-sm">
      <label className="mb-1 block text-sm font-semibold text-[#4a3935]">
        Your CUET scores
      </label>
      <p className="mb-3 text-xs leading-5 text-[#6d5550]">
        Add every paper you took (up to 5), each score out of 250 as on your
        scorecard.
      </p>

      <div className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const bad = r.score !== "" && !validScore(r.score);
          return (
            <div key={i} className="flex items-center gap-2">
              <Dropdown
                className="min-w-0 flex-1 text-sm"
                options={groupsFor(r.paper)}
                selectedValue={r.paper}
                placeholder="Choose a paper"
                onChange={(option) => setRow(i, { paper: option.value })}
              />
              <input
                aria-label={`Score ${i + 1}`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max={MAX_PAPER_SCORE}
                value={r.score}
                onChange={(e) => {
                  // refuse what can't be a score: over 250, or past 2 decimals
                  const v = e.target.value;
                  if (v === "" || (validScore(v) && /^\d*\.?\d{0,2}$/.test(v)))
                    setRow(i, { score: v });
                }}
                placeholder="0-250"
                className={`h-12 w-24 rounded-xl border bg-[#fffdfa] px-3 text-center text-sm outline-none focus:ring-2 focus:ring-[#f4d5d6] ${
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

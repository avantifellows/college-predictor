import React from "react";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";
import { PAPER_LABEL, parseScores } from "../utils/cuetRules";

// What the student entered, kept in view above their results: the choices
// as small chips, then each rank or score in bold. A rank predicted from
// marks says what it came from, so the student can keep both in mind.

const shortLabel = (label) =>
  String(label)
    .replace(/^(Select( your)?|Your|Are you an?|Enter( your)?)\s+/i, "")
    .replace(/\?$/, "");

const fmt = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : n;

const PredictorInputsSummary = ({ query }) => {
  const config = examConfigs[query.exam];
  if (!config) return null;

  const chips = (config.fields || [])
    // JoSAA: the JEE Advanced rank below already says they qualified
    .filter((f) => f.name !== "qualifiedJeeAdv")
    .map((f) => {
      const value = query[f.name];
      if (!value) return null;
      const label = typeof f.label === "function" ? f.label(query) : f.label;
      return { key: f.name, text: `${shortLabel(label)}: ${value}` };
    })
    .filter(Boolean);

  const scores = [];
  if (query.exam === "JoSAA") {
    if (query.mainRank)
      scores.push({
        key: "main",
        label: `JEE Main ${query.category || ""} rank`,
        value: fmt(query.mainRank),
        from: query.mainMarks
          ? `from ${query.mainMarks}/300 marks`
          : query.mainPercentile
          ? `from ${query.mainPercentile} percentile`
          : null,
      });
    if (query.qualifiedJeeAdv === "Yes" && query.advRank)
      scores.push({
        key: "adv",
        label: `JEE Advanced ${query.category || ""} rank`,
        value: fmt(query.advRank),
        from: query.advMarks ? `from ${query.advMarks}/360 marks` : null,
      });
  } else if (config.scoreInput === "cuet") {
    const parsed = Object.entries(parseScores(query.scores || ""));
    if (parsed.length)
      scores.push({
        key: "scores",
        label: "CUET scores",
        value: parsed
          .map(
            ([id, n]) =>
              `${
                id === "gat"
                  ? "GAT"
                  : String(PAPER_LABEL[id] || id).replace(/ \(.*\)$/, "")
              } ${n}`
          )
          .join(", "),
      });
  } else if (query.rank) {
    scores.push({
      key: "rank",
      label: shortLabel(config.primaryInput?.label || "Rank"),
      value: fmt(query.rank),
    });
  }

  if (!chips.length && !scores.length) return null;
  return (
    <div className="mb-5 rounded-2xl border border-[#eaded8] bg-[#fffdfa] px-4 py-3 text-left sm:px-5">
      {scores.length > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {scores.map((s) => (
            <div key={s.key}>
              <div className="text-xs font-bold uppercase tracking-[0.05em] text-[#8f2e31]">
                {s.label}
              </div>
              <div className="font-['Lato',sans-serif] text-2xl font-black leading-tight text-[#2f2320]">
                {s.value}
              </div>
              {s.from && <div className="text-xs text-[#6d5550]">{s.from}</div>}
            </div>
          ))}
        </div>
      )}
      {chips.length > 0 && (
        <div
          className={`flex flex-wrap gap-1.5 ${scores.length ? "mt-3" : ""}`}
        >
          {chips.map((c) => (
            <span
              key={c.key}
              className="rounded-full border border-[#e3d1cb] bg-white px-2.5 py-0.5 text-xs text-[#5b3a34]"
            >
              {c.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

PredictorInputsSummary.propTypes = {
  query: PropTypes.object.isRequired,
};

export default PredictorInputsSummary;

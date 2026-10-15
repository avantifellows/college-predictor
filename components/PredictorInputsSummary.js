import React from "react";
import Link from "next/link";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";
import { PAPER_LABEL, parseScores } from "../utils/cuetRules";

// What the student entered, kept in view above their results, in one line
// styled like the choice builder's "Your picks" bar: each rank or score in
// bold (a predicted one says what it came from), then the choices.

const shortLabel = (label) =>
  String(label)
    .replace(/^(Select( your)?|Your|Are you an?|Enter( your)?)\s+/i, "")
    .replace(/\?$/, "");

const fmt = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : n;

const PredictorInputsSummary = ({ query }) => {
  const config = examConfigs[query.exam];
  if (!config) return null;

  // the value says enough ("OBC-NCL", "Male"); a Yes / No needs its question
  const chips = (config.fields || [])
    // JoSAA: the JEE Advanced rank already says they qualified
    .filter((f) => f.name !== "qualifiedJeeAdv")
    .map((f) => {
      const value = query[f.name];
      if (!value) return null;
      if (!/^(yes|no)$/i.test(value)) return { key: f.name, text: value };
      const label = typeof f.label === "function" ? f.label(query) : f.label;
      return { key: f.name, text: `${shortLabel(label)}: ${value}` };
    })
    .filter(Boolean);

  const scores = [];
  if (query.exam === "JoSAA") {
    if (query.mainRank)
      scores.push({
        key: "main",
        label: "JEE Main rank",
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
        label: "JEE Advanced rank",
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
  const editHref = `/predictor?${new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== "")
  ).toString()}`;
  const items = [
    ...scores.map((x) => (
      <span key={x.key}>
        <b className="text-[#2f2320]">
          {x.label} {x.value}
        </b>
        {x.from && <span className="text-[#6d5550]"> ({x.from})</span>}
      </span>
    )),
    ...chips.map((c) => <span key={c.key}>{c.text}</span>),
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[#eaded8] bg-[#fffdfa] px-4 py-2.5 text-left text-sm text-[#5b3a34]">
      <span className="font-bold text-[#5b1f20]">You entered:</span>
      <span>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-[#c9b3ac]"> · </span>}
            {item}
          </React.Fragment>
        ))}
      </span>
      <Link
        href={editHref}
        className="ml-auto font-bold text-[#B52326] underline underline-offset-2"
      >
        Edit
      </Link>
    </div>
  );
};

PredictorInputsSummary.propTypes = {
  query: PropTypes.object.isRequired,
};

export default PredictorInputsSummary;

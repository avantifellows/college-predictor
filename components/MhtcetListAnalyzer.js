import React, { useMemo } from "react";
import { analyzeMhtcetList } from "../utils/mhtcetListAnalyzer";
import { formatRank, cardClass } from "./mockAllotmentTheme";

// Presentational twin of components/ListAnalyzer.js (JoSAA's "Analyse &
// Improve Your List"), driven by analyzeMhtcetList instead. Candidate rows
// show closing rank only — MHT-CET has no colleges.json-style enrichment, so
// there's no NIRF/CTC/fee to show alongside it (see MatchStats in
// InstituteRankedList.js, which JoSAA's version uses for that).

const TAG_STYLES = {
  reach: "bg-[#fbeeec] text-[#8f2e31]",
  match: "bg-[#f5ece8] text-[#8a6d1f]",
  safety: "bg-[#e8f5ee] text-[#1f8a5b]",
};
const TAG_LABELS = { reach: "REACH", match: "MATCH", safety: "SAFETY" };

const TagBadge = ({ tag }) => {
  if (!tag) return null;
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${TAG_STYLES[tag]}`}
    >
      {TAG_LABELS[tag]}
    </span>
  );
};

// Same circular-gauge shape as JoSAA's BalanceGauge — a ring whose filled arc
// length is score/100 of the full circumference (r=42 -> circumference ≈
// 264), colored red/amber/green by how balanced the list is.
const BalanceGauge = ({ score }) => {
  const arc = (score / 100) * 264;
  const color = score >= 70 ? "#1f8a5b" : score >= 45 ? "#a9790a" : "#b52326";
  return (
    <div className="flex items-center gap-4">
      <svg width="88" height="88" viewBox="0 0 100 100" className="shrink-0">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#eaded8"
          strokeWidth="9"
          strokeDasharray="264 264"
          transform="rotate(-90 50 50)"
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeDasharray={`${arc} 264`}
          transform="rotate(-90 50 50)"
          strokeLinecap="round"
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="22"
          fontWeight="700"
          fill="#3a2c28"
        >
          {score}%
        </text>
      </svg>
      <div>
        <p className="text-sm font-bold text-[#3a2c28]">List Balance</p>
        <p className="mt-1 text-sm text-[#5b4a45]">
          Does your list combine reach, match, and safety choices?
        </p>
      </div>
    </div>
  );
};

const REC_STYLES = {
  warning: "border-[#f0c9c9] bg-[#fbeeec]",
  info: "border-[#eaded8] bg-[#fdf8f6]",
  good: "border-[#bfe0cd] bg-[#e8f5ee]",
};

const RecommendationCard = ({ rec }) => (
  <div className={`rounded-lg border px-3 py-2.5 ${REC_STYLES[rec.type]}`}>
    <p className="text-sm font-bold text-[#3a2c28]">{rec.title}</p>
    <p className="mt-1 text-sm text-[#3a2c28]">{rec.text}</p>
    {rec.candidates.length > 0 && (
      <ul className="mt-2 space-y-1.5">
        {rec.candidates.map((c) => (
          <li
            key={`${c.institute}|${c.program}`}
            className="rounded-lg border border-[#f0e6e1] bg-white px-3 py-2 text-sm"
          >
            <p className="font-semibold text-[#3a2c28]">{c.institute}</p>
            <p className="text-[#5b4a45]">{c.program}</p>
            <p className="mt-0.5 text-xs text-[#7a655f]">
              Closing rank: {formatRank(c.closingRank)}
            </p>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const MhtcetListAnalyzer = ({ choices, catalog, rank }) => {
  const analysis = useMemo(() => {
    if (choices.length === 0) return null;
    return analyzeMhtcetList({ choices, catalog, rank });
  }, [choices, catalog, rank]);

  return (
    <div>
      <p className="text-sm text-[#5b4a45]">
        {choices.length} choice{choices.length === 1 ? "" : "s"} on your list
      </p>

      {choices.length === 0 ? (
        <p className="mt-4 text-sm text-[#5b4a45]">
          Add at least one choice in Choice Filling to get an analysis.
        </p>
      ) : (
        analysis && (
          <>
            <div
              className={`${cardClass} mt-4 flex flex-wrap items-center justify-between gap-4`}
            >
              <BalanceGauge score={analysis.balanceScore} />
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#fdf3f1] px-3 py-1 text-xs font-semibold text-[#b52326]">
                  {analysis.nReach} reach
                </span>
                <span className="rounded-full bg-[#fff6e5] px-3 py-1 text-xs font-semibold text-[#8a6d1f]">
                  {analysis.nMatch} match
                </span>
                <span className="rounded-full bg-[#eaf6ec] px-3 py-1 text-xs font-semibold text-[#1a7f37]">
                  {analysis.nSafety} safety
                </span>
              </div>
            </div>

            <h3 className="mt-4 text-base font-bold text-[#3a2c28]">
              Your list, evaluated
            </h3>
            <ol className="mt-2 space-y-1.5">
              {analysis.evaluated.map((c, i) => (
                <li
                  key={`${c.institute}|${c.program}`}
                  className="rounded-lg border border-[#f0e6e1] bg-white px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[#3a2c28]">
                      <span className="mr-2 font-bold text-[#b52326]">
                        {i + 1}.
                      </span>
                      {c.institute}
                    </p>
                    <TagBadge tag={c.tag} />
                  </div>
                  <p className="text-[#5b4a45]">{c.program}</p>
                </li>
              ))}
            </ol>

            <h3 className="mt-4 text-base font-bold text-[#3a2c28]">
              Recommendations
            </h3>
            <div className="mt-2 space-y-3">
              {analysis.recommendations.map((rec) => (
                <RecommendationCard key={rec.title} rec={rec} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
};

export default MhtcetListAnalyzer;

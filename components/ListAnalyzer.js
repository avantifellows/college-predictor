import React, { useMemo } from "react";
import { analyzeList } from "../utils/listAnalyzer";
import { formatRank, formatSalary, cardClass } from "./mockAllotmentTheme";

// "Analyse & Improve Your List" — the counterpart to Find Your Best Match
// (see pages/mock-allotment/best-match.js — same full-page treatment, not a
// popup), but it critiques the choices the student has ALREADY built
// instead of searching fresh ones. Reach/match/safety tagging + the balance
// gauge are straight from avanti-student-tutorial.html's resultsHTML(),
// applied to this app's own rank/closing-rank data — see utils/listAnalyzer.js.

const TAG_STYLES = {
  reach: "bg-[#fdf3f1] text-[#b52326]",
  match: "bg-[#fff6e5] text-[#8a6d1f]",
  safety: "bg-[#eaf6ec] text-[#1a7f37]",
};
const TAG_LABELS = { reach: "REACH", match: "MATCH", safety: "SAFETY" };

const TagBadge = ({ tag }) => {
  if (!tag) return null;
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${TAG_STYLES[tag]}`}>
      {TAG_LABELS[tag]}
    </span>
  );
};

// Same circular-gauge shape as the tutorial's resultsHTML() — a ring whose
// filled arc length is score/100 of the full circumference (r=42 →
// circumference ≈ 264), colored red/amber/green by how balanced the list is.
const BalanceGauge = ({ score }) => {
  const arc = (score / 100) * 264;
  const color = score >= 70 ? "#1a7f37" : score >= 45 ? "#a9790a" : "#b52326";
  return (
    <div className="flex items-center gap-4">
      <svg width="88" height="88" viewBox="0 0 100 100" className="shrink-0">
        <circle
          cx="50" cy="50" r="42" fill="none" stroke="#eaded8" strokeWidth="9"
          strokeDasharray="264 264" transform="rotate(-90 50 50)" strokeLinecap="round"
        />
        <circle
          cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${arc} 264`} transform="rotate(-90 50 50)" strokeLinecap="round"
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="700" fill="#3a2c28">
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
  warning: "border-[#f0c9c9] bg-[#fdf3f1]",
  info: "border-[#d8c7c1] bg-[#f8efec]",
  good: "border-[#c8e6cc] bg-[#eaf6ec]",
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
              Closing rank: {formatRank(c.closingRank)} · NIRF:{" "}
              {c.nirfRank ?? "not ranked"} · Median CTC: {formatSalary(c.medianSalary)}
            </p>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const ListAnalyzer = ({ choices, catalog, seatIndex, collegesByName, profile }) => {
  const analysis = useMemo(() => {
    if (choices.length === 0) return null;
    return analyzeList({ choices, catalog, seatIndex, collegesByName, profile });
  }, [choices, catalog, seatIndex, collegesByName, profile]);

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
            <div className={`${cardClass} mt-4 flex flex-wrap items-center justify-between gap-4`}>
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
                      <span className="mr-2 font-bold text-[#b52326]">{i + 1}.</span>
                      {c.institute}
                    </p>
                    <TagBadge tag={c.tag} />
                  </div>
                  <p className="text-[#5b4a45]">{c.program}</p>
                </li>
              ))}
            </ol>

            <h3 className="mt-4 text-base font-bold text-[#3a2c28]">Recommendations</h3>
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

export default ListAnalyzer;

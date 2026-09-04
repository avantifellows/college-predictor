import React, { useState } from "react";
import { formatRank, formatSalary } from "./mockAllotmentTheme";

// Shared by the Mock Allotment's "You may have gotten a better option" panel
// AND the "Find Your Best Match" results screen — both need "rank a bunch of
// institute+program rows by a college-level metric, but group by institute
// so five reachable branches at one college don't fill five of the top
// slots." displayLimit lets each caller pick its own cutoff (8 for missed
// options, fewer for a tighter results screen) without hardcoding one here.
export const RANKED_LIST_DISPLAY_LIMIT = 8;

// Colored, at-a-glance stat chips — one fixed color per metric, used
// EVERYWHERE a match/option is shown (this file's InstituteCard AND
// BestMatchFinder.js's MatchCard both render this), so the same four
// numbers always look the same way instead of each screen inventing its
// own dense gray sentence.
const STAT_COLORS = {
  closing: "bg-[#fdf3f1] text-[#b52326]",
  nirf: "bg-[#e8f0fb] text-[#1d4ed8]",
  ctc: "bg-[#eaf6ec] text-[#1a7f37]",
  fees: "bg-[#fff6e5] text-[#8a6d1f]",
};
export const MatchStats = ({ item }) => (
  <div className="mt-2 flex flex-wrap gap-1.5">
    <span className={`rounded-md px-2 py-1 text-xs font-bold ${STAT_COLORS.closing}`}>
      Closing {formatRank(item.closingRank)}
    </span>
    <span className={`rounded-md px-2 py-1 text-xs font-bold ${STAT_COLORS.nirf}`}>
      NIRF {item.nirfRank ?? "Not ranked"}
    </span>
    <span className={`rounded-md px-2 py-1 text-xs font-bold ${STAT_COLORS.ctc}`}>
      CTC {item.medianSalary == null ? "Not known" : formatSalary(item.medianSalary)}
    </span>
    <span className={`rounded-md px-2 py-1 text-xs font-bold ${STAT_COLORS.fees}`}>
      Fees {item.annualFee == null ? "Not known" : formatSalary(item.annualFee)}
      {item.feeWaived ? " (waived)" : ""}
    </span>
  </div>
);

export const InstituteRankedList = ({
  items,
  metric,
  emptyMessage,
  displayLimit = RANKED_LIST_DISPLAY_LIMIT,
}) => {
  const { metricKey, isBetter = () => true, extraNote } = metric;
  const byInstitute = new Map();
  for (const item of items) {
    if (item[metricKey] == null || !isBetter(item)) continue;
    if (!byInstitute.has(item.institute)) byInstitute.set(item.institute, []);
    byInstitute.get(item.institute).push(item);
  }

  // Groups are ranked by closing rank (tightest first), not by the tab's own
  // metric — the metric (NIRF/CTC/fees) only decides which institutes
  // qualify (via isBetter above); once qualified, the best-fit one for the
  // student's own rank leads, same ordering as the closing-rank tab.
  const groups = Array.from(byInstitute.values())
    .map((branches) => [...branches].sort((a, b) => a.closingRank - b.closingRank))
    .sort((a, b) => a[0].closingRank - b[0].closingRank)
    .slice(0, displayLimit);

  if (groups.length === 0) {
    return <p className="mt-3 text-base text-[#5b4a45]">{emptyMessage}</p>;
  }

  return (
    <ul className="mt-3 space-y-2">
      {groups.map((branches) => (
        <InstituteCard key={branches[0].institute} branches={branches} extraNote={extraNote} />
      ))}
    </ul>
  );
};

// One institute's card within InstituteRankedList — same MatchStats chip
// row BestMatchFinder.js's MatchCard uses, so this panel and Find Your Best
// Match never look like two different features. Only its best (tightest
// closing rank) branch shows the full stats by default; a round "+N" pill
// expands the rest into a list below (just their closing rank, since
// NIRF/CTC/fees are identical across every branch at one institute).
const InstituteCard = ({ branches, extraNote }) => {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...branches].sort((a, b) => a.closingRank - b.closingRank);
  const [best, ...rest] = sorted;
  const note = extraNote ? extraNote(best) : null;

  return (
    <li className="rounded-lg border border-[#f0e6e1] px-3 py-2.5 text-base">
      <div className="flex items-start justify-between gap-x-3">
        <p className="font-bold text-[#3a2c28]">{best.institute}</p>
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={
              expanded
                ? "Show only the best branch"
                : `${rest.length} more reachable branch${rest.length > 1 ? "es" : ""} at this institute`
            }
            className="shrink-0 rounded-full bg-[#f8efec] px-2 py-0.5 text-xs font-bold text-[#b52326] transition hover:bg-[#f0e0da]"
          >
            {expanded ? "−" : `+${rest.length}`}
          </button>
        )}
      </div>
      <p className="text-sm font-medium text-[#5b4a45]">{best.program}</p>

      {best.listPosition != null && (
        <p className="mt-0.5 text-xs font-bold text-[#b52326]">
          Was your choice #{best.listPosition}
        </p>
      )}
      <MatchStats item={best} />
      {note && <p className="mt-1.5 text-xs font-bold text-[#1a7f37]">{note}</p>}

      {expanded && (
        <ul className="mt-2 space-y-1.5 border-t border-[#f0e6e1] pt-2">
          {rest.map((b) => (
            <li
              key={`${b.institute}|${b.program}`}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm"
            >
              <span className="text-[#3a2c28]">{b.program}</span>
              <span className="flex items-center gap-1.5">
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${STAT_COLORS.closing}`}>
                  Closing {formatRank(b.closingRank)}
                </span>
                {b.listPosition != null && (
                  <span className="text-xs font-bold text-[#b52326]">
                    Was your choice #{b.listPosition}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

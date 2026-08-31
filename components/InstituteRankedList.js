import React, { useState } from "react";
import { formatRank } from "./mockAllotmentTheme";

// Shared by the Mock Allotment's "You may have gotten a better option" panel
// AND the "Find Your Best Match" results screen — both need "rank a bunch of
// institute+program rows by a college-level metric, but group by institute
// so five reachable branches at one college don't fill five of the top
// slots." displayLimit lets each caller pick its own cutoff (8 for missed
// options, fewer for a tighter results screen) without hardcoding one here.
export const RANKED_LIST_DISPLAY_LIMIT = 8;

export const InstituteRankedList = ({
  items,
  metric,
  emptyMessage,
  displayLimit = RANKED_LIST_DISPLAY_LIMIT,
}) => {
  const { metricKey, direction, isBetter = () => true, formatLabel } = metric;
  const byInstitute = new Map();
  for (const item of items) {
    if (item[metricKey] == null || !isBetter(item)) continue;
    if (!byInstitute.has(item.institute)) byInstitute.set(item.institute, []);
    byInstitute.get(item.institute).push(item);
  }

  const groups = Array.from(byInstitute.values())
    .sort((a, b) =>
      direction === "asc"
        ? a[0][metricKey] - b[0][metricKey]
        : b[0][metricKey] - a[0][metricKey]
    )
    .slice(0, displayLimit);

  if (groups.length === 0) {
    return <p className="mt-3 text-base text-[#7a655f]">{emptyMessage}</p>;
  }

  return (
    <ul className="mt-3 space-y-2">
      {groups.map((branches) => (
        <InstituteCard
          key={branches[0].institute}
          branches={branches}
          metricKey={metricKey}
          formatLabel={formatLabel}
        />
      ))}
    </ul>
  );
};

// One institute's card within InstituteRankedList. Institute name + its
// best (tightest closing rank) branch sit on one row — name left, branch
// right, mirroring how the row reads left-to-right ("this college, this
// branch") — with the metric and that branch's closing rank paired the same
// way underneath. A round "+N" pill (not a plain text link) expands the
// rest of the reachable branches into a list below, instead of dumping
// every branch at once.
const InstituteCard = ({ branches, metricKey, formatLabel }) => {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...branches].sort((a, b) => a.closingRank - b.closingRank);
  const [best, ...rest] = sorted;

  const branchMeta = (b) => (
    <>
      Closing rank: {formatRank(b.closingRank)}
      {b.listPosition != null && (
        <span className="ml-1 font-semibold text-[#b52326]">
          · Was your choice #{b.listPosition}
        </span>
      )}
    </>
  );

  return (
    <li className="rounded-lg border border-[#f0e6e1] px-3 py-2 text-base">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-semibold text-[#3a2c28]">{best.institute}</p>
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-[#3a2c28]">{best.program}</p>
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
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <p className="font-semibold text-[#b52326]">
          {formatLabel(best[metricKey], best)}
        </p>
        <p className="text-[#7a655f]">{branchMeta(best)}</p>
      </div>

      {expanded && (
        <ul className="mt-2 space-y-1 border-t border-[#f0e6e1] pt-2">
          {rest.map((b) => (
            <li
              key={`${b.institute}|${b.program}`}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm text-[#7a655f]"
            >
              <span>{b.program}</span>
              <span>{branchMeta(b)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

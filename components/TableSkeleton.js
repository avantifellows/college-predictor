import React from "react";
import PropTypes from "prop-types";

/**
 * TableSkeleton renders a pulsing placeholder that mimics the shape
 * of the PredictedCollegeTables component while data is being fetched.
 *
 * It replicates:
 *  - The search bar + "Showing X matching options" + Download CSV row
 *  - A table header row matching the real column layout
 *  - Several body rows with varying-width gray bars
 */

const SKELETON_ROW_COUNT = 6;

/** Widths for header and cell bars to give a realistic varied appearance. */
const columnWidths = [
  "w-16",  // State / short column
  "w-40",  // Institute
  "w-52",  // Program
  "w-12",  // Exam
  "w-16",  // Closing Rank
  "w-24",  // Expected Salary
  "w-14",  // Seat Type
];

/**
 * Slightly randomise each row so the skeleton does not look like a
 * perfect grid — just like real data would have varying text lengths.
 */
const rowVariants = [
  ["w-14", "w-36", "w-48", "w-10", "w-14", "w-20", "w-12"],
  ["w-20", "w-44", "w-40", "w-12", "w-16", "w-24", "w-14"],
  ["w-16", "w-32", "w-52", "w-10", "w-12", "w-20", "w-10"],
  ["w-12", "w-40", "w-44", "w-12", "w-16", "w-24", "w-14"],
  ["w-18", "w-36", "w-48", "w-10", "w-14", "w-20", "w-12"],
  ["w-14", "w-44", "w-40", "w-12", "w-16", "w-24", "w-10"],
];

const TableSkeleton = ({ columns = 7, rows = SKELETON_ROW_COUNT }) => {
  const effectiveRows = Math.min(rows, rowVariants.length);

  return (
    <div className="w-full animate-pulse" role="status" aria-label="Loading predictions">
      {/* ── Search bar + count + CSV button placeholder ── */}
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-md">
          <div className="h-12 w-full rounded-xl border border-[#d8c7c1] bg-[#f5efec]" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          <div className="h-4 w-48 rounded bg-[#ebe0db]" />
          <div className="h-10 w-32 rounded-lg bg-[#ebe0db]" />
        </div>
      </div>

      {/* ── Table skeleton ── */}
      <div className="overflow-x-auto rounded-xl border border-[#eaded8] bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          {/* Header */}
          <thead>
            <tr className="bg-[#f8efec]">
              {columnWidths.slice(0, columns).map((w, i) => (
                <th
                  key={i}
                  className="px-4 py-3 border-b border-[#decac3]"
                >
                  <div className={`h-3.5 ${w} rounded bg-[#e0cfc9]`} />
                </th>
              ))}
            </tr>
          </thead>

          {/* Body rows */}
          <tbody>
            {Array.from({ length: effectiveRows }).map((_, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-[#eaded8] ${
                  rowIdx % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
                }`}
              >
                {(rowVariants[rowIdx] || columnWidths)
                  .slice(0, columns)
                  .map((w, colIdx) => (
                    <td key={colIdx} className="px-4 py-4">
                      <div className={`h-3 ${w} rounded bg-[#ebe0db]`} />
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Accessible screen-reader text */}
      <span className="sr-only">Loading predictions…</span>
    </div>
  );
};

TableSkeleton.propTypes = {
  columns: PropTypes.number,
  rows: PropTypes.number,
};

export default TableSkeleton;

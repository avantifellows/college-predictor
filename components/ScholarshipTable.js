import React, { useEffect } from "react";

const parseDeadline = (value) => {
  if (!value) return null;
  const parts = String(value).split("/").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [month, day, year] = parts;
  return new Date(year, month - 1, day);
};

const getDisplayStatus = (item) => {
  const rawStatus = String(item.Status || "").trim();
  if (rawStatus.toLowerCase() === "closed") return "Closed";
  const deadline = parseDeadline(item["Last Date"]);
  if (!deadline) return rawStatus || "Status unavailable";
  const now = new Date();
  deadline.setHours(23, 59, 59, 999);
  return deadline < now ? "Closed" : rawStatus || "Status unavailable";
};

const TableHeader = ({ headers }) => (
  <thead>
    <tr className="bg-[var(--bg-soft)] text-[var(--text)] font-semibold text-left text-xs sm:text-sm">
      {headers.map((header, index) => (
        <th
          key={index}
          className="px-4 py-3 border-b border-[var(--stroke)] last:border-r-0 whitespace-nowrap"
        >
          {header}
        </th>
      ))}
      <th className="px-4 py-3 border-b border-[var(--stroke)] whitespace-nowrap">
        Details
      </th>
    </tr>
  </thead>
);

const TableCell = ({ children, className = "" }) => (
  <td className={`px-4 py-3 align-top text-[var(--text)] break-words ${className}`}>
    {children}
  </td>
);

const formatRichText = (value) => {
  if (!value) return [];

  return String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s*[●•▪◦]+\s*/g, "\n• ")
    .split(/\n+/)
    .map((item) => item.replace(/^•\s*/, "").trim())
    .filter(Boolean);
};

const compactFieldKeys = new Set([
  "Stream",
  "State",
  "Scholarship Amount",
  "Special Criteria",
]);

const ROWS_PER_PAGE = 12;

const renderFieldContent = (value) => {
  const items = formatRichText(value);

  if (items.length === 0) {
    return <span>N/A</span>;
  }

  if (items.length === 1) {
    return <p className="leading-6">{items[0]}</p>;
  }

  return (
    <ul className="ml-5 list-disc space-y-1">
      {items.map((line, i) => (
        <li key={i} className="leading-6">
          {line}
        </li>
      ))}
    </ul>
  );
};

const ExpandedRow = ({ item, expandedFields }) => {
  const compactFields = expandedFields.filter((field) =>
    compactFieldKeys.has(field.key)
  );
  const detailedFields = expandedFields.filter(
    (field) => !compactFieldKeys.has(field.key)
  );

  return (
    <tr>
      <td
        colSpan="5"
        className="border-b border-[var(--stroke)] bg-[var(--bg-soft)] px-4 py-4"
      >
        <div className="space-y-3 text-left text-sm text-[var(--text)]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {compactFields.map((field, index) => (
              <div
                key={index}
                className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3"
              >
                <p className="mb-1 text-xs font-semibold text-[var(--text)]">
                  {field.label}
                </p>
                <div className="break-words text-sm">
                  {renderFieldContent(item[field.key])}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            {detailedFields.map((field, index) => (
              <div
                key={index}
                className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3"
              >
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">
                  {field.label}
                </p>
                <div className="break-words text-sm">
                  {renderFieldContent(item[field.key])}
                </div>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
};

const ScholarshipTable = ({
  filteredData,
  toggleRowExpansion,
  expandedRows,
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const headers = [
    "Scholarship Name",
    "Status",
    "Last Date",
    "Official Link",
  ];
  const expandedFields = [
    { key: "Stream", label: "Stream" },
    { key: "State", label: "State" },
    { key: "Eligibility", label: "Eligibility" },
    { key: "Benefits", label: "Benefits" },
    { key: "Doc Required", label: "Documents Required" },
    { key: "Scholarship Amount", label: "Scholarship Amount" },
    { key: "Special Criteria", label: "Special Criteria" },
  ];

  const getStatusPillClass = (status) =>
    String(status || "").toLowerCase() === "closed"
      ? "border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[#9f2f2f]"
      : "border border-[var(--stroke)] bg-[var(--bg-soft)] text-[var(--text)]";

  const totalRows = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredData]);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const getVisiblePageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [1];
    const left = Math.max(2, safeCurrentPage - 1);
    const right = Math.min(totalPages - 1, safeCurrentPage + 1);

    if (left > 2) pages.push("ellipsis-left");
    for (let page = left; page <= right; page += 1) pages.push(page);
    if (right < totalPages - 1) pages.push("ellipsis-right");
    pages.push(totalPages);

    return pages;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Scholarship results
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Showing {startIndex + 1}-{Math.min(endIndex, totalRows)} of {totalRows.toLocaleString("en-IN")} scholarships
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <span className="inline-flex items-center rounded-full border border-[var(--stroke)] bg-[var(--bg-soft)] px-3 py-1 text-[var(--text-muted)]">
            Page {safeCurrentPage} of {totalPages}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] shadow-sm">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
          <TableHeader headers={headers} />
          <tbody>
            {filteredData?.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-[var(--text-muted)]">
                  No scholarships found. Please try again with different filters.
                </td>
              </tr>
            )}
            {paginatedData?.map((item, index) => {
              const absoluteIndex = startIndex + index;
              return (
                <React.Fragment key={absoluteIndex}>
                  <tr
                    className={`border-b border-[var(--stroke)] ${
                      absoluteIndex % 2 === 0 ? "bg-[#fcfdff]" : "bg-[var(--surface)]"
                    }`}
                  >
                    <TableCell className="font-medium">{item["Scholarship Name"]}</TableCell>
                    <TableCell>
                      {(() => {
                        const displayStatus = getDisplayStatus(item);
                        return (
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusPillClass(
                              displayStatus
                            )}`}
                          >
                            {displayStatus}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{item["Last Date"] || "Not available"}</TableCell>
                    <TableCell>
                      {item["Application Link"] ? (
                        <a
                          href={item["Application Link"]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--brand)] hover:underline"
                        >
                          Visit source
                        </a>
                      ) : (
                        "Not available"
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        className="accent-button whitespace-nowrap px-4 py-2"
                        onClick={() => toggleRowExpansion(absoluteIndex)}
                      >
                        {expandedRows[absoluteIndex] ? "Show Less" : "Show More"}
                      </button>
                    </TableCell>
                  </tr>
                  {expandedRows[absoluteIndex] && (
                    <ExpandedRow item={item} expandedFields={expandedFields} />
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-4 shadow-sm sm:flex-row">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {startIndex + 1}-{Math.min(endIndex, totalRows)} of {totalRows.toLocaleString("en-IN")} results
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Previous
            </button>
            {getVisiblePageNumbers().map((page) =>
              typeof page === "string" ? (
                <span key={page} className="px-2 text-sm text-[var(--text-muted)]">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-10 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    page === safeCurrentPage
                      ? "border-[var(--brand)] bg-[var(--accent-soft)] text-[var(--brand)]"
                      : "border-[var(--stroke)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--bg-soft)]"
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safeCurrentPage === totalPages}
              className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipTable;

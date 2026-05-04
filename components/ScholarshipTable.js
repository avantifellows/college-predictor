import React from "react";

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
    <tr className="bg-[#f8efec] text-[#5b1f20] font-semibold text-left text-xs sm:text-sm">
      {headers.map((header, index) => (
        <th
          key={index}
          className="px-4 py-3 border-b border-[#decac3] last:border-r-0 whitespace-nowrap"
        >
          {header}
        </th>
      ))}
      <th className="px-4 py-3 border-b border-[#decac3] whitespace-nowrap">
        Details
      </th>
    </tr>
  </thead>
);

const TableCell = ({ children, className = "" }) => (
<td
    className={`px-5 py-4 align-top text-[#332724] break-words border-b border-[#f1e7e2] ${className}`}
  >
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
        className="border-b border-[#eaded8] bg-[#fffdfa] px-4 py-4"
      >
        <div className="space-y-3 text-left text-sm text-[#332724]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {compactFields.map((field, index) => (
              <div
                key={index}
                className="rounded-lg border border-[#eaded8] bg-white px-4 py-3"
              >
                <p className="mb-1 text-xs font-semibold text-[#8f2e31]">
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
                className="rounded-lg border border-[#eaded8] bg-white px-4 py-3"
              >
                <p className="mb-2 text-sm font-semibold text-[#8f2e31]">
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
      ? "border border-[#f0c7c8] bg-[#fff1f1] text-[#8f2e31]"
      : "border border-[#d8d3ad] bg-[#fff9e8] text-[#7a5b00]";

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#eaded8] bg-white shadow-sm">
      <table className="scholarship-table w-full min-w-[760px] table-fixed border-separate text-sm">
        <TableHeader headers={headers} />
        <tbody>
          {filteredData?.length === 0 && (
            <tr>
              <td colSpan="5" className="px-4 py-6 text-center text-[#5b3a34]">
                No scholarships found. Please try again with different filters.
              </td>
            </tr>
          )}
          {filteredData?.map((item, index) => (
            <React.Fragment key={index}>
              <tr className="scholarship-table-row">
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
                      className="font-medium text-[#B52326] hover:underline"
                    >
                      Visit source
                    </a>
                  ) : (
                    "Not available"
                  )}
                </TableCell>
                <TableCell>
                  <button
                   className="whitespace-nowrap rounded-xl border border-[#9E1F22] bg-[#B52326] px-5 py-2.5 font-medium text-white transition-colors duration-200 hover:bg-[#9E1F22]"
                    onClick={() => toggleRowExpansion(index)}
                  >
                    {expandedRows[index] ? "Show Less" : "Show More"}
                  </button>
                </TableCell>
              </tr>
              {expandedRows[index] && (
                <ExpandedRow item={item} expandedFields={expandedFields} />
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScholarshipTable;

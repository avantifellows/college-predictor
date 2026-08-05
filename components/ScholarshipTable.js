import React from "react";

const parseDeadline = (value) => {
  if (!value) return null;
  const parts = String(value)
    .split("/")
    .map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [month, day, year] = parts;
  return new Date(year, month - 1, day);
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const getDisplayStatus = (item) => {
  const rawStatus = String(item.Status || "").trim();
  const lowered = rawStatus.toLowerCase();

  // "Expected" and "Yet To Open" are authoritative from the sync -- the
  // deadline on an Expected row is a projection, so re-deriving status from it
  // would flip these back to Open and present a guess as a real deadline.
  if (lowered === "expected") return "Expected";
  if (lowered === "yet to open") return "Yet to open";
  if (lowered === "closed") return "Closed";

  const deadline = parseDeadline(item["Last Date"]);
  if (!deadline) return rawStatus || "Status unavailable";
  const now = new Date();
  deadline.setHours(23, 59, 59, 999);
  return deadline < now ? "Closed" : rawStatus || "Status unavailable";
};

/** Deadline cell text. Tentative dates are shown as a month-level estimate,
 *  since a projected day-of-month implies more precision than we have. */
const getDeadlineLabel = (item) => {
  const raw = item["Last Date"];
  if (!raw) {
    const lowered = String(item.Status || "")
      .trim()
      .toLowerCase();
    return lowered === "yet to open" ? "To be announced" : "Not available";
  }
  if (!item["Is Tentative Date"]) return raw;

  const deadline = parseDeadline(raw);
  if (!deadline) return raw;
  return `Expected ~${MONTH_NAMES[deadline.getMonth()]} ${deadline.getFullYear()}`;
};

const APPLICATION_LINK_KEYS = [
  "officialLink",
  "Application Link",
  "applyLink",
  "link",
];

const resolveApplicationLink = (item) => {
  for (const key of APPLICATION_LINK_KEYS) {
    let link = item[key];
    if (typeof link === "string") {
      link = link.trim();
      if (link) {
        if (!/^https?:\/\//i.test(link)) {
          return `https://${link}`;
        }
        return link;
      }
    }
  }
  return null;
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
  <td className={`px-4 py-3 align-top text-[#332724] break-words ${className}`}>
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
  "NIRF criteria",
  "Scholarship Amount",
  "Scholarship Frequency",
  "No. of awards",
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
  const headers = ["Scholarship Name", "Status", "Last Date", "Official Link"];
  const expandedFields = [
    { key: "Stream", label: "Stream" },
    { key: "State", label: "State" },
    { key: "NIRF criteria", label: "College NIRF Rank" },
    { key: "Eligibility", label: "Eligibility" },
    { key: "Benefits", label: "Benefits" },
    { key: "Doc Required", label: "Documents Required" },
    { key: "Scholarship Amount", label: "Scholarship Amount" },
    { key: "Scholarship Frequency", label: "Frequency" },
    { key: "No. of awards", label: "No. of Awards" },
  ];

  const getStatusPillClass = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "closed":
        return "border border-[#f0c7c8] bg-[#fff1f1] text-[#8f2e31]";
      case "open":
        return "border border-[#c3e6cb] bg-[#f0fff4] text-[#1d6b33]";
      // Expected / Yet to open: neither open nor closed, so neither colour.
      default:
        return "border border-[#d8d3ad] bg-[#fff9e8] text-[#7a5b00]";
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#eaded8] bg-white shadow-sm">
      <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
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
              <tr
                className={`border-b border-[#eaded8] ${
                  index % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
                }`}
              >
                <TableCell className="font-medium">
                  {item["Scholarship Name"]}
                </TableCell>
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
                <TableCell>
                  {getDeadlineLabel(item)}
                  {item["Is Tentative Date"] && (
                    <span
                      className="mt-1 block text-xs text-[#8a6d3b]"
                      title={`Last confirmed deadline: ${item["Sheet Last Date"]}. This is an estimate based on last year's cycle.`}
                    >
                      Tentative
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {(() => {
                    const appLink = resolveApplicationLink(item);
                    return appLink ? (
                      <a
                        href={appLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[#B52326] hover:underline"
                      >
                        Visit source
                      </a>
                    ) : (
                      "Not available"
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <button
                    className="whitespace-nowrap rounded-lg bg-[#B52326] px-4 py-2 text-white hover:bg-[#9E1F22]"
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

import React, { useEffect, useState } from "react";
import {
  Award,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
  FileText,
  GraduationCap,
  IndianRupee,
  MapPin,
  X,
} from "lucide-react";

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

const getDisplayStatus = (item) => {
  const rawStatus = String(item.Status || "").trim();
  if (rawStatus.toLowerCase() === "closed") return "Closed";
  const deadline = parseDeadline(item["Last Date"]);
  if (!deadline) return rawStatus || "Status unavailable";
  const now = new Date();
  deadline.setHours(23, 59, 59, 999);
  return deadline < now ? "Closed" : rawStatus || "Status unavailable";
};

const headerSelectClass =
  "mt-2 w-full rounded-lg border border-[#d8c7c1] bg-white px-2 py-2 text-xs font-semibold text-[#5b1f20] outline-none transition focus:border-[#B52326] focus:ring-2 focus:ring-[#f4d5d6]";

const HeaderIconSelect = ({
  label,
  value,
  onChange,
  options,
  ariaLabel,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <span
      className="relative inline-flex items-center"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <span className="inline-flex items-center gap-1.5">
        <span>{label}</span>
        <button
          type="button"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${
            isOpen || value !== "all"
              ? "border-[#f0c7c8] bg-[#fff1f1] text-[#B52326] shadow-sm"
              : "border-transparent text-[#b5aaa6] hover:border-[#f0c7c8] hover:bg-[#fff1f1] hover:text-[#B52326]"
          }`}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title={selectedOption?.label || ariaLabel}
          onClick={() => setIsOpen((currentValue) => !currentValue)}
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
          {icon}
        </button>
      </span>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-[#f0c7c8] bg-white py-1 text-sm font-semibold text-[#5b1f20] shadow-xl"
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${
                  isSelected
                    ? "bg-[#fff1f1] text-[#B52326]"
                    : "hover:bg-[#fff7f4] hover:text-[#8f2e31]"
                }`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
};

const IconTableHeader = ({
  statusFilter,
  onStatusFilterChange,
  dateSort,
  onDateSortChange,
  statusOptions,
  statusCounts,
}) => (
  <thead>
    <tr className="bg-[#f8efec] text-left text-xs font-semibold text-[#5b1f20] sm:text-sm">
      <th className="whitespace-nowrap border-b border-[#decac3] px-4 py-3">
        Scholarship Name
      </th>
      <th className="whitespace-nowrap border-b border-[#decac3] px-4 py-3">
        <HeaderIconSelect
          label="Status"
          value={statusFilter}
          onChange={onStatusFilterChange}
          ariaLabel="Filter scholarships by status"
          icon={
            <ChevronsUpDown
              className={`h-4 w-4 ${
                statusFilter !== "all" ? "text-[#B52326]" : ""
              }`}
              aria-hidden="true"
            />
          }
          options={statusOptions.map((option) => ({
            value: option.value,
            label: `${option.label} (${statusCounts[option.value] || 0})`,
          }))}
        />
      </th>
      <th className="whitespace-nowrap border-b border-[#decac3] px-4 py-3">
        <HeaderIconSelect
          label="Last Date"
          value={dateSort}
          onChange={onDateSortChange}
          ariaLabel="Sort scholarships by last date"
          icon={
            dateSort === "desc" ? (
              <ChevronDown
                className="h-4 w-4 text-[#B52326]"
                aria-hidden="true"
              />
            ) : (
              <ChevronUp
                className="h-4 w-4 text-[#B52326]"
                aria-hidden="true"
              />
            )
          }
          options={[
            { value: "desc", label: "Recent first" },
            { value: "asc", label: "Oldest first" },
          ]}
        />
      </th>
      <th className="whitespace-nowrap border-b border-[#decac3] px-4 py-3">
        Official Link
      </th>
      <th className="whitespace-nowrap border-b border-[#decac3] px-4 py-3">
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

const detailButtonClass =
  "touch-target inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#B52326] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9E1F22] focus-visible:outline-[#B52326] sm:w-auto";

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
    <div className="space-y-2">
      {items.map((line, i) => (
        <div key={i} className="flex gap-2 leading-6">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B52326]" />
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
};

const InfoTile = ({ icon: Icon, label, children }) => (
  <div className="rounded-xl border border-[#eaded8] bg-[#fffdfa] p-3 sm:p-4">
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[#8f2e31]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff1f1] text-[#B52326]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {label}
    </div>
    <div className="break-words text-sm leading-6 text-[#332724]">
      {children}
    </div>
  </div>
);

const DetailSection = ({ label, children }) => (
  <section className="rounded-xl border border-[#eaded8] bg-white p-4">
    <h3 className="mb-2 text-sm font-semibold text-[#8f2e31]">{label}</h3>
    <div className="break-words text-sm leading-6 text-[#332724]">
      {children}
    </div>
  </section>
);

const ScholarshipDetailsModal = ({ item, expandedFields, onClose }) => {
  useEffect(() => {
    if (!item) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [item, onClose]);

  if (!item) return null;

  const compactFields = expandedFields.filter((field) =>
    compactFieldKeys.has(field.key)
  );
  const detailedFields = expandedFields.filter(
    (field) => !compactFieldKeys.has(field.key)
  );
  const displayStatus = getDisplayStatus(item);
  const isClosed = String(displayStatus || "").toLowerCase() === "closed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2f2320]/55 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-6 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scholarship-detail-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#f0c7c8] bg-[#fffdfa] shadow-2xl">
        <div className="border-b border-[#eaded8] bg-[#B52326] px-4 py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-[#ffe4e4]">
                Scholarship Details
              </p>
              <h2
                id="scholarship-detail-title"
                className="mt-1 text-lg font-bold leading-7 text-white sm:text-2xl"
              >
                {item["Scholarship Name"]}
              </h2>
            </div>
            <button
              type="button"
              className="touch-target inline-flex shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              onClick={onClose}
              aria-label="Close scholarship details"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoTile icon={Award} label="Status">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  isClosed
                    ? "border border-[#f0c7c8] bg-[#fff1f1] text-[#8f2e31]"
                    : "border border-[#d8d3ad] bg-[#fff9e8] text-[#7a5b00]"
                }`}
              >
                {displayStatus}
              </span>
            </InfoTile>
            <InfoTile icon={CalendarDays} label="Last Date">
              {item["Last Date"] || "Not available"}
            </InfoTile>
            <InfoTile icon={IndianRupee} label="Amount">
              {renderFieldContent(item["Scholarship Amount"])}
            </InfoTile>
            <InfoTile icon={MapPin} label="State">
              {renderFieldContent(item.State)}
            </InfoTile>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            {compactFields
              .filter(
                (field) =>
                  field.key !== "Scholarship Amount" && field.key !== "State"
              )
              .map((field) => (
                <InfoTile
                  key={field.key}
                  icon={field.key === "Stream" ? GraduationCap : FileText}
                  label={field.label}
                >
                  {renderFieldContent(item[field.key])}
                </InfoTile>
              ))}
          </div>

          <div className="mt-3 grid gap-3">
            {detailedFields.map((field, index) => (
              <DetailSection key={index} label={field.label}>
                {renderFieldContent(item[field.key])}
              </DetailSection>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#eaded8] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-[#7a6159]">
            Review the official source before applying.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="touch-target inline-flex items-center justify-center rounded-lg border border-[#d8c7c1] bg-white px-4 py-2 text-sm font-semibold text-[#5b1f20] transition hover:bg-[#fff7f4]"
              onClick={onClose}
            >
              Close
            </button>
            {item["Application Link"] && (
              <a
                href={item["Application Link"]}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target inline-flex items-center justify-center gap-2 rounded-lg bg-[#B52326] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9E1F22]"
              >
                Visit source
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileTableControls = ({
  statusFilter,
  onStatusFilterChange,
  dateSort,
  onDateSortChange,
  statusOptions,
  statusCounts,
}) => (
  <div className="grid gap-3 rounded-xl border border-[#eaded8] bg-white p-3 shadow-sm sm:grid-cols-2 md:hidden">
    <label className="text-xs font-semibold text-[#5b1f20]">
      Status
      <select
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
        className={`${headerSelectClass} min-h-12 text-sm`}
        aria-label="Filter scholarships by status"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({statusCounts[option.value] || 0})
          </option>
        ))}
      </select>
    </label>
    <label className="text-xs font-semibold text-[#5b1f20]">
      Last Date
      <select
        value={dateSort}
        onChange={(event) => onDateSortChange(event.target.value)}
        className={`${headerSelectClass} min-h-12 text-sm`}
        aria-label="Sort scholarships by last date"
      >
        <option value="desc">Recent first</option>
        <option value="asc">Oldest first</option>
      </select>
    </label>
  </div>
);

const ScholarshipTable = ({
  filteredData,
  statusFilter,
  onStatusFilterChange,
  dateSort,
  onDateSortChange,
  statusOptions,
  statusCounts,
}) => {
  const [selectedScholarship, setSelectedScholarship] = useState(null);
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
    <>
      <div className="space-y-3 md:hidden">
        <MobileTableControls
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          dateSort={dateSort}
          onDateSortChange={onDateSortChange}
          statusOptions={statusOptions}
          statusCounts={statusCounts}
        />
        {filteredData?.length === 0 && (
          <div className="rounded-xl border border-[#eaded8] bg-white px-4 py-6 text-center text-[#5b3a34]">
            No scholarships found. Please try again with different filters.
          </div>
        )}
        {filteredData?.map((item, index) => {
          const displayStatus = getDisplayStatus(item);

          return (
            <article
              key={index}
              className="rounded-xl border border-[#eaded8] bg-white p-4 shadow-sm"
            >
              <div className="mb-3 border-b border-[#f0e3df] pb-3">
                <p className="text-xs font-semibold uppercase text-[#8f2e31]">
                  Scholarship Name
                </p>
                <h3 className="mt-1 text-base font-semibold leading-6 text-[#2f2320]">
                  {item["Scholarship Name"]}
                </h3>
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-[#7a6159]">
                    Status
                  </dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusPillClass(
                        displayStatus
                      )}`}
                    >
                      {displayStatus}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[#7a6159]">
                    Last Date
                  </dt>
                  <dd className="mt-1 text-[#332724]">
                    {item["Last Date"] || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[#7a6159]">
                    Official Link
                  </dt>
                  <dd className="mt-1">
                    {item["Application Link"] ? (
                      <a
                        href={item["Application Link"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="touch-target inline-flex items-center font-medium text-[#B52326] hover:underline"
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
                      <span className="text-[#332724]">Not available</span>
                    )}
                  </dd>
                </div>
              </dl>
              <button
                className={`${detailButtonClass} mt-4`}
                onClick={() => setSelectedScholarship(item)}
              >
                Show More
              </button>
            </article>
          );
        })}
      </div>
      <div className="mobile-scroll-shadow hidden overflow-x-auto rounded-2xl border border-[#eaded8] bg-white shadow-sm md:block">
        <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
          <IconTableHeader
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            dateSort={dateSort}
            onDateSortChange={onDateSortChange}
            statusOptions={statusOptions}
            statusCounts={statusCounts}
          />
          <tbody>
            {filteredData?.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="px-4 py-6 text-center text-[#5b3a34]"
                >
                  No scholarships found. Please try again with different
                  filters.
                </td>
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
                      className={detailButtonClass}
                      onClick={() => setSelectedScholarship(item)}
                    >
                      Show More
                    </button>
                  </TableCell>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <ScholarshipDetailsModal
        item={selectedScholarship}
        expandedFields={expandedFields}
        onClose={() => setSelectedScholarship(null)}
      />
    </>
  );
};

export default ScholarshipTable;

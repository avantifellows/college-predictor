import React, { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import ScholarshipTable from "./ScholarshipTable";

const fuseOptions = {
  includeScore: false,
  shouldSort: true,
  threshold: 0.3,
  ignoreLocation: true,
  keys: ["Scholarship Name", "Stream", "State", "Eligibility"],
};

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

const isReferenceClosed = (scholarship) => {
  const rawStatus = String(scholarship.Status || "").toLowerCase();
  if (rawStatus === "closed") return true;
  const deadline = parseDeadline(scholarship["Last Date"]);
  if (!deadline) return false;
  const now = new Date();
  deadline.setHours(23, 59, 59, 999);
  return deadline < now;
};

const statusOptions = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const ScholarshipReferenceBrowser = () => {
  const [scholarships, setScholarships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateSort, setDateSort] = useState("desc");

  useEffect(() => {
    const loadScholarships = async () => {
      try {
        const response = await fetch(
          "/data/scholarships/scholarship_data.json"
        );
        const data = await response.json();
        const sortedData = [...data].sort((a, b) =>
          String(a["Scholarship Name"] || "").localeCompare(
            String(b["Scholarship Name"] || "")
          )
        );
        setScholarships(sortedData);
      } catch (error) {
        console.error("Failed to load scholarship reference data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadScholarships();
  }, []);

  const fuseInstance = useMemo(
    () => new Fuse(scholarships, fuseOptions),
    [scholarships]
  );

  const filteredScholarships = useMemo(() => {
    const searchedScholarships = searchTerm.trim()
      ? fuseInstance.search(searchTerm.trim()).map((result) => result.item)
      : scholarships;

    const statusFilteredScholarships = searchedScholarships.filter((item) => {
      if (statusFilter === "all") return true;
      const isClosed = isReferenceClosed(item);
      return statusFilter === "closed" ? isClosed : !isClosed;
    });

    return [...statusFilteredScholarships].sort((a, b) => {
      const firstDate = parseDeadline(a["Last Date"]);
      const secondDate = parseDeadline(b["Last Date"]);

      if (!firstDate && !secondDate) {
        return String(a["Scholarship Name"] || "").localeCompare(
          String(b["Scholarship Name"] || "")
        );
      }
      if (!firstDate) return 1;
      if (!secondDate) return -1;

      return dateSort === "desc"
        ? secondDate.getTime() - firstDate.getTime()
        : firstDate.getTime() - secondDate.getTime();
    });
  }, [dateSort, fuseInstance, scholarships, searchTerm, statusFilter]);

  const closedCount = useMemo(
    () => scholarships.filter((item) => isReferenceClosed(item)).length,
    [scholarships]
  );
  const openCount = scholarships.length - closedCount;

  return (
    <div className="min-h-screen bg-[#fdf8f6] px-3 py-4 sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 rounded-xl border border-[#eaded8] bg-white p-4 shadow-sm sm:mb-6 sm:rounded-2xl sm:p-6">
          <h1 className="text-xl font-bold text-[#2f2320] sm:text-3xl">
            Scholarship Reference List
          </h1>
          <p className="mt-2 max-w-3xl text-sm sm:text-base text-[#5b3a34]">
            This is a reference list. Scholarships shown here should be treated
            as closed or deadline-passed.
          </p>
          {!isLoading && scholarships.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#5b3a34]">
              <span className="inline-flex min-h-8 items-center rounded-full border border-[#e3d1cb] bg-[#fff7f4] px-3 py-1">
                {scholarships.length.toLocaleString("en-IN")} scholarships in
                the reference list
              </span>
              <span className="inline-flex min-h-8 items-center rounded-full border border-[#f0c7c8] bg-[#fff1f1] px-3 py-1 text-[#8f2e31]">
                {closedCount.toLocaleString("en-IN")} currently closed or past
                deadline
              </span>
            </div>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-[#eaded8] bg-white p-4 shadow-sm sm:mb-6 sm:rounded-2xl sm:p-5">
          <label
            htmlFor="scholarship-search"
            className="mb-2 block text-sm font-semibold text-[#5b1f20]"
          >
            Search by scholarship name, stream, state, or eligibility
          </label>
          <input
            id="scholarship-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Try: engineering, girls scholarship, Maharashtra..."
            className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] px-4 py-3 text-base text-[#2f2320] outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
          />
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-[#eaded8] bg-white px-4 py-10 text-center text-[#5b3a34] shadow-sm sm:rounded-2xl sm:px-6 sm:py-12">
            Loading scholarship reference list...
          </div>
        ) : (
          <ScholarshipTable
            filteredData={filteredScholarships}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            dateSort={dateSort}
            onDateSortChange={setDateSort}
            statusOptions={statusOptions}
            statusCounts={{
              all: scholarships.length,
              open: openCount,
              closed: closedCount,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ScholarshipReferenceBrowser;

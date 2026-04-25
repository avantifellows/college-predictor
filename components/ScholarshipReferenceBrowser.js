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
  const parts = String(value).split("/").map((part) => Number(part));
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

const ScholarshipReferenceBrowser = () => {
  const [scholarships, setScholarships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    const loadScholarships = async () => {
      try {
        const response = await fetch("/data/scholarships/scholarship_data.json");
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
    if (!searchTerm.trim()) {
      return scholarships;
    }
    return fuseInstance.search(searchTerm.trim()).map((result) => result.item);
  }, [fuseInstance, scholarships, searchTerm]);

  const closedCount = useMemo(
    () => scholarships.filter((item) => isReferenceClosed(item)).length,
    [scholarships]
  );

  const toggleRowExpansion = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="flex min-h-[calc(100vh-138px)] flex-col pb-12 pt-6 sm:pt-8">
      <div className="app-page w-full max-w-6xl">
        <div className="glass-card mb-6 p-6">
          <div className="mb-3 inline-flex rounded-full border border-[var(--stroke)] bg-[var(--bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
            Scholarship Discovery
          </div>
          <h1 className="text-2xl font-bold text-[#0f172a] sm:text-3xl">
            Scholarship Reference List
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)] sm:text-base">
            This is a reference list. Scholarships shown here should be treated
            as closed or deadline-passed.
          </p>
          {!isLoading && scholarships.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--text-muted)]">
              <span className="rounded-full border border-[var(--stroke)] bg-[var(--bg-soft)] px-3 py-1">
                {scholarships.length.toLocaleString("en-IN")} scholarships in
                the reference list
              </span>
              <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-[#9f2f2f]">
                {closedCount.toLocaleString("en-IN")} currently closed or past
                deadline
              </span>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5 shadow-sm">
          <label
            htmlFor="scholarship-search"
            className="mb-2 block text-sm font-semibold text-[#1e293b]"
          >
            Search by scholarship name, stream, state, or eligibility
          </label>
          <input
            id="scholarship-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Try: engineering, girls scholarship, Maharashtra..."
            className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(182,58,48,0.22)]"
          />
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-6 py-12 text-center text-[var(--text-muted)] shadow-sm">
            Loading scholarship reference list...
          </div>
        ) : filteredScholarships.length > 0 ? (
          <ScholarshipTable
            filteredData={filteredScholarships}
            toggleRowExpansion={toggleRowExpansion}
            expandedRows={expandedRows}
          />
        ) : (
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-6 py-12 text-center text-[var(--text-muted)] shadow-sm">
            No scholarships matched your search. Try a broader keyword.
          </div>
        )}
      </div>
    </div>
  );
};

export default ScholarshipReferenceBrowser;

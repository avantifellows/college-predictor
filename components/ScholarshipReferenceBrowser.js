import React, { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import Dropdown from "./dropdown";
import ScholarshipTable from "./ScholarshipTable";

const fuseOptions = {
  includeScore: false,
  shouldSort: true,
  threshold: 0.3,
  ignoreLocation: true,
  keys: [
    "Scholarship Name",
    "Stream",
    "State",
    "City",
    "Eligibility",
    "Benefits",
  ],
};

const defaultFilters = {
  status: "",
  grade: "",
  stream: "",
  gender: "",
  familyIncome: "",
  category: "",
  state: "",
  city: "",
};

const gradeOptions = [
  { value: "", label: "All grades" },
  { value: "10", label: "Class 10" },
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
  { value: "12_pass", label: "12th Passed" },
  { value: "UG", label: "UG" },
  { value: "PG", label: "PG" },
  { value: "Diploma", label: "Diploma/ITI" },
];

const familyIncomeOptions = [
  { value: "", label: "Any income" },
  { value: "2", label: "Up to 2 Lakh" },
  { value: "4", label: "Up to 4 Lakh" },
  { value: "6", label: "Up to 6 Lakh" },
  { value: "8", label: "Up to 8 Lakh" },
  { value: "10", label: "Up to 10 Lakh" },
  { value: "above", label: "Above 10 Lakh" },
];

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "Open", label: "Open now" },
  { value: "Closed", label: "Closed / past deadline" },
];

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

const splitValues = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const buildOptionsFromData = (scholarships, field, allLabel) => {
  const values = new Set();
  scholarships.forEach((scholarship) => {
    splitValues(scholarship[field]).forEach((value) => {
      if (!["Any", "All India"].includes(value)) {
        values.add(value);
      }
    });
  });

  return [
    { value: "", label: allLabel },
    ...Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
  ];
};

const getOptionLabel = (options, value) =>
  options.find((option) => option.value === value)?.label || value;

const matchesMultiValueField = (rawValue, selectedValue, universalValues) => {
  if (!selectedValue) return true;
  const values = splitValues(rawValue).map(normalize);
  const selected = normalize(selectedValue);
  return (
    values.includes(selected) ||
    universalValues.some((value) => values.includes(normalize(value)))
  );
};

const matchesFamilyIncome = (scholarship, selectedIncome) => {
  if (!selectedIncome) return true;
  const scholarshipLimit = Number(scholarship["Family Income (in INR)"]);
  if (!Number.isFinite(scholarshipLimit)) return true;
  if (selectedIncome === "above") return scholarshipLimit >= 10;
  return Number(selectedIncome) <= scholarshipLimit;
};

const ScholarshipReferenceBrowser = () => {
  const [scholarships, setScholarships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState({});
  const [filters, setFilters] = useState(defaultFilters);

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
        console.error("Failed to load scholarship data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadScholarships();
  }, []);

  useEffect(() => {
    setExpandedRows({});
  }, [filters, searchTerm]);

  const fuseInstance = useMemo(
    () => new Fuse(scholarships, fuseOptions),
    [scholarships]
  );

  const filterOptions = useMemo(
    () => ({
      status: statusOptions,
      grade: gradeOptions,
      stream: buildOptionsFromData(scholarships, "Stream", "All streams"),
      gender: buildOptionsFromData(scholarships, "Gender", "All genders"),
      familyIncome: familyIncomeOptions,
      category: buildOptionsFromData(
        scholarships,
        "Category",
        "All categories"
      ),
      state: buildOptionsFromData(scholarships, "State", "All states"),
      city: buildOptionsFromData(scholarships, "City", "All cities"),
    }),
    [scholarships]
  );

  const searchedScholarships = useMemo(
    () =>
      searchTerm.trim()
        ? fuseInstance.search(searchTerm.trim()).map((result) => result.item)
        : scholarships,
    [fuseInstance, scholarships, searchTerm]
  );

  const filteredScholarships = useMemo(
    () =>
      searchedScholarships.filter((scholarship) => {
        if (filters.status === "Open" && isReferenceClosed(scholarship)) {
          return false;
        }
        if (filters.status === "Closed" && !isReferenceClosed(scholarship)) {
          return false;
        }
        if (
          filters.grade &&
          !Array.isArray(scholarship.Grade) &&
          scholarship.Grade !== filters.grade
        ) {
          return false;
        }
        if (
          filters.grade &&
          Array.isArray(scholarship.Grade) &&
          !scholarship.Grade.includes(filters.grade)
        ) {
          return false;
        }
        if (
          !matchesMultiValueField(scholarship.Stream, filters.stream, ["Any"])
        ) {
          return false;
        }
        if (
          !matchesMultiValueField(scholarship.Gender, filters.gender, ["Any"])
        ) {
          return false;
        }
        if (
          !matchesMultiValueField(scholarship.Category, filters.category, [
            "Any",
          ])
        ) {
          return false;
        }
        if (
          !matchesMultiValueField(scholarship.State, filters.state, [
            "All India",
          ])
        ) {
          return false;
        }
        if (!matchesMultiValueField(scholarship.City, filters.city, ["Any"])) {
          return false;
        }
        return matchesFamilyIncome(scholarship, filters.familyIncome);
      }),
    [filters, searchedScholarships]
  );

  const openCount = useMemo(
    () => scholarships.filter((item) => !isReferenceClosed(item)).length,
    [scholarships]
  );

  const activeFilterChips = useMemo(
    () =>
      Object.entries(filters)
        .filter(([, value]) => value)
        .map(([key, value]) => ({
          key,
          label: getOptionLabel(filterOptions[key], value),
        })),
    [filterOptions, filters]
  );

  const setFilter = (name) => (selectedOption) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: selectedOption?.value || "",
    }));
  };

  const clearFilter = (name) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: "",
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSearchTerm("");
  };

  const toggleRowExpansion = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const renderFilter = (name, label) => (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-semibold text-[#5b1f20]">
        {label}
      </label>
      <Dropdown
        options={filterOptions[name]}
        selectedValue={filters[name]}
        onChange={setFilter(name)}
        className="text-sm"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdf8f6] px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 rounded-2xl border border-[#eaded8] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#2f2320] sm:text-3xl">
                Scholarship Finder
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-[#5b3a34] sm:text-base">
                Find scholarships by class, stream, location, income, category,
                and eligibility.
              </p>
            </div>
            {!isLoading && scholarships.length > 0 && (
              <div className="flex flex-wrap gap-2 text-sm text-[#5b3a34] lg:justify-end">
                <span className="rounded-full border border-[#e3d1cb] bg-[#fff7f4] px-3 py-1">
                  {scholarships.length.toLocaleString("en-IN")} scholarships
                </span>
                <span className="rounded-full border border-[#c3e6cb] bg-[#f0fff4] px-3 py-1 text-green-800">
                  {openCount.toLocaleString("en-IN")} open now
                </span>
                <span className="rounded-full border border-[#e3d1cb] bg-white px-3 py-1">
                  {filteredScholarships.length.toLocaleString("en-IN")} matches
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-[#eaded8] bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2">
              <label
                htmlFor="scholarship-search"
                className="mb-2 block text-sm font-semibold text-[#5b1f20]"
              >
                Search
              </label>
              <input
                id="scholarship-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Scholarship name, stream, state, eligibility"
                className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] px-4 py-3 text-sm text-[#2f2320] outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
              />
            </div>
            {renderFilter("status", "Status")}
            {renderFilter("grade", "Grade")}
            {renderFilter("stream", "Stream")}
            {renderFilter("familyIncome", "Family Income")}
            {renderFilter("gender", "Gender")}
            {renderFilter("category", "Category")}
            {renderFilter("state", "State")}
            {renderFilter("city", "City")}
          </div>

          {(activeFilterChips.length > 0 || searchTerm) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="rounded-full border border-[#e3d1cb] bg-[#fffdfa] px-3 py-1 text-sm font-medium text-[#5b3a34] hover:bg-[#f8efec]"
                >
                  Search: {searchTerm} Clear
                </button>
              )}
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => clearFilter(chip.key)}
                  className="rounded-full border border-[#e3d1cb] bg-[#fffdfa] px-3 py-1 text-sm font-medium text-[#5b3a34] hover:bg-[#f8efec]"
                >
                  {chip.label} Clear
                </button>
              ))}
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full border border-[#d8c7c1] bg-white px-3 py-1 text-sm font-semibold text-[#8f2e31] hover:bg-[#f8efec]"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#eaded8] bg-white px-6 py-12 text-center text-[#5b3a34] shadow-sm">
            Loading scholarships...
          </div>
        ) : filteredScholarships.length > 0 ? (
          <ScholarshipTable
            filteredData={filteredScholarships}
            toggleRowExpansion={toggleRowExpansion}
            expandedRows={expandedRows}
          />
        ) : (
          <div className="rounded-2xl border border-[#eaded8] bg-white px-6 py-12 text-center text-[#5b3a34] shadow-sm">
            No scholarships matched your filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default ScholarshipReferenceBrowser;

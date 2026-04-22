import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Info } from "lucide-react";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";
import { trackEvent } from "../lib/analytics";

// Define fields for the expanded view
const expandedFields = {
  // TGEAPCET - Telangana Engineering, Agriculture and Pharmacy Common Entrance Test
  TGEAPCET: [
    { key: "inst_code", label: "Institute Code" },
    { key: "place", label: "Location" },
    { key: "year_of_establish", label: "Year Established" },
    { key: "branch_name", label: "Branch Name" },
    {
      key: "tuition_fee",
      label: "Tuition Fee (per year)",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
    { key: "affiliated_to", label: "Affiliated University" },
  ],
  // JoSAA / JEE Main / JEE Advanced
  JoSAA: [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    {
      key: "Expected Salary",
      label: "Expected Salary",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
  ],
  "JEE Main-JOSAA": [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    {
      key: "Expected Salary",
      label: "Expected Salary",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
  ],
  "JEE Main-JAC": [
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "Category", label: "Category" },
    { key: "Gender", label: "Gender" },
    { key: "Defense", label: "Defense Quota" },
    { key: "PWD", label: "PWD Status" },
    { key: "Category_Key", label: "Category Key" },
  ],
  "JEE Advanced": [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    {
      key: "Expected Salary",
      label: "Expected Salary",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
  ],
  // Default fallback
  DEFAULT: [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    {
      key: "Expected Salary",
      label: "Expected Salary",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
  ],
  // GUJCET - Gujarat Common Entrance Test
  GUJCET: [
    { key: "AISHE Code", label: "AISHE Code" },
    { key: "District", label: "District" },
    { key: "Course", label: "Course" },
    { key: "Type of College", label: "Type of College" },
    {
      key: "Median Salary",
      label: "Median Salary",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
    {
      key: "Avg Placement",
      label: "Average Placement %",
      format: (value) => (value ? `${value}%` : "N/A"),
    },
    { key: "Total Seats", label: "Total Seats" },
    {
      key: "Course Fees (per year)",
      label: "Course Fees (per year)",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
  ],
  // KCET - Karnataka Common Entrance Test
  KCET: [
    { key: "Course Type", label: "Course Type" },
    { key: "State", label: "State" },
    { key: "Language", label: "Language" },
    { key: "Rural/Urban", label: "Region" },
    { key: "Closing Rank", label: "Closing Rank" },
  ],
  // TNEA - Tamil Nadu Engineering Admissions
  TNEA: [
    { key: "Institute ID", label: "Institute ID" },
    { key: "District", label: "District" },
    { key: "College Type", label: "College Type" },
    { key: "Cutoff Marks", label: "Cutoff Marks" },
  ],
  // MHT CET - Maharashtra Common Entrance Test
  "MHT CET": [
    { key: "Category", label: "Category" },
    { key: "Gender", label: "Gender" },
    { key: "Defense", label: "Defense Quota" },
    { key: "PWD", label: "PWD Status" },
    { key: "State", label: "State" },
    { key: "Category_Key", label: "Category Key" },
    { key: "Closing Rank", label: "Closing Rank" },
  ],
  // NEETUG - National Eligibility cum Entrance Test for Undergraduate
  NEETUG: [
    { key: "State", label: "State" },
    { key: "Seat Type", label: "Seat Type" },
    { key: "Gender", label: "Gender" },
    { key: "Category", label: "Category" },
    { key: "Closing Rank", label: "Closing Rank" },
  ],
};

const SALARY_HELP_TEXT =
  "Product of median salary and placement percentage of the graduating batch as reported by the college to NIRF. Data is reported as a college level aggregate";

// New ExpandedRow component
const ExpandedRowComponent = ({ item, fields, exam, examColumnMapping }) => {
  const getFieldValue = (item, field) => {
    const { key, format } = field;
    if (key in item) {
      const value = item[key];
      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        return format ? format(value) : String(value);
      }
      return "N/A";
    }
    return "N/A";
  };

  // Get the appropriate fields based on the exam type
  const fieldsToShow = fields[exam] || fields.DEFAULT;
  const columns = examColumnMapping[exam] || examColumnMapping.DEFAULT;

  return (
    <tr>
      <td
        colSpan={columns.length + 1}
        className="border-b border-[#eaded8] bg-[#fffdfa] p-4"
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          {fieldsToShow.map((field, idx) => (
            <div key={idx}>
              <p>
                <strong>{field.label}:</strong> {getFieldValue(item, field)}
              </p>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
};

const ROWS_PER_PAGE_INITIAL = 30; // Variable for initial rows

const PredictedCollegesTable = ({
  data = [],
  exam = "",
  searchTerm = "",
  onSearchChange = null,
}) => {
  const [expandedRows, setExpandedRows] = useState({});
  const [showAllRows, setShowAllRows] = useState(false); // State for showing all rows
  const [sortConfig, setSortConfig] = useState({
    key: "closing_rank",
    order: "asc",
  });
  const [salaryTooltip, setSalaryTooltip] = useState(null);

  const toggleRowExpansion = (index, rowItem) => {
    // Phase 4 metrics tracking: Capture specific colleges students are interested in when they expand details
    if (!expandedRows[index]) {
      const collegeName = rowItem.institute || rowItem.Institute || rowItem["College Name"] || "Unknown College";
      trackEvent("college_row_expanded", {
        exam,
        college: collegeName,
        course: rowItem.academic_program_name || rowItem.Course || "Unknown Course"
      });
    }

    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const showSalaryTooltip = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSalaryTooltip({
      top: rect.bottom + 10,
      left: rect.right - 280,
    });
  };

  const hideSalaryTooltip = () => {
    setSalaryTooltip(null);
  };

  const commonTableClass = "w-full min-w-[720px] border-collapse text-sm";
  const commonHeaderClass =
    "bg-[#f8efec] text-[#5b1f20] font-semibold text-left text-xs sm:text-sm";
  const commonCellClass =
    "border-b border-[#eaded8] text-xs sm:text-sm text-[#332724]";

  const isJosaaExam =
    exam === "JoSAA" || exam === "JEE Main-JOSAA" || exam === "JEE Advanced";
  const supportsExpandedView = !isJosaaExam;
  const supportsSalarySort = isJosaaExam;
  const salaryColumnKey = "expected_salary";
  const rankColumnKey = "closing_rank";

  const parseSalaryValue = (raw) => {
    if (raw === null || raw === undefined) return null;
    const cleaned = String(raw).replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const numeric = Number(cleaned);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  };

  const formatSalary = (value, item) => {
    if (item) {
      const highestRaw = item["Highest Package"] || item.highest_package;
      const averageRaw = item["Average Package"] || item.average_package;

      const highestNum = parseSalaryValue(highestRaw);
      const averageNum = parseSalaryValue(averageRaw);

      if (highestNum || averageNum) {
        const highestStr = highestNum
          ? `Highest: ₹${highestNum.toLocaleString("en-IN")}`
          : "";
        const avgStr = averageNum
          ? `Avg: ₹${averageNum.toLocaleString("en-IN")}`
          : "";
        if (highestNum && averageNum) return `${highestStr} / ${avgStr}`;
        return highestStr || avgStr;
      }
    }

    const numericValue = parseSalaryValue(value);
    if (!numericValue) return "N/A";
    return `₹${numericValue.toLocaleString("en-IN")}`;
  };

  const formatPercentage = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "N/A";
    return `${numericValue.toFixed(2)}%`;
  };

  useEffect(() => {
    if (!supportsSalarySort) return;
    setSortConfig({ key: rankColumnKey, order: "asc" });
  }, [exam, data, supportsSalarySort, rankColumnKey]);

  const examColumnMapping = {
    TNEA: [
      { key: "prediction_probability", label: "Probability" },
      { key: "admission_chance", label: "Prediction" },
      { key: "institute_id", label: "Institute ID" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Course" },
      { key: "college_type", label: "Institute Type" },
      { key: "closing_rank", label: "Cutoff Marks" },
      { key: "quota", label: "Category" },
    ],
    JoSAA: [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Academic Program Name" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "Seat Type", label: "Category" },
    ],
    "JEE Main-JOSAA": [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Academic Program Name" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "Seat Type", label: "Category" },
    ],
    "JEE Main-JAC": [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "Category", label: "Category" },
    ],
    "JEE Advanced": [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      {
        key: "expected_salary",
        label: "Expected Salary (NIRF) / Packages",
        format: formatSalary,
      },
      { key: "Seat Type", label: "Seat Type" },
    ],
    TGEAPCET: [
      { key: "institute_name", label: "Institute Name" },
      { key: "branch_name", label: "Academic Program" },
      { key: "closing_rank", label: "Closing Rank" },
    ],
    GUJCET: [
      { key: "College Name", label: "College Name" },
      { key: "District", label: "District" },
      { key: "Course", label: "Course" },
      {
        key: "closing_marks",
        label: "Cutoff Percentage",
        format: formatPercentage,
      },
    ],
    KCET: [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
    ],
    "MHT CET": [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "category", label: "Category" },
    ],
    NEETUG: [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "category", label: "Category" },
    ],
    DEFAULT: [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
    ],
  };

  const predicted_colleges_table_column =
    examColumnMapping[exam] || examColumnMapping.DEFAULT;

  const transformData = (item) => {
    if (exam === "GUJCET") {
      return {
        ...item,
        institute: item["College Name"],
        academic_program_name: item["Course"],
        closing_rank: item["closing_marks"],
        state: item["District"],
      };
    }
    if (exam === "KCET") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
        category: item["Category"],
        "Course Type": item["Course Type"],
        "State": item["State"],
        "Language": item["Language"],
        "Rural/Urban": item["Rural/Urban"],
        "Category_Key": item["Category_Key"],
        "Closing Rank": item["Closing Rank"],
      };
    }
    if (exam === "TNEA") {
      return {
        ...item,
        institute_id: item["Institute ID"],
        institute: item["Institute"],
        academic_program_name: item["Course"],
        college_type: item["College Type"],
        closing_rank: item["Cutoff Marks"],
        quota: item["Category"],
        Category: item["Category"],
        "Institute ID": item["Institute ID"],
        "District": item["District"],
        "College Type": item["College Type"],
        "Cutoff Marks": item["Cutoff Marks"],
      };
    }
    // Handle JoSAA, JEE Main-JOSAA, and JEE Advanced (uses JEE data with full fields)
    if (
      exam === "JoSAA" ||
      exam === "JEE Main-JOSAA" ||
      exam === "JEE Advanced"
    ) {
      return {
        ...item,
        institute: item["Institute"],
        state: item["State"],
        academic_program_name: item["Academic Program Name"],
        fee: item["Fee"] || item["Fees"] || item["course_fees_per_year"] || item["Course Fee"] || "N/A",
        closing_rank: item["Closing Rank"],
        expected_salary: item["Expected Salary"],
        highest_package: item["Highest Package"],
        average_package: item["Average Package"],
        "Seat Type": item["Seat Type"],
        "State": item["State"],
        "Quota": item["Quota"] || "AI",
        "Closing Rank": item["Closing Rank"],
        "Opening Rank": item["Opening Rank"],
        "College Type": item["College Type"],
        "Management Type": item["Management Type"],
        "Expected Salary": item["Expected Salary"],
        "Salary Tier": item["Salary Tier"],
        "Exam": item["Exam"],
        Category: item["Seat Type"] || item["Category"] || "",
      };
    }
    // Handle JEE Main-JAC (uses JAC data with different fields)
    if (exam === "JEE Main-JAC") {
      return {
        ...item,
        institute: item["Institute"],
        state: item["State"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
        "State": item["State"],
        "Closing Rank": item["Closing Rank"],
        "Category": item["Category"],
        "Gender": item["Gender"],
        "Defense": item["Defense"],
        "PWD": item["PWD"],
        "Category_Key": item["Category_Key"],
        Category: item["Category"] || "",
      };
    }
    if (exam === "NEETUG") {
      return {
        ...item,
        institute: item["Institute"] || "",
        state: item["State"] || "",
        academic_program_name: item["Academic Program Name"] || "",
        closing_rank: item["Closing Rank"] || "",
        category: item["Category"] || "",
        "State": item["State"],
        "Seat Type": item["Seat Type"],
        "Gender": item["Gender"],
        "Category": item["Category"],
        "Closing Rank": item["Closing Rank"],
      };
    }
    if (exam === "MHT CET") {
      return {
        ...item,
        institute: item["Institute"] || "",
        academic_program_name: item["Academic Program Name"] || "",
        closing_rank: item["Closing Rank"] || "",
        category: item["Category"] || "",
        "Category": item["Category"],
        "Gender": item["Gender"],
        "Defense": item["Defense"],
        "PWD": item["PWD"],
        "State": item["State"],
        "Category_Key": item["Category_Key"],
        "Closing Rank": item["Closing Rank"],
      };
    }
    if (exam === "TGEAPCET") {
      // Return all original item data plus formatted fields
      return {
        ...item,
        institute_name: item.institute_name || "N/A",
        branch_name: item.branch_name || "N/A",
        closing_rank: item.closing_rank || "N/A",
        // Keep all other fields for the expanded view
        place: item.place || "N/A",
        year_of_establish: item.year_of_establish
          ? Math.floor(Number(item.year_of_establish)).toString()
          : "N/A",
        tuition_fee: item.tuition_fee || "N/A",
        affiliated_to: item.affiliated_to || "N/A",
      };
    }
    return {
      institute: item["Institute"],
      state: item["State"],
      academic_program_name: item["Academic Program Name"],
      closing_rank: item["Closing Rank"],
      quota: item["Quota"] || item["Category"],
      Category: item["Category"] || "",
    };
  };

  const getSalaryValue = (item) => {
    const raw =
      item?.["Expected Salary"] ??
      item?.expected_salary ??
      item?.["Expected Salary as per NIRF"];
    const numericValue = Number(raw);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const getClosingRankValue = (item) => {
    const raw =
      item?.["Closing Rank"] ??
      item?.closing_rank ??
      item?.["Cutoff Marks"] ??
      item?.closing_marks;
    const numericValue = Number(raw);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const sortedData = useMemo(() => {
    if (!supportsSalarySort) return data;
    if (!data.length) return data;
    const { key, order } = sortConfig || {};
    const copy = [...data];

    copy.sort((a, b) => {
      let aVal = null;
      let bVal = null;

      if (key === salaryColumnKey) {
        aVal = getSalaryValue(a);
        bVal = getSalaryValue(b);
      } else {
        aVal = getClosingRankValue(a);
        bVal = getClosingRankValue(b);
      }

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return order === "desc" ? bVal - aVal : aVal - bVal;
    });

    return copy;
  }, [data, sortConfig, supportsSalarySort]);

  const getDisplayValue = (column, transformedItem) => {
    const rawValue = transformedItem[column.key];
    if (column.format) {
      return column.format(rawValue, transformedItem);
    }
    if (rawValue === 0) return 0;
    return rawValue || "N/A";
  };

  const toggleSalarySort = () => {
    if (!supportsSalarySort) return;
    setSortConfig((prev) => {
      if (!prev || prev.key !== salaryColumnKey) {
        return { key: salaryColumnKey, order: "desc" };
      }
      return {
        key: salaryColumnKey,
        order: prev.order === "desc" ? "asc" : "desc",
      };
    });
  };

  const toggleRankSort = () => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== rankColumnKey) {
        return { key: rankColumnKey, order: "asc" };
      }
      return {
        key: rankColumnKey,
        order: prev.order === "asc" ? "desc" : "asc",
      };
    });
  };

  const renderSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={16} />;
    }
    if (sortConfig.order === "desc") {
      return <ArrowDown size={16} />;
    }
    return <ArrowUp size={16} />;
  };

  const downloadCsv = () => {
    if (!sortedData.length) return;
    const headers = predicted_colleges_table_column.map((column) =>
      column.label.replace(/"/g, '""')
    );
    const rows = sortedData.map((item) => {
      const transformedItem = transformData(item);
      return predicted_colleges_table_column.map((column) => {
        const value = getDisplayValue(column, transformedItem);
        const stringValue =
          value === null || value === undefined ? "" : String(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      });
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `college_predictions_${exam || "results"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderTableHeader = () => (
    <tr className={commonHeaderClass}>
      {predicted_colleges_table_column.map((column) => (
        <th
          key={column.key}
          className="px-4 py-3 border-b border-[#decac3] whitespace-nowrap"
        >
          {supportsSalarySort && column.key === rankColumnKey ? (
            <button
              type="button"
              onClick={toggleRankSort}
              className="font-semibold inline-flex items-center gap-1"
            >
              {column.label}
              {renderSortIcon(rankColumnKey)}
            </button>
          ) : supportsSalarySort && column.key === salaryColumnKey ? (
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSalarySort}
                className="font-semibold inline-flex items-center gap-1"
              >
                {column.label}
                {renderSortIcon(salaryColumnKey)}
              </button>
              <button
                type="button"
                onMouseEnter={showSalaryTooltip}
                onMouseLeave={hideSalaryTooltip}
                onFocus={showSalaryTooltip}
                onBlur={hideSalaryTooltip}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d6b8ae] text-[#8f2e31] hover:bg-[#f8efec]"
                aria-label="How expected salary is calculated"
              >
                <Info size={12} />
              </button>
            </div>
          ) : (
            column.label
          )}
        </th>
      ))}
      {supportsExpandedView && <th className="p-2">Actions</th>}
    </tr>
  );

  const renderTableBody = () => {
    const rowsToRender = showAllRows
      ? sortedData
      : sortedData.slice(0, ROWS_PER_PAGE_INITIAL);

    return rowsToRender.map((item, index) => {
      const transformedItem = transformData(item);

      return (
        <React.Fragment key={index}>
          <tr
            className={`${commonCellClass} ${
              index % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
            }`}
          >
            {predicted_colleges_table_column.map((column) => {
              const hasAdmissionChance = Boolean(transformedItem.admission_chance);
              const hasPredictionProbability = Boolean(transformedItem.prediction_probability);

              // Decide whether to hide the content (but still render the cell)
              const shouldHideValue =
                (column.key === "admission_chance" && !hasAdmissionChance) ||
                (column.key === "prediction_probability" && !hasPredictionProbability);

              const displayValue = shouldHideValue
                ? ""
                : getDisplayValue(column, transformedItem);

              let chipClass = "";
              if (column.key === "admission_chance" && hasAdmissionChance) {
                 if (displayValue === "Safe") chipClass = "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold";
                 else if (displayValue === "Moderate") chipClass = "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold";
                 else if (displayValue === "Ambitious") chipClass = "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold";
              }

              return (
                <td key={column.key} className="p-2 border-r border-gray-300">
                  {chipClass ? (
                    <span className={chipClass}>{displayValue}</span>
                  ) : (
                    displayValue
                  )}
                </td>
              );
            })}
            {supportsExpandedView && (
              <td className="px-4 py-3">
                <div className="flex justify-center">
                  <button
                    className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
                    onClick={() => toggleRowExpansion(index, transformedItem)}
                  >
                    {expandedRows[index] ? "Show Less" : "Show More"}
                  </button>
                </div>
              </td>
            )}
          </tr>
          {supportsExpandedView && expandedRows[index] && (
            <ExpandedRowComponent
              item={transformedItem}
              fields={expandedFields}
              exam={exam}
              examColumnMapping={examColumnMapping}
            />
          )}
        </React.Fragment>
      );
    });
  };

  const renderLegend = () => {
    const examConfig = examConfigs[exam];
    if (!examConfig || !examConfig.legend) return null;

    if (isJosaaExam) {
      return (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#5b3a34]">
          <span className="inline-flex items-center rounded-full border border-[#e3d1cb] bg-[#fffdfa] px-3 py-1 font-medium">
            Based on JoSAA 2024
          </span>
          <span className="text-[#6d5550]">
            Home-state quota is used where applicable; other colleges use
            all-India or out-of-state cutoffs.
          </span>
        </div>
      );
    }

    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#5b3a34]">
        <span className="font-semibold text-[#5b1f20]">Quota labels:</span>
        {examConfig.legend.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-2 rounded-full border border-[#e3d1cb] bg-[#fffdfa] px-3 py-1"
          >
            <strong className="text-[#8f2e31]">{item.key}</strong>
            <span>{item.value}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      {salaryTooltip && (
        <div
          className="pointer-events-none fixed z-50 w-72 rounded-xl border border-[#decac3] bg-white p-3 text-left text-xs font-normal leading-5 text-[#5b3a34] shadow-lg"
          style={{
            top: `${Math.max(salaryTooltip.top, 12)}px`,
            left: `${Math.max(salaryTooltip.left, 12)}px`,
          }}
        >
          {SALARY_HELP_TEXT}
        </div>
      )}
      {renderLegend()}
      {data.length > 0 && (
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-md">
            {onSearchChange && (
              <input
                type="text"
                id="results-search"
                aria-label="Filter results by institute, state, or program"
                value={searchTerm}
                onChange={onSearchChange}
                className="w-full rounded-xl border border-[#d8c7c1] bg-white px-4 py-3 text-left text-sm outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6] sm:text-base"
                placeholder="Filter by institute, state, or program"
              />
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <p className="text-sm text-[#5b3a34]">
              Showing {sortedData.length.toLocaleString("en-IN")} matching
              options.
            </p>
            <button
              className="w-full rounded-lg bg-[#B52326] px-4 py-2 text-white hover:bg-[#9E1F22] sm:w-auto"
              onClick={downloadCsv}
            >
              Download CSV
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-[#eaded8] bg-white shadow-sm">
        <table className={commonTableClass}>
          <thead>{renderTableHeader()}</thead>
          <tbody>{renderTableBody()}</tbody>
        </table>
      </div>
      {data.length > ROWS_PER_PAGE_INITIAL &&
        !showAllRows && ( // Conditional button rendering
          <div className="flex justify-center mt-4">
            <button
              className="whitespace-nowrap rounded-lg bg-[#B52326] px-6 py-3 font-semibold text-white hover:bg-[#9E1F22]"
              onClick={() => setShowAllRows(true)}
            >
              Show More Recommendations
            </button>
          </div>
        )}
    </div>
  );
};

PredictedCollegesTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      "Institute ID": PropTypes.string, // For TNEA
      Institute: PropTypes.string.isRequired,
      Course: PropTypes.string, // TNEA-specific
      Category: PropTypes.string.isRequired,
      "Cutoff Marks": PropTypes.string, // TNEA-specific
      "Institute Type": PropTypes.string, // TNEA-specific
      State: PropTypes.string,
      "Academic Program Name": PropTypes.string,
      "Closing Rank": PropTypes.string,
      Quota: PropTypes.string,
      "Opening Rank": PropTypes.string,
      "College Type": PropTypes.string,
      "Management Type": PropTypes.string,
      "Expected Salary": PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
      ]),
      "Salary Tier": PropTypes.string,
    })
  ),
  exam: PropTypes.string.isRequired,
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func,
};

export default PredictedCollegesTable;

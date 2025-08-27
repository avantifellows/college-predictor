import React, { useState } from "react";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";

// Define fields for the expanded view
const expandedFields = {
  NEET: [
    { key: "inst_code", label: "Institute Code" },
    { key: "place", label: "Location" },
    { key: "year_of_establish", label: "Year Established" },
    { key: "branch_name", label: "Branch Name" },
    {
      key: "tuition_fee",
      label: "Tuition Fee (per year)",
      format: (value) => `₹${Number(value).toLocaleString("en-IN")}`,
    },
  ],
  TSEAPERT: [
    { key: "inst_code", label: "Institute Code" },
    { key: "place", label: "Location" },
    { key: "year_of_establish", label: "Year Established" },
    { key: "branch_name", label: "Branch Name" },
    {
      key: "tuition_fee",
      label: "Tuition Fee (per year)",
      format: (value) => `₹${Number(value).toLocaleString("en-IN")}`,
    },
    { key: "affiliated_to", label: "Affiliated University" },
  ],
  DEFAULT: [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    { key: "Expected Salary", label: "Expected Salary" },
    { key: "Salary Tier", label: "Salary Tier" },
  ],
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
};

// New ExpandedRow component
const ExpandedRowComponent = ({ item, fields, exam, examColumnMapping }) => {
  const getFieldValue = (item, key) => {
    if (key in item) {
      const value = item[key];
      return value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
        ? String(value)
        : "N/A";
    }
    return "N/A";
  };

  // Get the appropriate fields based on the exam type
  const fieldsToShow = fields[exam] || fields.DEFAULT;
  const columns = examColumnMapping[exam] || examColumnMapping.DEFAULT;

  return (
    <tr>
      <td colSpan={columns.length + 1} className="p-0 border-b border-gray-200">
        <div
          className="bg-gradient-to-r from-red-50 to-red-100 p-6 border-l-4"
          style={{ borderLeftColor: "#B52326" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#B52326" }}
            ></div>
            <h4 className="font-semibold text-gray-800">Additional Details</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {fieldsToShow.map((field, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-lg shadow-sm border border-red-100"
              >
                <p className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-1">
                  {field.label}
                </p>
                <p className="text-gray-900">
                  {field.format
                    ? field.format(getFieldValue(item, field.key))
                    : getFieldValue(item, field.key)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
};

const ROWS_PER_PAGE_INITIAL = 30; // Variable for initial rows

const PredictedCollegesTable = ({ data = [], exam = "", userRank = null }) => {
  const [expandedRows, setExpandedRows] = useState({});
  const [showAllRows, setShowAllRows] = useState(false); // State for showing all rows

  const toggleRowExpansion = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Function to get row color based on rank comparison
  const getRowColorClass = (itemRank) => {
    if (!userRank || !itemRank || itemRank === "N/A") return "";

    const userRankNum = parseFloat(userRank);
    const itemRankNum = parseFloat(itemRank);

    if (isNaN(userRankNum) || isNaN(itemRankNum)) return "";

    // For ranks, lower number = better rank
    // Green: item rank is higher (worse) than user rank - user has better chance
    // Red: item rank is lower (better) than user rank - harder to get
    if (itemRankNum > userRankNum) {
      return "bg-green-50 hover:bg-green-100 border-l-4 border-green-400";
    } else if (itemRankNum < userRankNum) {
      return "bg-red-50 hover:bg-red-100 border-l-4 border-red-400";
    }
    return "";
  };

  const commonTableClass =
    "w-full mx-auto border-collapse text-sm sm:text-base shadow-lg rounded-lg overflow-hidden";
  const commonHeaderClass =
    "bg-gradient-to-r from-gray-50 to-gray-100 font-semibold text-center text-xs sm:text-sm md:text-base text-gray-800 border-b-2 border-gray-200";
  const commonCellClass =
    "p-3 border-b border-gray-200 text-center text-xs sm:text-sm md:text-base transition-colors duration-200";

  const examColumnMapping = {
    TNEA: [
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
      { key: "exam_type", label: "Exam Type" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "Seat Type", label: "Category" },
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
      { key: "closing_marks", label: "Cutoff Marks" },
    ],
    DEFAULT: [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Academic Program Name" },
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
    if (exam === "TNEA") {
      return {
        institute_id: item["Institute ID"],
        institute: item["Institute"],
        academic_program_name: item["Course"],
        college_type: item["College Type"],
        closing_rank: item["Cutoff Marks"],
        quota: item["Category"],
        Category: item["Category"],
      };
    }
    if (exam === "JoSAA") {
      return {
        institute: item["Institute"],
        state: item["State"],
        academic_program_name: item["Academic Program Name"],
        exam_type: item["Exam"],
        closing_rank: item["Closing Rank"],
        "Seat Type": item["Seat Type"],
        "State": item["State"],
        "Quota": item["Quota"] || "AI",
        "Closing Rank": item["Closing Rank"],
        "Opening Rank": item["Opening Rank"],
        "College Type": item["College Type"] || "Gen 1 IIT",
        "Management Type":
          item["Management Type"] ||
          "IIT/NIT/IIIT - Government Funded Technical Institute",
        "Expected Salary": item["Expected Salary"] || 0,
        "Salary Tier": item["Salary Tier"] || 1.0,
        "Exam": item["Exam"] || "JEE Advanced",
        Category: item["Seat Type"] || item["Category"] || "",
      };
    }
    if (exam === "NEET") {
      return {
        ...item,
        institute:
          item["Institute"] || item["institute"] || item["inst_code"] || "",
        state: item["State"] || item["state"] || "",
        academic_program_name:
          item["Academic Program Name"] || item["branch_name"] || "",
        closing_rank: item["Closing Rank"] || item["closing_rank"] || "",
        Category: item["Seat Type"] || item["Category"] || "",
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

  const renderTableHeader = () => (
    <tr className={commonHeaderClass}>
      {predicted_colleges_table_column.map((column, index) => (
        <th
          key={column.key}
          className={`p-4 ${
            index !== predicted_colleges_table_column.length - 1
              ? "border-r border-gray-200"
              : ""
          }`}
        >
          {column.label}
        </th>
      ))}
      <th className="p-4">Actions</th>
    </tr>
  );

  const renderTableBody = () => {
    const rowsToRender = showAllRows
      ? data
      : data.slice(0, ROWS_PER_PAGE_INITIAL);

    return rowsToRender.map((item, index) => {
      const transformedItem = transformData(item);
      // Extract rank more comprehensively
      const itemRank =
        transformedItem.closing_rank ||
        transformedItem.closing_marks ||
        transformedItem["Closing Rank"] ||
        transformedItem["closing_marks"] ||
        item["Closing Rank"] ||
        item["closing_rank"] ||
        item["closing_marks"];

      const rowColorClass = getRowColorClass(itemRank);

      return (
        <React.Fragment key={index}>
          <tr
            className={`${commonCellClass} ${
              rowColorClass ||
              (index % 2 === 0
                ? "bg-white hover:bg-red-50"
                : "bg-gray-50 hover:bg-red-50")
            } transition-colors duration-200`}
          >
            {predicted_colleges_table_column.map((column, colIndex) => (
              <td
                key={column.key}
                className={`p-4 ${
                  colIndex !== predicted_colleges_table_column.length - 1
                    ? "border-r border-gray-200"
                    : ""
                }`}
              >
                <div className="text-gray-800">
                  {transformedItem[column.key] || "N/A"}
                </div>
              </td>
            ))}
            <td className="p-4">
              <div className="flex justify-center">
                <button
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                  style={{
                    backgroundColor: expandedRows[index]
                      ? "#B52326"
                      : "#B52326",
                    color: "white",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#9e1f22";
                    e.target.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#B52326";
                    e.target.style.transform = "scale(1)";
                  }}
                  onClick={() => toggleRowExpansion(index)}
                >
                  {expandedRows[index] ? "Show Less" : "Show More"}
                </button>
              </div>
            </td>
          </tr>
          {expandedRows[index] && (
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

    return (
      <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "#B52326" }}
          ></div>
          <h3 className="text-sm font-semibold text-gray-800">Legend</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs sm:text-sm">
          {examConfig.legend.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="font-medium text-gray-700 min-w-fit">
                {item.key}:
              </span>
              <span className="text-gray-600">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full mx-auto">
      {renderLegend()}

      {/* Rank Color Legend */}
      {userRank && userRank !== "0" && userRank !== "0.00" && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#B52326" }}
            ></div>
            <h4 className="text-sm font-semibold text-gray-800">
              Your Rank:{" "}
              {parseFloat(userRank) % 1 === 0
                ? parseInt(userRank)
                : parseFloat(userRank)}
            </h4>
          </div>
          <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-l-2 border-green-400 rounded"></div>
              <span className="text-gray-700">
                Easier to get (rank higher than yours)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-l-2 border-red-400 rounded"></div>
              <span className="text-gray-700">
                Harder to get (rank lower than yours)
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <table className={commonTableClass}>
          <thead>{renderTableHeader()}</thead>
          <tbody>{renderTableBody()}</tbody>
        </table>
      </div>
      {data.length > ROWS_PER_PAGE_INITIAL && !showAllRows && (
        <div className="flex justify-center mt-6">
          <button
            className="px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            style={{ backgroundColor: "#B52326", color: "white" }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#9e1f22";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#B52326";
              e.target.style.transform = "scale(1)";
            }}
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
      "Expected Salary": PropTypes.string,
      "Salary Tier": PropTypes.string,
    })
  ),
  exam: PropTypes.string.isRequired,
  userRank: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default PredictedCollegesTable;

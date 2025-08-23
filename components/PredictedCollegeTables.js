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
      <td colSpan={columns.length + 1} className="p-4 border border-gray-300">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {fieldsToShow.map((field, idx) => (
            <div key={idx}>
              <p>
                <strong>{field.label}:</strong> {getFieldValue(item, field.key)}
              </p>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
};

const ROWS_PER_PAGE_INITIAL = 30; // Variable for initial rows

const PredictedCollegesTable = ({ data = [], exam = "" }) => {
  console.log("PredictedCollegeTables data:", data);
  console.log("PredictedCollegeTables exam:", exam);
  const [expandedRows, setExpandedRows] = useState({});
  const [showAllRows, setShowAllRows] = useState(false); // State for showing all rows

  const toggleRowExpansion = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const commonTableClass =
    "w-full mx-auto border-collapse text-sm sm:text-base";
  const commonHeaderClass =
    "bg-gray-200 font-bold text-center text-xs sm:text-sm md:text-base";
  const commonCellClass =
    "p-2 border border-gray-300 text-center text-xs sm:text-sm md:text-base";

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
      {predicted_colleges_table_column.map((column) => (
        <th key={column.key} className="p-2 border-r border-gray-300">
          {column.label}
        </th>
      ))}
      <th className="p-2">Actions</th> {/* Added Actions header */}
    </tr>
  );

  const renderTableBody = () => {
    const rowsToRender = showAllRows
      ? data
      : data.slice(0, ROWS_PER_PAGE_INITIAL);

    return rowsToRender.map((item, index) => {
      const transformedItem = transformData(item);

      return (
        <React.Fragment key={index}>
          <tr
            className={`${commonCellClass} ${
              index % 2 === 0 ? "bg-gray-100" : "bg-white"
            }`}
          >
            {predicted_colleges_table_column.map((column) => (
              <td key={column.key} className="p-2 border-r border-gray-300">
                {transformedItem[column.key] || "N/A"}
              </td>
            ))}
            <td className="p-2">
              <div className="flex justify-center">
                <button
                  className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
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
    console.log("this is the exam type", examConfig);
    if (!examConfig || !examConfig.legend) return null;

    return (
      <div className="flex flex-col items-center text-sm sm:text-base mb-4">
        {examConfig.legend.map((item, index) => (
          <p key={index} className="leading-4 mb-1">
            {item.key}: {item.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full mx-auto overflow-x-auto">
      {renderLegend()}
      <table className={`${commonTableClass} border border-gray-300`}>
        <thead>{renderTableHeader()}</thead>
        <tbody>{renderTableBody()}</tbody>
      </table>
      {data.length > ROWS_PER_PAGE_INITIAL &&
        !showAllRows && ( // Conditional button rendering
          <div className="flex justify-center mt-4">
            <button
              className="px-6 py-3 rounded bg-red-500 text-white hover:bg-red-600 font-semibold"
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
};

export default PredictedCollegesTable;

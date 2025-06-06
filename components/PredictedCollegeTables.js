import React, { useState } from "react";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";

// Define fields for the expanded view
const expandedFields = [
  { key: "Opening Rank", label: "Opening Rank" },
  { key: "Closing Rank", label: "Closing Rank" },
  { key: "State", label: "State" },
  { key: "Gender", label: "Gender" },
  { key: "College Type", label: "College Type" },
  { key: "Management Type", label: "Management Type" },
  { key: "Expected Salary", label: "Expected Salary" },
  { key: "Salary Tier", label: "Salary Tier" },
];

// New ExpandedRow component
const ExpandedRowComponent = ({ item, fields, exam, examColumnMapping }) => (
  <tr>
    <td
      colSpan={
        (examColumnMapping[exam] || examColumnMapping.DEFAULT).length + 1
      }
      className="p-4 border border-gray-300"
    >
      <div className="text-left text-sm sm:text-base">
        {typeof item.index !== "undefined" && (
          <div className="mb-2">
            <b>Data Index:</b> <span>{item.index}</span>
          </div>
        )}
        {fields.map((field, idx) => {
          const rawValue = item[field.key];
          let displayValue = "N/A"; // Default to N/A

          if (
            rawValue !== null &&
            typeof rawValue !== "undefined" &&
            String(rawValue).trim() !== ""
          ) {
            if (field.key === "Salary Tier") {
              const parsedValue = parseFloat(String(rawValue));
              if (!isNaN(parsedValue)) {
                displayValue = parseInt(parsedValue, 10);
              }
            } else if (field.key === "Expected Salary") {
              const cleanedValue = String(rawValue).replace(/[^0-9.]/g, "");
              const numericValue = parseFloat(cleanedValue);
              if (!isNaN(numericValue)) {
                displayValue = `Rs. ${Number(numericValue).toLocaleString(
                  "en-IN"
                )}`;
              }
            } else {
              displayValue = String(rawValue);
            }
          }

          return (
            <div key={idx} className="mb-2">
              <b>{field.label}:</b> <span>{displayValue}</span>
            </div>
          );
        })}
      </div>
    </td>
  </tr>
);

const ROWS_PER_PAGE_INITIAL = 30; // Variable for initial rows

const PredictedCollegesTable = ({ data = [], exam = "" }) => {
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
      { key: "quota", label: "Category" },
    ],
    DEFAULT: [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Academic Program Name" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "quota", label: "Category" },
    ],
  };

  const predicted_colleges_table_column =
    examColumnMapping[exam] || examColumnMapping.DEFAULT;

  const transformData = (item) => {
    console.log("transforming data");
    console.log(JSON.stringify(item, null, 2));
    if (exam === "TNEA") {
      return {
        institute_id: item["Institute ID"],
        institute: item["Institute"],
        academic_program_name: item["Course"],
        college_type: item["College Type"],
        closing_rank: item["Cutoff Marks"],
        quota: item["Category"],
      };
    }
    if (exam === "JoSAA") {
      return {
        institute: item["Institute"],
        state: item["State"],
        gender: item["Gender"],
        academic_program_name: item["Academic Program Name"],
        exam_type: item["Exam"],
        closing_rank: item["Closing Rank"],
        quota: item["Quota"] || item["Category"],
      };
    }
    return {
      institute: item["Institute"],
      state: item["State"],
      academic_program_name: item["Academic Program Name"],
      closing_rank: item["Closing Rank"],
      quota: item["Quota"] || item["Category"],
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
            {exam !== "TNEA" && (
              <td className="p-2 border-r border-gray-300">
                {transformedItem.state || "N/A"}
              </td>
            )}
            {exam === "TNEA" && (
              <td className="p-2 border-r border-gray-300">
                {transformedItem.institute_id || "N/A"}
              </td>
            )}
            <td className="p-2 border-r border-gray-300">
              {transformedItem.institute}
            </td>
            <td className="p-2 border-r border-gray-300">
              {transformedItem.academic_program_name}
            </td>
            {exam === "TNEA" && (
              <td className="p-2 border-r border-gray-300">
                {transformedItem.college_type}
              </td>
            )}
            {exam === "JoSAA" && (
              <td className="p-2 border-r border-gray-300">
                {transformedItem.exam_type}
              </td>
            )}
            <td className="p-2 border-r border-gray-300">
              {transformedItem.closing_rank}
            </td>
            <td className="p-2 border-r border-gray-300">
              {transformedItem.quota}
            </td>
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
              item={item}
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

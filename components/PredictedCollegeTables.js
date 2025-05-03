import React, { useState } from "react";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";
import AlternativeColleges from "./AlternativeColleges";
import { findSimilarColleges } from "../utils/collegeSimilarity";

const PredictedCollegesTable = ({ data = [], exam = "", onCollegeSelect }) => {
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [alternativeColleges, setAlternativeColleges] = useState([]);

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
      { key: "closing_rank", label: "Cutoff Marks" },
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
    if (exam === "TNEA") {
      return {
        institute: item["Institute"],
        course: item["Course"],
        location: item["State"] || "Tamil Nadu",
        closingRank: item["Cutoff Marks"],
        quota: item["Category"],
      };
    }
    return {
      institute: item["Institute"],
      course: item["Academic Program Name"],
      location: item["State"],
      closingRank: item["Closing Rank"],
      quota: item["Quota"] || item["Category"],
    };
  };

  const handleRowClick = (item, index) => {
    const transformedItem = transformData(item);
    if (onCollegeSelect) {
      onCollegeSelect(transformedItem);
    }
    
    // Toggle selection
    if (selectedRowIndex === index) {
      setSelectedRowIndex(null);
      setAlternativeColleges([]);
    } else {
      setSelectedRowIndex(index);
      const alternatives = findSimilarColleges(transformedItem, data);
      setAlternativeColleges(alternatives);
    }
  };

  const renderTableHeader = () => (
    <tr className={commonHeaderClass}>
      {predicted_colleges_table_column.map((column) => (
        <th key={column.key} className="p-2 border-r border-gray-300">
          {column.label}
        </th>
      ))}
    </tr>
  );

  const renderTableBody = () => {
    const rows = [];
    data.forEach((item, index) => {
      const isSelected = selectedRowIndex === index;
      
      // Add the main row
      rows.push(
        <React.Fragment key={`row-${index}`}>
          <tr
            className={`${commonCellClass} ${
              index % 2 === 0 ? "bg-gray-100" : "bg-white"
            } cursor-pointer hover:bg-blue-50 ${isSelected ? 'bg-blue-100' : ''}`}
            onClick={() => handleRowClick(item, index)}
          >
            {exam !== "TNEA" && (
              <td className="p-2 border-r border-gray-300">
                {item["State"] || "N/A"}
              </td>
            )}
            {exam === "TNEA" && (
              <td className="p-2 border-r border-gray-300">
                {item["Institute ID"] || "N/A"}
              </td>
            )}
            <td className="p-2 border-r border-gray-300">
              {item["Institute"]}
            </td>
            <td className="p-2 border-r border-gray-300">
              {exam === "TNEA" ? item["Course"] : item["Academic Program Name"]}
            </td>
            <td className="p-2 border-r border-gray-300">
              {exam === "TNEA" ? item["Cutoff Marks"] : item["Closing Rank"]}
            </td>
            <td className="p-2">{item["Quota"] || item["Category"]}</td>
          </tr>
          
          {/* Add alternative colleges row if this row is selected */}
          {isSelected && alternativeColleges.length > 0 && (
            <tr>
              <td colSpan={exam === "TNEA" ? 5 : 6} className="p-0">
                <div className="p-4 bg-gray-50">
                  <AlternativeColleges
                    targetCollege={item["Institute"]}
                    alternatives={alternativeColleges}
                  />
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
    return rows;
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
    </div>
  );
};

PredictedCollegesTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      "Institute ID": PropTypes.string,
      Institute: PropTypes.string.isRequired,
      Course: PropTypes.string,
      Category: PropTypes.string.isRequired,
      "Cutoff Marks": PropTypes.string,
      State: PropTypes.string,
      "Academic Program Name": PropTypes.string,
      "Closing Rank": PropTypes.string,
      Quota: PropTypes.string,
    })
  ),
  exam: PropTypes.string.isRequired,
  onCollegeSelect: PropTypes.func,
};

export default PredictedCollegesTable;

import React from "react";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";

const PredictedCollegesTable = ({ data = [], exam = "" }) => {
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
      { key: "closing_rank", label: "General Cutoff" },
      { key: "obc_rank", label: "OBC Cutoff" },
      { key: "sc_rank", label: "SC Cutoff" },
      { key: "st_rank", label: "ST Cutoff" },
      { key: "ews_rank", label: "EWS Cutoff" },
      { key: "quota", label: "Category" },
    ],
    DEFAULT: [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Academic Program Name" },
      { key: "closing_rank", label: "General Rank" },
      { key: "obc_rank", label: "OBC Rank" },
      { key: "sc_rank", label: "SC Rank" },
      { key: "st_rank", label: "ST Rank" },
      { key: "ews_rank", label: "EWS Rank" },
      { key: "quota", label: "Quota" },
    ],
  };

  const predicted_colleges_table_column =
    examColumnMapping[exam] || examColumnMapping.DEFAULT;

  const transformData = (item) => {
    if (exam === "TNEA") {
      return {
        institute_id: item["College ID"] || item["Institute ID"],
        institute: item["College"] || item["Institute"],
        academic_program_name: item["Branch"] || item["Course"],
        closing_rank: item["General/OC"] || item["General Cutoff"] || item["Cutoff Marks"],
        obc_rank: item["OBC"] || item["BC"] || item["BCM"] || item["MBC"] || "N/A",
        sc_rank: item["SC"] || item["SCA"] || "N/A",
        st_rank: item["ST"] || "N/A",
        ews_rank: item["EWS"] || "N/A",
        quota: item["Category"],
      };
    }
    return {
      institute: item["Institute"],
      state: item["State"],
      academic_program_name: item["Academic Program Name"],
      closing_rank: item["Closing Rank"],
      obc_rank: item["OBC-NCL Rank"] || item["OBC Rank"] || "N/A",
      sc_rank: item["SC Rank"] || "N/A",
      st_rank: item["ST Rank"] || "N/A",
      ews_rank: item["EWS Rank"] || "N/A",
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
    </tr>
  );

  const renderTableBody = () =>
    data.map((item, index) => {
      const transformedItem = transformData(item);
      return (
        <tr
          key={index}
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
          <td className="p-2 border-r border-gray-300">
            {transformedItem.closing_rank}
          </td>
          <td className="p-2 border-r border-gray-300">
            {transformedItem.obc_rank}
          </td>
          <td className="p-2 border-r border-gray-300">
            {transformedItem.sc_rank}
          </td>
          <td className="p-2 border-r border-gray-300">
            {transformedItem.st_rank}
          </td>
          <td className="p-2 border-r border-gray-300">
            {transformedItem.ews_rank}
          </td>
          <td className="p-2">{transformedItem.quota}</td>
        </tr>
      );
    });

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
      "Institute ID": PropTypes.string, // For TNEA
      Institute: PropTypes.string.isRequired,
      Course: PropTypes.string, // TNEA-specific
      Category: PropTypes.string.isRequired,
      "Cutoff Marks": PropTypes.string, // TNEA-specific
      State: PropTypes.string,
      "Academic Program Name": PropTypes.string,
      "Closing Rank": PropTypes.string,
      Quota: PropTypes.string,
    })
  ),
  exam: PropTypes.string.isRequired,
};

export default PredictedCollegesTable;

import React from "react";
import PropTypes from "prop-types";
import ResponsiveTable from "./ResponsiveTable";
import examConfigs from "../examConfig";

const PredictedCollegesTable = ({ data = [], exam = "" }) => {
  const commonTableClass =
    "w-full mx-auto border-collapse text-sm sm:text-base";
  
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
      { key: "quota", label: "Quota" },
    ],
  };

  const predicted_colleges_table_column =
    examColumnMapping[exam] || examColumnMapping.DEFAULT;

  const transformData = (item) => {
    if (exam === "TNEA") {
      return {
        institute_id: item["Institute ID"] || "N/A",
        institute: item["Institute"] || "",
        academic_program_name: item["Course"] || "",
        closing_rank: item["Cutoff Marks"] || "",
        quota: item["Category"] || "",
      };
    }
    return {
      state: item["State"] || "N/A",
      institute: item["Institute"] || "",
      academic_program_name: item["Academic Program Name"] || "",
      closing_rank: item["Closing Rank"] || "",
      quota: item["Category"] || item["Quota"] || "",
    };
  };

  // Transform all data items
  const transformedData = data.map(transformData);

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
    <div className="w-full mx-auto overflow-hidden">
      {renderLegend()}
      <ResponsiveTable 
        columns={predicted_colleges_table_column}
        data={transformedData}
        className={`${commonTableClass} border border-gray-300`}
      />
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

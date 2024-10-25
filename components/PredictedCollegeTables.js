import React from "react";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";

const PredictedCollegesTable = ({ data = [], exam = "" }) => {
  const tableClasses = "w-full border-collapse text-sm sm:text-base";
  const headerClasses = "bg-gray-200 font-bold text-center p-2 text-xs sm:text-sm md:text-base";
  const cellClasses = "p-2 border border-gray-300 text-center text-xs sm:text-sm md:text-base";

  const examConfig = examConfigs?.[exam];

  const tableHeaders = [
    { key: "state", label: "State" },
    { key: "institute", label: "Institute" },
    { key: "academic_program_name", label: "Academic Program Name" },
    { key: "closing_rank", label: "Closing Rank" },
    { key: "quota", label: "Quota" },
  ];

  const renderTableHeader = () => (
    <tr className={headerClasses}>
      {tableHeaders.map(({ key, label }) => (
        <th key={key} className="p-2 border-r border-gray-300">
          {label}
        </th>
      ))}
    </tr>
  );

  const renderTableBody = () => (
    data.map((item, index) => (
      <tr
        key={index}
        className={`${cellClasses} ${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}
      >
        <td className="p-2 border-r border-gray-300">{item?.State}</td>
        <td className="p-2 border-r border-gray-300">{item?.Institute}</td>
        <td className="p-2 border-r border-gray-300">{item?.["Academic Program Name"]}</td>
        <td className="p-2 border-r border-gray-300">{item?.["Closing Rank"]}</td>
        <td className="p-2">{item?.Quota}</td>
      </tr>
    ))
  );

  const renderLegend = () => {
    if (!examConfig?.legend) return null;

    return (
      <div className="w-full text-center mb-4">
        {examConfig.legend.map(({ key, value }, index) => (
          <p key={index} className="leading-4 mb-1">
            {key}: {value}
          </p>
        ))}
      </div>
    );
  };

  if (!examConfig) {
    return <div>No configuration found for the selected exam.</div>;
  }

  return (
    <div className="w-full">
      {renderLegend()}
      <div className="overflow-x-auto">
        <table className={`${tableClasses} border border-gray-300`}>
          <thead>{renderTableHeader()}</thead>
          <tbody>{renderTableBody()}</tbody>
        </table>
      </div>
    </div>
  );
};

PredictedCollegesTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      "College Rank": PropTypes.number.isRequired,
      "State": PropTypes.string.isRequired,
      "Institute": PropTypes.string.isRequired,
      "Academic Program Name": PropTypes.string.isRequired,
      "Opening Rank": PropTypes.number.isRequired,
      "Closing Rank": PropTypes.number.isRequired,
      "Quota": PropTypes.string.isRequired,
    })
  ),
  exam: PropTypes.string.isRequired,
};

export default PredictedCollegesTable;

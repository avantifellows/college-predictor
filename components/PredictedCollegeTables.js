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

  const examConfig = examConfigs[exam];

  const renderTableHeader = () => {
    const columns = [
      { key: "State", label: "State" },
      { key: "Institute", label: "Institute" },
      { key: "Academic Program Name", label: "Academic Program Name" },
      { key: "Closing Rank", label: "Closing Rank" },
      { key: "Quota", label: "Quota" },
    ];

    return (
      <tr className={commonHeaderClass}>
        {columns.map((column) => (
          <th key={column.key} className="p-2 border-r border-gray-300">
            {column.label}
          </th>
        ))}
      </tr>
    );
  };

  const renderTableBody = () => {
    return data.map((item, index) => (
      <tr
        key={index}
        className={`${commonCellClass} ${
          index % 2 === 0 ? "bg-gray-100" : "bg-white"
        }`}
      >
        <td className="p-2 border-r border-gray-300">{item["State"]}</td>
        <td className="p-2 border-r border-gray-300">{item["Institute"]}</td>
        <td className="p-2 border-r border-gray-300">
          {item["Academic Program Name"]}
        </td>
        <td className="p-2 border-r border-gray-300">{item["Closing Rank"]}</td>
        <td className="p-2">{item["Quota"]}</td>
      </tr>
    ));
  };

  const renderLegend = () => {
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

  if (!examConfig) {
    return <div>No configuration found for the selected exam.</div>;
  }

  return (
    <div className="w-full mx-auto overflow-x-auto">
<<<<<<< Updated upstream
      {exam === "MHT CET" || exam === "KCET" || (exam === "JEE Main" && counselling === "JAC") ? (
        <table className={`${commonTableClass} border border-gray-300`}>
          <thead>
            <tr className={commonHeaderClass}>
              <th className="p-2 border-r border-gray-300">Institute</th>
              <th className="p-2 border-r border-gray-300">Academic Program Name</th>
              <th className="p-2 border-r border-gray-300">Closing Rank</th>
              <th className="p-2">Category</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={index}
                className={`${commonCellClass} ${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}
              >
                <td className="p-2 border-r border-gray-300">{item.Institute}</td>
                <td className="p-2 border-r border-gray-300">{item["Course"]}</td>
                <td className="p-2 border-r border-gray-300">{item["Closing Rank"]}</td>
                <td className="p-2">{item["Category_Key"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="w-full">
          <div className="flex flex-col items-center text-sm sm:text-base mb-4">
            <p className="leading-4 mb-1">AI: All India</p>
            <p className="leading-4 mb-1">HS: Home State</p>
            <p className="leading-4 mb-1">OS: Out of State</p>
          </div>
          <table className={`${commonTableClass} border border-gray-300`}>
            <thead>
              <tr className={commonHeaderClass}>
                <th className="p-2 border-r border-gray-300">Institute Rank</th>
                <th className="p-2 border-r border-gray-300">State</th>
                <th className="p-2 border-r border-gray-300">Institute</th>
                <th className="p-2 border-r border-gray-300">Academic Program Name</th>
                <th className="p-2 border-r border-gray-300">Opening Rank</th>
                <th className="p-2 border-r border-gray-300">Closing Rank</th>
                <th className="p-2">Quota</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr
                  key={index}
                  className={`${commonCellClass} ${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}
                >
                  <td className="p-2 border-r border-gray-300">{item["College Rank"]}</td>
                  <td className="p-2 border-r border-gray-300">{item["State"]}</td>
                  <td className="p-2 border-r border-gray-300">{item.Institute}</td>
                  <td className="p-2 border-r border-gray-300">{item["Academic Program Name"]}</td>
                  <td className="p-2 border-r border-gray-300">{item["Opening Rank"]}</td>
                  <td className="p-2 border-r border-gray-300">{item["Closing Rank"]}</td>
                  <td className="p-2">{item["Quota"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
=======
      {renderLegend()}
      <table className={`${commonTableClass} border border-gray-300`}>
        <thead>{renderTableHeader()}</thead>
        <tbody>{renderTableBody()}</tbody>
      </table>
>>>>>>> Stashed changes
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

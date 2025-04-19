import React from "react";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";

const PredictedCollegesTable = ({ data = [], exam = "" }) => {
  const tableClass = "w-full mx-auto border-collapse text-sm sm:text-base";
  const headerClass =
    "bg-gray-200 font-bold text-center text-xs sm:text-sm md:text-base";
  const cellClass = "p-2 border border-gray-300 text-center text-xs sm:text-sm md:text-base";

  // Base columns per exam
  const baseColumns = {
    TNEA: [
      { key: "institute_id", label: "Institute ID" },
      { key: "institute",    label: "Institute"     },
      { key: "academic_program_name", label: "Course" },
      { key: "closing_rank",  label: "Cutoff Marks"  },
      { key: "quota",         label: "Category"      },
    ],
    DEFAULT: [
      { key: "state",        label: "State"                   },
      { key: "institute",    label: "Institute"               },
      { key: "academic_program_name", label: "Academic Program Name" },
      { key: "closing_rank", label: "Closing Rank"            },
      { key: "quota",        label: "Quota"                   },
    ],
  };

  // Pick the right base, then append NIRF column
  const columns = [
    ...(baseColumns[exam] || baseColumns.DEFAULT),
    { key: "nirf_rank", label: "NIRF Rank" },
  ];

  // Normalize each row to the keys above
  const transformData = (item) => ({
    // TNEA-specific
    institute_id: item["Institute ID"] || item["institute_id"],
    institute:   item["Institute"]    || item["institute"],
    academic_program_name:
      exam === "TNEA" ? item["Course"] : item["Academic Program Name"] || item["academic_program_name"],
    closing_rank:
      exam === "TNEA" ? item["Cutoff Marks"] : item["Closing Rank"]  || item["closing_rank"],
    quota: item["Category"] || item["quota"],
    state: item["State"] || item["state"],
    // our new field
    nirf_rank: item["nirf_rank"] != null ? item["nirf_rank"] : null,
  });

  const renderLegend = () => {
    const examConfig = examConfigs[exam];
    if (!examConfig?.legend) return null;
    return (
      <div className="flex flex-col items-center text-sm sm:text-base mb-4">
        {examConfig.legend.map((lg, i) => (
          <p key={i} className="leading-4 mb-1">
            {lg.key}: {lg.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full mx-auto overflow-x-auto">
      {renderLegend()}
      <table className={`${tableClass} border border-gray-300`}>
        <thead>
          <tr className={headerClass}>
            {columns.map((col) => (
              <th key={col.key} className="p-2 border-r border-gray-300">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((raw, idx) => {
            const row = transformData(raw);
            return (
              <tr
                key={idx}
                className={`${cellClass} ${
                  idx % 2 === 0 ? "bg-gray-100" : "bg-white"
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="p-2 border-r border-gray-300">
                    {/* show number or blank */}
                    {row[col.key] != null ? row[col.key] : ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

PredictedCollegesTable.propTypes = {
  exam: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      "Institute ID": PropTypes.string,
      Institute: PropTypes.string,
      Course: PropTypes.string,
      "Cutoff Marks": PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      Category: PropTypes.string,
      State: PropTypes.string,
      "Academic Program Name": PropTypes.string,
      "Closing Rank": PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      Quota: PropTypes.string,
      // new field coming from your JSON
      nirf_rank: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
};

export default PredictedCollegesTable;

import React from "react";

const TableHeader = ({ headers }) => (
  <thead>
    <tr className="bg-gray-200 font-bold text-center text-xs sm:text-sm md:text-base">
      {headers.map((header, index) => (
        <th
          key={index}
          className="p-2 border-r border-gray-300 last:border-r-0"
        >
          {header}
        </th>
      ))}
    </tr>
  </thead>
);

const TableCell = ({ children, className = "" }) => (
  <td className={`p-2 border-r border-gray-300 last:border-r-0 ${className}`}>
    {children}
  </td>
);

const ExpandedRow = ({ item, expandedFields }) => (
  <tr>
    <td colSpan="4" className="p-4 border border-gray-300">
      <div className="text-left text-sm sm:text-base">
        {expandedFields.map((field, index) => (
          <div key={index} className="mb-2">
            <b>{field.label}:</b>{" "}
            {["Doc Required", "Benefits"].includes(field.key) ? (
              <ul className="list-disc list-inside ml-4">
                {item[field.key]?.split("\n").map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <span>{item[field.key]}</span>
            )}
          </div>
        ))}
      </div>
    </td>
  </tr>
);

const ScholarshipTable = ({
  filteredData,
  toggleRowExpansion,
  expandedRows,
}) => {
  const headers = ["Scholarship Name", "Status", "Application Link"];
  const mainFields = ["Scholarship Name", "Status"];
  const expandedFields = [
    { key: "Eligibility", label: "Eligibility" },
    { key: "Benefits", label: "Benefits" },
    { key: "Doc Required", label: "Documents Required" },
    { key: "Scholarship Amount", label: "Scholarship Amount" },
    { key: "Last Date", label: "Last Date" },
    { key: "Special Criteria", label: "Special Criteria" },
  ];

  return (
    <div className="w-full mx-auto overflow-x-auto">
      <table className="w-full mx-auto border-collapse text-sm sm:text-base border border-gray-300">
        <TableHeader headers={headers} />
        <tbody>
          {filteredData?.length === 0 && (
            <tr>
              <td colSpan="4" className="p-4 text-center text-gray-700">
                No scholarships found. Please try again with different filters.
              </td>
            </tr>
          )}
          {filteredData?.map((item, index) => (
            <React.Fragment key={index}>
              <tr
                className={`${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}
                onClick={() => toggleRowExpansion(index)}
              >
                {mainFields.map((field, fieldIndex) => (
                  <TableCell key={fieldIndex}>{item[field]}</TableCell>
                ))}
                <TableCell>
                  <a
                    href={item["Pre-filled Form Link"]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#B52326] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Apply
                  </a>
                </TableCell>
              </tr>
              {expandedRows[index] && (
                <ExpandedRow item={item} expandedFields={expandedFields} />
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScholarshipTable;

import React from "react";

const ScholarshipTable = ({
  filteredData,
  toggleRowExpansion,
  expandedRows,
}) => {
  return (
    <div className="max-w-full mx-auto">
      <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden">
        <thead className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Scholarship Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Gender
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Application Link
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredData.map((item, index) => (
            <React.Fragment key={index}>
              <tr
                onClick={() => toggleRowExpansion(index)}
                className={`${
                  index % 2 === 0 ? "bg-gray-100" : "bg-white"
                } hover:bg-gray-200 cursor-pointer`}
              >
                <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">
                  {item["Scholarship Name"]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.Status}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.Gender}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.Category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a
                    href={item["Application Link"]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#B52326] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Apply
                  </a>
                </td>
              </tr>
              {expandedRows[index] && (
                <tr className={index % 2 === 0 ? "bg-gray-100" : "bg-white"}>
                  <td colSpan="5" className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      <p>
                        <b>Eligibility</b>: {item.Eligibility}
                      </p>
                      <p>
                        <b>Benefits</b>: {item.Benefits}
                      </p>
                      <p>
                        <b>Doc Required</b>: {item["Doc Required"]}
                      </p>
                      <p>
                        <b>Can Class 11 Apply</b>: {item["Class 11 can Apply"]}
                      </p>
                      <p>
                        <b>Can Class 12 Apply</b>: {item["Class 12 can Apply"]}
                      </p>
                      <p>
                        <b>Family Income (in LPA)</b>:{" "}
                        {item["Family Income (in LPA)"]}
                      </p>
                      <p>
                        <b>Last Date</b>: {item["Last Date"]}
                      </p>
                      <p>
                        <b>Open for Stream</b>: {item["Open for Stream"]}
                      </p>
                      <p>
                        <b>Special Criteria</b>: {item["Special Criteria"]}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScholarshipTable;
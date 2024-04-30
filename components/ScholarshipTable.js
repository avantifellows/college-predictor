import React from "react";

const TableHeader = ({ label }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
    {label}
  </th>
);

const TableCell = ({ content, isLink = false }) => (
  <td className={`px-6 py-4 whitespace-normal text-sm ${isLink ? 'text-red-600' : 'text-gray-500'}`}>
    {isLink ? (
      <a
        href={content}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        Apply
      </a>
    ) : (
      content
    )}
  </td>
);


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
            <TableHeader label="Scholarship Name" />
            <TableHeader label="Status" />
            <TableHeader label="Gender" />
            <TableHeader label="Category" />
            <TableHeader label="Application Link" />
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
               <TableCell content={item["Scholarship Name"]} />
                <TableCell content={item.Status} />
                <TableCell content={item.Gender} />
                <TableCell content={item.Category} />
                <TableCell content={item["Application Link"]} isLink />
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

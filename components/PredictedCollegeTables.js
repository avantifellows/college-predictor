const TableCell = ({ content }) => (
  <td className="px-2 py-2 whitespace-normal text-xs text-gray-500 sm:px-6 sm:py-4 sm:text-sm">
    {content}
  </td>
);

const TableHeader = ({ label, width }) => (
  <th
    scope="col"
    className={`px-2 py-2 text-left text-xs font-medium text-white uppercase tracking-wider ${width} sm:px-6 sm:py-3 sm:text-xs`}
  >
    {label}
  </th>
);

const PredictedCollegesTable = ({ data = [] }) => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex flex-col items-center mb-2 sm:mb-6">
        <p className="text-xs font-semibold text-gray-600 mb-1">
          AI: All India
        </p>
        <p className="text-xs font-semibold text-gray-600 mb-1">
          HS: Home State
        </p>
        <p className="text-xs font-semibold text-gray-600">OS: Out of State</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500">
            <tr>
              <TableHeader label="Institute Rank" />
              <TableHeader label="State" />
              <TableHeader label="Institute" width="w-1/4" />
              <TableHeader label="Academic Program Name" width="w-1/3" />
              <TableHeader label="Opening Rank" />
              <TableHeader label="Closing Rank" />
              <TableHeader label="Quota" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-gray-100" : "bg-white"}
              >
                <TableCell content={item["College Rank"]} />
                <TableCell content={item["State"]} />
                <TableCell content={item.Institute} />
                <TableCell content={item["Academic Program Name"]} />
                <TableCell content={item["Opening Rank"]} />
                <TableCell content={item["Closing Rank"]} />
                <TableCell content={item["Quota"]} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PredictedCollegesTable;
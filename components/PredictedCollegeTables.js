const PredictedCollegesTable = ({ data = [] }) => {
  return (
    <div className="max-w-full mx-auto">
    <div className="flex flex-col items-center mb-6">
      <p className="text-sm font-semibold text-gray-600 mb-1">AI: All India</p>
      <p className="text-sm font-semibold text-gray-600 mb-1">HS: Home State</p>
      <p className="text-sm font-semibold text-gray-600">OS: Out of State</p>
    </div>
    <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden">
        <thead className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Institute Rank
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              State
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Institute
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Academic Program Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Opening Rank
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Closing Rank
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              Quota
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              className={`border-b border-gray-300 text-center ${
                index % 2 === 0 ? "bg-gray-200" : "bg-gray-300"
              }`}
            >
              <td className="py-5">{item["College Rank"]}</td>
              <td className="py-5">{item["State"]}</td>
              <td className="py-5">{item.Institute}</td>
              <td className="py-5">{item["Academic Program Name"]}</td>
              <td className="py-5">{item["Opening Rank"]}</td>
              <td className="py-5">{item["Closing Rank"]}</td>
              <td className="py-5">{item["Quota"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PredictedCollegesTable;

const PredictedCollegesTable = ({ data = [] }) => {
  return (
    <div className="max-w-full mx-auto">
    <div className="flex flex-col items-center mb-6">
      <p className="text-sm font-semibold text-gray-600 mb-1">AI: All India</p>
      <p className="text-sm font-semibold text-gray-600 mb-1">HS: Home State</p>
      <p className="text-sm font-semibold text-gray-600">OS: Out of State</p>
    </div>
      <table className="w-full mx-auto border-collapse">
        <thead>
          <tr className="bg-gray-400 font-bold p-3 text-center">
            <th>Institute Rank</th>
            <th>State</th>
            <th>Institute</th>
            <th>Academic Program Name</th>
            <th>Opening Rank</th>
            <th>Closing Rank</th>
            <th>Quota</th>
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

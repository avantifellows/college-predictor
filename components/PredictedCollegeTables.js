const PredictedCollegesTable = ({ data = [], exam = "" }) => {
  if (exam == "MHT CET") {
    return (
      <div>
        <table className="w-full mx-auto border-collapse text-sm sm:text-base">
          <thead>
            <tr className="bg-gray-400 font-bold p-2 text-center">
              <th className="p-2">Institute</th>
              <th className="p-2">Academic Program Name</th>
              <th className="p-2">Closing Rank</th>
              <th className="p-2">Category</th>
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
                <td className="p-2">{item.Institute}</td>
                <td className="p-2">{item["Course"]}</td>
                <td className="p-2">{item["Closing Rank"]}</td>
                <td className="p-2">{item["Category_Key"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    return (
      <div>
        <div className="flex flex-col items-center text-sm sm:text-base">
          <p className="leading-4 mb-1">AI: All India</p>
          <p className="leading-4 mb-1">HS: Home State</p>
          <p className="leading-4 mb-1">OS: Out of State</p>
        </div>
        <table className="w-full mx-auto border-collapse text-sm sm:text-base">
          <thead>
            <tr className="bg-gray-400 font-bold p-2 text-center">
              <th className="p-2">Institute Rank</th>
              <th className="p-2">State</th>
              <th className="p-2">Institute</th>
              <th className="p-2">Academic Program Name</th>
              <th className="p-2">Opening Rank</th>
              <th className="p-2">Closing Rank</th>
              <th className="p-2">Quota</th>
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
                <td className="p-2">{item["College Rank"]}</td>
                <td className="p-2">{item["State"]}</td>
                <td className="p-2">{item.Institute}</td>
                <td className="p-2">{item["Academic Program Name"]}</td>
                <td className="p-2">{item["Opening Rank"]}</td>
                <td className="p-2">{item["Closing Rank"]}</td>
                <td className="p-2">{item["Quota"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
};

export default PredictedCollegesTable;

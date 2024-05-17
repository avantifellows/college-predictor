const PredictedCollegesTable = ({ data = [] }) => {
  return (
    <div className="mx-4">
      <div className="flex gap-4 text-[1.1rem] items-center bg-yellow-400 px-2">
        <p className="font-semibold">*Important notations:</p>
        <p>AI: All India</p>
        <p>HS: Home State</p>
        <p>OS: Out of State</p>
      </div>
      <table className="w-full mx-auto border-collapse">
        <thead>
          <tr className=" font-bold text-center text-[1.3rem]" style={{ backgroundImage: 'linear-gradient(to right, #b52326, #cc5e18, #d79111, #d6c42f, #c9f664)' }}>
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
              className={`border-b border-gray-300 text-center text-[1.2rem] ${
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

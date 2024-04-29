import React, { useState } from "react";

const PredictedCollegesTable = ({ data = [] }) => {
  const [filteredData, setFilteredData] = useState(data);
  const [filters, setFilters] = useState({
    state: "",
    institute: "",
    quota: ""
  });

  // Create sets for unique filter values
  const uniqueStates = new Set(data.map((item) => item.State));
  const uniqueInstitutes = new Set(data.map((item) => item.Institute));
  const uniqueQuotas = new Set(data.map((item) => item.Quota));

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value
    }));
  };

  // Apply filters when any filter criteria changes
  React.useEffect(() => {
    let filteredResult = [...data];

    if (filters.state) {
      filteredResult = filteredResult.filter(
        (item) => item.State === filters.state
      );
    }

    if (filters.institute) {
      filteredResult = filteredResult.filter(
        (item) => item.Institute === filters.institute
      );
    }

    if (filters.quota) {
      filteredResult = filteredResult.filter(
        (item) => item.Quota === filters.quota
      );
    }

    setFilteredData(filteredResult);
  }, [filters, data]);

  return (
    <div className="max-w-full overflow-x-auto">
      <div className="flex flex-col md:flex-row md:space-x-4 mb-4">
        {/* State Filter */}
        <div className="flex-1">
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State
          </label>
          <select
            id="state"
            name="state"
            value={filters.state}
            onChange={handleFilterChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">All States</option>
            {[...uniqueStates].map((state, index) => (
              <option key={index} value={state}>{state}</option>
            ))}
          </select>
        </div>
        {/* Institute Filter */}
        <div className="flex-1">
          <label htmlFor="institute" className="block text-sm font-medium text-gray-700">
            Institute
          </label>
          <select
            id="institute"
            name="institute"
            value={filters.institute}
            onChange={handleFilterChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">All Institutes</option>
            {[...uniqueInstitutes].map((institute, index) => (
              <option key={index} value={institute}>{institute}</option>
            ))}
          </select>
        </div>
        {/* Quota Filter */}
        <div className="flex-1">
          <label htmlFor="quota" className="block text-sm font-medium text-gray-700">
            Quota
          </label>
          <select
            id="quota"
            name="quota"
            value={filters.quota}
            onChange={handleFilterChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">All Quotas</option>
            {[...uniqueQuotas].map((quota, index) => (
              <option key={index} value={quota}>{quota}</option>
            ))}
          </select>
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200 font-bold text-center">
            <th className="px-4 py-3">Institute Rank</th>
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3">Institute</th>
            <th className="px-4 py-3">Academic Program Name</th>
            <th className="px-4 py-3">Opening Rank</th>
            <th className="px-4 py-3">Closing Rank</th>
            <th className="px-4 py-3">Quota</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item, index) => (
            <tr
              key={index}
              className={`text-center ${
                index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"
              }`}
            >
              <td className="px-4 py-3">{item["College Rank"]}</td>
              <td className="px-4 py-3">{item["State"]}</td>
              <td className="px-4 py-3">{item.Institute}</td>
              <td className="px-4 py-3">{item["Academic Program Name"]}</td>
              <td className="px-4 py-3">{item["Opening Rank"]}</td>
              <td className="px-4 py-3">{item["Closing Rank"]}</td>
              <td className="px-4 py-3">{item["Quota"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PredictedCollegesTable;

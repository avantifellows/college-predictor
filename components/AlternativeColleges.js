import React from 'react';
import PropTypes from 'prop-types';

const AlternativeColleges = ({ targetCollege, alternatives }) => {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold mb-2">
        Similar Colleges to {targetCollege}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-1 border border-gray-300">College</th>
              <th className="p-1 border border-gray-300">Course</th>
              <th className="p-1 border border-gray-300">Type</th>
              <th className="p-1 border border-gray-300">Location</th>
              <th className="p-1 border border-gray-300">Closing Rank</th>
              <th className="p-1 border border-gray-300">Similarity</th>
            </tr>
          </thead>
          <tbody>
            {alternatives.map((college, index) => (
              <tr
                key={index}
                className={`${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-blue-50`}
              >
                <td className="p-1 border border-gray-300">{college.institute}</td>
                <td className="p-1 border border-gray-300">{college.course}</td>
                <td className="p-1 border border-gray-300">{college.type}</td>
                <td className="p-1 border border-gray-300">{college.location}</td>
                <td className="p-1 border border-gray-300">{college.closingRank}</td>
                <td className="p-1 border border-gray-300">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${college.similarityScore}%` }}
                      ></div>
                    </div>
                    <span className="text-xs">{college.similarityScore}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

AlternativeColleges.propTypes = {
  targetCollege: PropTypes.string.isRequired,
  alternatives: PropTypes.arrayOf(
    PropTypes.shape({
      institute: PropTypes.string.isRequired,
      course: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      location: PropTypes.string.isRequired,
      closingRank: PropTypes.string.isRequired,
      similarityScore: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default AlternativeColleges; 
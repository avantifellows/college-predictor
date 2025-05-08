import React, { useState } from 'react';
import PropTypes from 'prop-types';

const ResponsiveTable = ({ columns, data, className }) => {
  const [expandedRow, setExpandedRow] = useState(null);

  // For larger screens - traditional table
  const renderDesktopTable = () => (
    <table className={`hidden md:table w-full border-collapse ${className}`}>
      <thead>
        <tr className="bg-gray-200">
          {columns.map(column => (
            <th key={column.key} className="p-2 border border-gray-300 font-bold text-center">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex} className="hover:bg-gray-50">
            {columns.map(column => (
              <td key={column.key} className="p-2 border border-gray-300 text-center">
                {row[column.key] || '-'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // For mobile screens - card-based layout
  const renderMobileCards = () => (
    <div className="md:hidden space-y-4">
      {data.map((row, rowIndex) => (
        <div 
          key={rowIndex} 
          className="border rounded-lg shadow-sm bg-white overflow-hidden"
        >
          <div 
            className="bg-gray-100 p-3 font-medium cursor-pointer flex justify-between items-center"
            onClick={() => setExpandedRow(expandedRow === rowIndex ? null : rowIndex)}
          >
            <div>
              {row[columns[0].key]} {/* Display the primary column (usually institute name) */}
              <span className="ml-2 text-sm text-gray-600">{row[columns[columns.length - 1].key]}</span> {/* Display quota/category */}
            </div>
            <svg 
              className={`w-5 h-5 transform transition-transform ${expandedRow === rowIndex ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {expandedRow === rowIndex && (
            <div className="p-3 space-y-2 text-sm">
              {columns.slice(1, -1).map(column => (
                <div key={column.key} className="flex justify-between">
                  <span className="font-medium text-gray-600">{column.label}:</span>
                  <span>{row[column.key] || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {renderDesktopTable()}
      {renderMobileCards()}
    </div>
  );
};

ResponsiveTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  className: PropTypes.string
};

export default ResponsiveTable;

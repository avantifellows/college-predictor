import React from "react";
import PropTypes from "prop-types";

const YearDropdown = ({ selectedYear, onYearChange }) => {
    const years = [2020, 2021, 2022, 2023, 2024]; // Example years

    return (
    <select
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
        className="border border-gray-300 rounded p-2"
    >
        <option value="">Select Year</option>
        {years.map((year) => (
            <option key={year} value={year}>
            {year}
            </option>
        ))}
    </select>
    );
};

YearDropdown.propTypes = {
    selectedYear: PropTypes.string.isRequired,
    onYearChange: PropTypes.func.isRequired,
};

export default YearDropdown;

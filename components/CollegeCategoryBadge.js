import PropTypes from "prop-types";

const styles = {
  Safe:     "bg-green-100 text-green-800 border border-green-300",
  Moderate: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  Dream:    "bg-red-100 text-red-800 border border-red-300",
  Unknown:  "bg-gray-100 text-gray-500 border border-gray-200",
};

const CollegeCategoryBadge = ({ category }) => {
  const cls = styles[category] ?? styles.Unknown;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {category ?? "Unknown"}
    </span>
  );
};

CollegeCategoryBadge.propTypes = {
  category: PropTypes.oneOf(["Safe", "Moderate", "Dream", "Unknown"]),
};

export default CollegeCategoryBadge;
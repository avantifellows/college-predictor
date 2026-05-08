import PropTypes from "prop-types";

const widths = ["w-11/12", "w-4/5", "w-2/3", "w-3/4", "w-1/2"];

const SkeletonBlock = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-md bg-[#f0e2dd] ${className}`}
    aria-hidden="true"
  />
);

const SkeletonLoader = ({
  variant = "table",
  rows = 6,
  columns = 5,
  className = "",
}) => {
  if (variant === "filters") {
    return (
      <div
        className={`grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 ${className}`}
        role="status"
        aria-label="Loading filters"
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-[#eaded8] bg-white px-4 py-3 shadow-sm"
          >
            <SkeletonBlock className="mb-3 h-4 w-2/5" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`overflow-x-auto rounded-xl border border-[#eaded8] bg-white shadow-sm transition-opacity duration-300 ${className}`}
      role="status"
      aria-label="Loading table data"
    >
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#f8efec]">
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-4 py-3">
                <SkeletonBlock className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={rowIndex}
              className={`border-b border-[#eaded8] ${
                rowIndex % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
              }`}
            >
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <td key={columnIndex} className="px-4 py-4">
                  <SkeletonBlock
                    className={`h-4 ${widths[(rowIndex + columnIndex) % widths.length]}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

SkeletonBlock.propTypes = {
  className: PropTypes.string,
};

SkeletonLoader.propTypes = {
  variant: PropTypes.oneOf(["table", "filters"]),
  rows: PropTypes.number,
  columns: PropTypes.number,
  className: PropTypes.string,
};

export default SkeletonLoader;

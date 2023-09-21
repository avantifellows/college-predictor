import React from "react";
import styles from "./scholarship_finder.module.css";

const ScholarshipTable = ({
  filteredData,
  toggleRowExpansion,
  expandedRows,
}) => {
  return (
    <table className={styles.table}>
      <thead>
        <tr className={styles.header_row}>
          <th>Scholarship Name</th>
          <th>Status</th>
          <th>Gender</th>
          <th>Category</th>
          <th>Application Link</th>
        </tr>
      </thead>
      <tbody>
        {filteredData.map((item, index) => (
          <React.Fragment key={index}>
            <tr
              onClick={() => toggleRowExpansion(index)}
              className={index % 2 === 0 ? styles.even_row : styles.odd_row}
            >
              <td className={styles.cell}>{item["Scholarship Name"]}</td>
              <td className={styles.cell}>{item.Status}</td>
              <td className={styles.cell}>{item.Gender}</td>
              <td className={styles.cell}>{item.Category}</td>
              <td className={styles.cell}>
                <a
                  href={item["Application Link"]}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item["Application Link"]}
                </a>
              </td>
            </tr>
            {expandedRows[index] && (
              <tr
                className={index % 2 === 0 ? styles.even_row : styles.odd_row}
              >
                <td colSpan="5">
                  <div>
                    <b>Eligibility</b>: {item.Eligibility} <br />
                    <b>Benefits</b>: {item.Benefits} <br />
                    <b>Doc Required</b>: {item["Doc Required"]} <br />
                    <b>Can Class 11 Apply</b>: {item["Class 11 can Apply"]}{" "}
                    <br />
                    <b>Can Class 12 Apply</b>: {item["Class 12 can Apply"]}{" "}
                    <br />
                    <b>Family Income (in LPA)</b>:{" "}
                    {item["Family Income (in LPA)"]} <br />
                    <b>Last Date</b>: {item["Last Date"]} <br />
                    <b>Open for Stream</b>: {item["Open for Stream"]} <br />
                    <b>Special Criteria</b>: {item["Special Criteria"]} <br />
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

export default ScholarshipTable;

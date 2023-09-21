import styles from "../styles/college_predictor.module.css";

const PredictedCollegesTable = ({ data = [] }) => {
  return (
    <div>
      <div>
        <p className={styles.paragraph}>AI: All India</p>
        <p className={styles.paragraph}>HS: Home State </p>
        <p className={styles.paragraph}>OS: Out of State</p>
      </div>
      <table className={styles.table}>
        <thead>
          <tr className={styles.header_row}>
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
              className={index % 2 === 0 ? styles.even_row : styles.odd_row}
            >
              <td className={styles.cell}>{item["College Rank"]}</td>
              <td className={styles.cell}>{item["State"]}</td>
              <td className={styles.cell}>{item.Institute}</td>
              <td className={styles.cell}>{item["Academic Program Name"]}</td>
              <td className={styles.cell}>{item["Opening Rank"]}</td>
              <td className={styles.cell}>{item["Closing Rank"]}</td>
              <td className={styles.cell}>{item["Quota"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PredictedCollegesTable;

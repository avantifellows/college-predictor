import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Info } from "lucide-react";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";

// Define fields for the expanded view
const expandedFields = {
  // TGEAPCET - Telangana Engineering, Agriculture and Pharmacy Common Entrance Test
  TGEAPCET: [
    { key: "inst_code", label: "Institute Code" },
    { key: "place", label: "Location" },
    { key: "year_of_establish", label: "Year Established" },
    { key: "branch_name", label: "Branch Name" },
    {
      key: "tuition_fee",
      label: "Tuition Fee (per year)",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
    { key: "affiliated_to", label: "Affiliated University" },
  ],
  // JoSAA / JEE Main / JEE Advanced
  JoSAA: [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    {
      key: "Expected Salary",
      label: "Expected Salary",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
  ],
  "JEE Main-JOSAA": [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    {
      key: "Expected Salary",
      label: "Expected Salary",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
  ],
  "JEE Main-JAC": [
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "Category", label: "Category" },
    { key: "Gender", label: "Gender" },
    { key: "Defense", label: "Defense Quota" },
    { key: "PWD", label: "PWD Status" },
    { key: "Category_Key", label: "Category Key" },
  ],
  "JEE Advanced": [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    {
      key: "Expected Salary",
      label: "Expected Salary",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
  ],
  // Default fallback
  DEFAULT: [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    {
      key: "Expected Salary",
      label: "Expected Salary",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
  ],
  // GUJCET - Gujarat Common Entrance Test
  GUJCET: [
    { key: "AISHE Code", label: "AISHE Code" },
    { key: "District", label: "District" },
    { key: "Course", label: "Course" },
    { key: "Type of College", label: "Type of College" },
    {
      key: "Median Salary",
      label: "Median Salary",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
    {
      key: "Avg Placement",
      label: "Average Placement %",
      format: (value) => (value ? `${value}%` : "N/A"),
    },
    { key: "Total Seats", label: "Total Seats" },
    {
      key: "Course Fees (per year)",
      label: "Course Fees (per year)",
      format: (value) =>
        value ? `₹${Number(value).toLocaleString("en-IN")}` : "N/A",
    },
  ],
  // KCET - Karnataka Common Entrance Test
  KCET: [
    { key: "Course Type", label: "Course Type" },
    { key: "State", label: "State" },
    { key: "Language", label: "Language" },
    { key: "Rural/Urban", label: "Region" },
    { key: "Closing Rank", label: "Closing Rank" },
  ],
  // TNEA - Tamil Nadu Engineering Admissions
  TNEA: [
    { key: "Institute ID", label: "Institute ID" },
    { key: "District", label: "District" },
    { key: "College Type", label: "College Type" },
    { key: "Cutoff Marks", label: "Cutoff Marks" },
  ],
  // MHT CET - Maharashtra Common Entrance Test
  "MHT CET": [
    { key: "Category", label: "Category" },
    { key: "Gender", label: "Gender" },
    { key: "Defense", label: "Defense Quota" },
    { key: "PWD", label: "PWD Status" },
    { key: "State", label: "State" },
    { key: "Category_Key", label: "Category Key" },
    { key: "Closing Rank", label: "Closing Rank" },
  ],
  // NEETUG - National Eligibility cum Entrance Test for Undergraduate
  // The "Show More" panel. Program / State / Address / Round live HERE rather than in the main
  // table: the user already picked program and state in the form, so as columns they just
  // repeated the user's own input and crowded out the columns that actually vary.
  NEETUG: [
    { key: "Academic Program Name", label: "Program" },
    { key: "State", label: "State" },
    { key: "Address", label: "Address" },
    // College Type (Govt/Private) is DISTINCT from Seat Type (which seat POOL this cutoff is
    // for) — a government seat can sit inside a private college (441 such Karnataka rows across
    // 77 colleges). Both shown on request from Karnataka medical students (2026-07-29).
    { key: "College Type", label: "College Type" },
    { key: "Seat Type", label: "Seat Type" },
    { key: "Gender", label: "Seat Gender" },
    { key: "Category", label: "Category" },
    { key: "Category Label", label: "Category (expanded)" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "Round", label: "Round" },
  ],
};


// College Type for rows whose source carries no per-row govt flag.
// We fill it ONLY where the SEAT TYPE settles it by definition — never by guessing from the college
// name. (Measured: fuzzy name-matching against the NMC/DCI roster is 87.5% accurate but every error
// is the dangerous direction — private shown as "Govt", e.g. "Jaipur Dental College" matched to
// "Govt. Dental College Jaipur". That is the exact error the Karnataka students reported.)
//
//   Deemed/Paid  -> Private. Deemed universities ARE private institutions, by definition; this is
//                   also the fee-based pool (Rs 20L+). Surya: "i think it should be private?" — yes.
//   NRI          -> Private. NRI quotas exist at private/deemed colleges.
//   ESI          -> Govt. Employees' State Insurance Corporation colleges are central-govt run.
//   DU / IP / Puducherry-domicile / AMU / Jamia -> Govt. All are central or state public
//                   universities (AMU and Jamia Millia Islamia are central universities).
//   "All India"  -> unknowable from the seat type: it spans 2,798 rows across both govt and private
//                   colleges. Left as "—" rather than guessed.
const neetCollegeTypeFromSeatType = (seatType) => {
  const s = String(seatType || "").toLowerCase();
  if (!s) return "—";
  if (/deemed|paid seats|non-resident indian|nri/.test(s)) return "Private";
  if (
    /employees state insurance|\besi\b|delhi university|ip university|puducherry ut domicile|aligarh muslim|amu|jamia/.test(
      s
    )
  ) {
    return "Govt";
  }
  return "—";
};

const SALARY_HELP_TEXT =
  "Product of median salary and placement percentage of the graduating batch as reported by the college to NIRF. Data is reported as a college level aggregate";

// New ExpandedRow component
const ExpandedRowComponent = ({ item, fields, exam, examColumnMapping }) => {
  const getFieldValue = (item, field) => {
    const { key, format } = field;
    if (key in item) {
      const value = item[key];
      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        return format ? format(value) : String(value);
      }
      return "N/A";
    }
    return "N/A";
  };

  // Get the appropriate fields based on the exam type
  const fieldsToShow = fields[exam] || fields.DEFAULT;
  const columns = examColumnMapping[exam] || examColumnMapping.DEFAULT;

  return (
    <tr>
      <td
        colSpan={columns.length + 1}
        className="border-b border-[#eaded8] bg-[#fffdfa] p-4"
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          {fieldsToShow.map((field, idx) => (
            <div key={idx}>
              <p>
                <strong>{field.label}:</strong> {getFieldValue(item, field)}
              </p>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
};

const ROWS_PER_PAGE_INITIAL = 30; // Variable for initial rows
const getJeeExamType = (item) => item?.Exam || item?.exam_type || "";
const countJeeExamTypes = (items) =>
  items.reduce(
    (counts, item) => {
      const examType = getJeeExamType(item);
      if (examType === "JEE Advanced") {
        counts.advanced += 1;
      } else if (examType === "JEE Main") {
        counts.main += 1;
      }
      return counts;
    },
    { main: 0, advanced: 0 }
  );

const PredictedCollegesTable = ({
  data = [],
  fullData = [],
  exam = "",
  searchTerm = "",
  onSearchChange = null,
}) => {
  const [expandedRows, setExpandedRows] = useState({});
  const [showAllRows, setShowAllRows] = useState(false); // State for showing all rows
  const [sortConfig, setSortConfig] = useState({
    key: "closing_rank",
    order: "asc",
  });
  const [salaryTooltip, setSalaryTooltip] = useState(null);
  const [josaaCollegeGroup, setJosaaCollegeGroup] = useState("main");
  // NEET: which seat pool the results tab is showing — home-state vs All India.
  const [neetSeatTab, setNeetSeatTab] = useState("home");

  const toggleRowExpansion = (rowKey) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  const getRowKey = (transformedItem) => {
    const parts = [
      transformedItem.institute,
      transformedItem.institute_name,
      transformedItem.academic_program_name,
      transformedItem.branch_name,
      transformedItem.category || transformedItem.Category,
      transformedItem.closing_rank,
    ];
    return parts.filter(Boolean).join("-");
  };

  const showSalaryTooltip = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSalaryTooltip({
      top: rect.bottom + 10,
      left: rect.right - 280,
    });
  };

  const hideSalaryTooltip = () => {
    setSalaryTooltip(null);
  };

  const commonTableClass = "w-full min-w-[720px] border-collapse text-sm";
  const commonHeaderClass =
    "bg-[#f8efec] text-[#5b1f20] font-semibold text-left text-xs sm:text-sm";
  const commonCellClass =
    "border-b border-[#eaded8] text-xs sm:text-sm text-[#332724]";

  const isJosaaExam =
    exam === "JoSAA" || exam === "JEE Main-JOSAA" || exam === "JEE Advanced";
  const isCombinedJosaaExam = exam === "JoSAA";
  const supportsExpandedView = !isJosaaExam;
  const supportsSalarySort = isJosaaExam;
  const salaryColumnKey = "expected_salary";
  const rankColumnKey = "closing_rank";
  const nirfRankColumnKey = "nirf_rank";

  const fullDataExamCounts = useMemo(
    () => countJeeExamTypes(fullData),
    [fullData]
  );
  const searchedDataExamCounts = useMemo(() => countJeeExamTypes(data), [data]);

  const showJosaaCollegeGroupToggle =
    isCombinedJosaaExam &&
    fullDataExamCounts.main > 0 &&
    fullDataExamCounts.advanced > 0;

  useEffect(() => {
    if (!isCombinedJosaaExam) {
      setJosaaCollegeGroup("main");
      return;
    }
    if (
      josaaCollegeGroup === "advanced" &&
      fullDataExamCounts.advanced === 0 &&
      fullDataExamCounts.main > 0
    ) {
      setJosaaCollegeGroup("main");
    }
    if (
      josaaCollegeGroup === "main" &&
      fullDataExamCounts.main === 0 &&
      fullDataExamCounts.advanced > 0
    ) {
      setJosaaCollegeGroup("advanced");
    }
  }, [exam, fullDataExamCounts, isCombinedJosaaExam, josaaCollegeGroup]);

  useEffect(() => {
    setShowAllRows(false);
  }, [josaaCollegeGroup, searchTerm]);

  const formatSalary = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return "N/A";
    return `₹${numericValue.toLocaleString("en-IN")}`;
  };

  const formatPercentage = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "N/A";
    return `${numericValue.toFixed(2)}%`;
  };

  useEffect(() => {
    if (!supportsSalarySort) return;
    setSortConfig({ key: rankColumnKey, order: "asc" });
  }, [exam, data, josaaCollegeGroup, supportsSalarySort, rankColumnKey]);

  const examColumnMapping = {
    TNEA: [
      { key: "institute_id", label: "Institute ID" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Course" },
      { key: "college_type", label: "Institute Type" },
      { key: "closing_rank", label: "Cutoff Marks" },
      { key: "quota", label: "Category" },
    ],
    JoSAA: [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "nirf_rank", label: "NIRF Rank" },
      {
        key: "expected_salary",
        label: "Expected Salary",
        format: formatSalary,
      },
      { key: "Seat Type", label: "Seat Type" },
    ],
    "JEE Main-JOSAA": [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "nirf_rank", label: "NIRF Rank" },
      {
        key: "expected_salary",
        label: "Expected Salary",
        format: formatSalary,
      },
      { key: "Seat Type", label: "Seat Type" },
    ],
    "JEE Main-JAC": [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "Category", label: "Category" },
    ],
    "JEE Advanced": [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "nirf_rank", label: "NIRF Rank" },
      {
        key: "expected_salary",
        label: "Expected Salary",
        format: formatSalary,
      },
      { key: "Seat Type", label: "Seat Type" },
    ],
    TGEAPCET: [
      { key: "institute_name", label: "Institute Name" },
      { key: "branch_name", label: "Academic Program" },
      { key: "closing_rank", label: "Closing Rank" },
    ],
    GUJCET: [
      { key: "College Name", label: "College Name" },
      { key: "District", label: "District" },
      { key: "Course", label: "Course" },
      {
        key: "closing_marks",
        label: "Cutoff Percentage",
        format: formatPercentage,
      },
    ],
    KCET: [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
    ],
    "MHT CET": [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "category", label: "Category" },
    ],
    // Columns are chosen for what VARIES between rows. `Program` and `State` were dropped:
    // the user has just picked both in the form, so every row repeated their own input and
    // pushed the informative columns off the side. Both remain in the expanded "Show More"
    // panel (ExpandedRowComponent renders every field), so nothing is lost.
    // `Gender` was added because it is the reason a college can appear twice: UP/CG/MH/TG/AP
    // publish a SEPARATE closing rank per seat gender (e.g. KGMU OBC: female 4,345 vs
    // gender-neutral 5,207). Without this column those read as meaningless duplicates.
    NEETUG: [
      { key: "institute", label: "Institute" },
      // State is included so the ALL INDIA QUOTA tab shows where each college is — AIQ spans the
      // whole country, so it is the most useful column there. On a home-state view every row is
      // the same state, so the adaptive filter below hides it automatically.
      { key: "state", label: "State" },
      // College Type (is the COLLEGE govt or private) vs Seat Type (which seat POOL this
      // cutoff is for). They genuinely differ — 441 Karnataka rows across 77 colleges are
      // GOVT-quota seats inside PRIVATE colleges — which is what the students asked to see.
      { key: "college_type", label: "College Type" },
      { key: "seat_type", label: "Seat Type" },
      { key: "category", label: "Category" },
      { key: "gender", label: "Seat Gender" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "round", label: "Round" },
    ],
    DEFAULT: [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
    ],
  };

  const predicted_colleges_table_column_all =
    examColumnMapping[exam] || examColumnMapping.DEFAULT;

  const transformData = (item) => {
    if (exam === "GUJCET") {
      return {
        ...item,
        institute: item["College Name"],
        academic_program_name: item["Course"],
        closing_rank: item["closing_marks"],
        state: item["District"],
      };
    }
    if (exam === "KCET") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
        category: item["Category"],
        "Course Type": item["Course Type"],
        "State": item["State"],
        "Language": item["Language"],
        "Rural/Urban": item["Rural/Urban"],
        "Category_Key": item["Category_Key"],
        "Closing Rank": item["Closing Rank"],
      };
    }
    if (exam === "TNEA") {
      return {
        ...item,
        institute_id: item["Institute ID"],
        institute: item["Institute"],
        academic_program_name: item["Course"],
        college_type: item["College Type"],
        closing_rank: item["Cutoff Marks"],
        quota: item["Category"],
        Category: item["Category"],
        "Institute ID": item["Institute ID"],
        "District": item["District"],
        "College Type": item["College Type"],
        "Cutoff Marks": item["Cutoff Marks"],
      };
    }
    // Handle JoSAA, JEE Main-JOSAA, and JEE Advanced (uses JEE data with full fields)
    if (
      exam === "JoSAA" ||
      exam === "JEE Main-JOSAA" ||
      exam === "JEE Advanced"
    ) {
      return {
        ...item,
        institute: item["Institute"],
        state: item["State"],
        academic_program_name: item["Academic Program Name"],
        exam_type: item["Exam"],
        nirf_rank: item["NIRF Rank"],
        closing_rank: item["Closing Rank"],
        expected_salary: item["Expected Salary"],
        "Seat Type": item["Seat Type"],
        "State": item["State"],
        "Quota": item["Quota"] || "AI",
        "Closing Rank": item["Closing Rank"],
        "Opening Rank": item["Opening Rank"],
        "College Type": item["College Type"],
        "Management Type": item["Management Type"],
        "Expected Salary": item["Expected Salary"],
        "Salary Tier": item["Salary Tier"],
        "NIRF Rank": item["NIRF Rank"],
        "Exam": item["Exam"],
        Category: item["Seat Type"] || item["Category"] || "",
      };
    }
    // Handle JEE Main-JAC (uses JAC data with different fields)
    if (exam === "JEE Main-JAC") {
      return {
        ...item,
        institute: item["Institute"],
        state: item["State"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
        "State": item["State"],
        "Closing Rank": item["Closing Rank"],
        "Category": item["Category"],
        "Gender": item["Gender"],
        "Defense": item["Defense"],
        "PWD": item["PWD"],
        "Category_Key": item["Category_Key"],
        Category: item["Category"] || "",
      };
    }
    if (exam === "NEETUG") {
      return {
        ...item,
        institute: item["Institute"] || "",
        state: item["State"] || "",
        seat_type: item["Seat Type"] || "",
        gender: item["Gender"] || "Gender-Neutral",
        // College Type is explicit only where the source carries a per-row govt flag (Karnataka,
        // Rajasthan, Haryana, Odisha). Ten other sources have no such field.
        // ★ WE DO NOT GUESS IT. Two inference attempts were measured against the 3,720 rows where
        //   the answer IS known:
        //     - from Seat Type: useless, because "State Quota" seats exist at BOTH govt and private
        //       colleges (Rajasthan: 217 govt / 134 private under that same label).
        //     - from the college NAME: 64% accurate with 153 FALSE POSITIVES — it labels private
        //       colleges "Govt" (e.g. "GMC, Alwar" is private in Rajasthan's data). Showing a
        //       private college as government is precisely the error the Karnataka students
        //       reported, so a wrong label is worse than none.
        //   Hence "—" where we genuinely do not know. Adding the flag upstream per state is the
        //   real fix; see docs/NEET_DATA_BUGS_BACKPROP.md.
        college_type: item["College Type"] || neetCollegeTypeFromSeatType(item["Seat Type"]),
        academic_program_name: item["Academic Program Name"] || "",
        closing_rank: item["Closing Rank"] || "",
        category: item["Category"] || "",
        round: item["Round"] || "",
        "State": item["State"],
        "Seat Type": item["Seat Type"],
        // Only Karnataka carries an explicit fee-derived College Type so far. For
        // every other source, infer it from the seat pool rather than render an
        // empty cell: AIQ/state-quota/govt pools sit in govt colleges, and the
        // Private/Management/NRI pools are private-college seats. "—" where we
        // genuinely cannot say.
        "College Type":
          item["College Type"] || neetCollegeTypeFromSeatType(item["Seat Type"]),
        "Gender": item["Gender"] || "Gender-Neutral",
        "Category": item["Category"],
        "Closing Rank": item["Closing Rank"],
      };
    }
    if (exam === "MHT CET") {
      return {
        ...item,
        institute: item["Institute"] || "",
        academic_program_name: item["Academic Program Name"] || "",
        closing_rank: item["Closing Rank"] || "",
        category: item["Category"] || "",
        "Category": item["Category"],
        "Gender": item["Gender"],
        "Defense": item["Defense"],
        "PWD": item["PWD"],
        "State": item["State"],
        "Category_Key": item["Category_Key"],
        "Closing Rank": item["Closing Rank"],
      };
    }
    if (exam === "TGEAPCET") {
      // Return all original item data plus formatted fields
      return {
        ...item,
        institute_name: item.institute_name || "N/A",
        branch_name: item.branch_name || "N/A",
        closing_rank: item.closing_rank || "N/A",
        // Keep all other fields for the expanded view
        place: item.place || "N/A",
        year_of_establish: item.year_of_establish
          ? Math.floor(Number(item.year_of_establish)).toString()
          : "N/A",
        tuition_fee: item.tuition_fee || "N/A",
        affiliated_to: item.affiliated_to || "N/A",
      };
    }
    return {
      institute: item["Institute"],
      state: item["State"],
      academic_program_name: item["Academic Program Name"],
      closing_rank: item["Closing Rank"],
      quota: item["Quota"] || item["Category"],
      Category: item["Category"] || "",
    };
  };

  const getSalaryValue = (item) => {
    const raw =
      item?.["Expected Salary"] ??
      item?.expected_salary ??
      item?.["Expected Salary as per NIRF"];
    const numericValue = Number(raw);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const getClosingRankValue = (item) => {
    const raw =
      item?.["Closing Rank"] ??
      item?.closing_rank ??
      item?.["Cutoff Marks"] ??
      item?.closing_marks;
    const numericValue = Number(raw);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const getNirfRankValue = (item) => {
    const raw = item?.["NIRF Rank"] ?? item?.nirf_rank;
    const numericValue = Number(raw);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const examFilteredData = useMemo(() => {
    if (!showJosaaCollegeGroupToggle) return data;

    const activeExam =
      josaaCollegeGroup === "advanced" ? "JEE Advanced" : "JEE Main";
    return data.filter((item) => getJeeExamType(item) === activeExam);
  }, [data, josaaCollegeGroup, showJosaaCollegeGroupToggle]);

  const sortedData = useMemo(() => {
    if (!supportsSalarySort) return examFilteredData;
    if (!examFilteredData.length) return examFilteredData;
    const { key, order } = sortConfig || {};
    const copy = [...examFilteredData];

    copy.sort((a, b) => {
      let aVal = null;
      let bVal = null;

      if (key === salaryColumnKey) {
        aVal = getSalaryValue(a);
        bVal = getSalaryValue(b);
      } else if (key === nirfRankColumnKey) {
        aVal = getNirfRankValue(a);
        bVal = getNirfRankValue(b);
      } else {
        aVal = getClosingRankValue(a);
        bVal = getClosingRankValue(b);
      }

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return order === "desc" ? bVal - aVal : aVal - bVal;
    });

    return copy;
  }, [examFilteredData, sortConfig, supportsSalarySort]);

  // NEET: home-state seats and All-India-Quota seats live on different rank
  // scales, so instead of one list (where AIQ's tighter ranks bury the home-state
  // seats) we split them into two TABS. neetSeatCounts drives the tab labels;
  // displayData is the active tab's rows (all rank-sorted).
  const isNeet = exam === "NEETUG";
  // A row belongs on the HOME-STATE tab when it comes from a state counselling
  // file (any seat type it carries: State Quota / Government / Management / NRI /
  // HP Quota / Institute Quota / ...). AIQ-sourced rows — including the domicile-
  // restricted MCC pools (Delhi University / IP University / ...) — belong on the
  // All-India tab. Keying on Source (not the literal "State Quota" label) keeps a
  // state's Government/Management/NRI seats on the home tab instead of leaking
  // them onto the All-India tab where they'd read as national-quota seats.
  const isHomeStateRow = (r) => !String(r["Source"] || "").startsWith("aiq");
  const neetSeatCounts = useMemo(() => {
    if (!isNeet) return { home: 0, india: 0 };
    let home = 0,
      india = 0;
    for (const r of sortedData) {
      if (isHomeStateRow(r)) home += 1;
      else india += 1;
    }
    return { home, india };
  }, [isNeet, sortedData]);

  const displayData = useMemo(() => {
    if (!isNeet) return sortedData;
    const wantState = neetSeatTab === "home";
    return sortedData.filter((r) => isHomeStateRow(r) === wantState);
  }, [isNeet, sortedData, neetSeatTab]);

  // ADAPTIVE COLUMNS (NEET). A column whose value is IDENTICAL on every visible row carries no
  // information — it is just the user's own filter echoed back, and it steals width from the
  // columns that do vary. e.g. filtering Karnataka / MBBS / 2AG made Category read "2AG" and
  // Seat Gender read "Gender-Neutral" on all 32 rows, while "Round" wrapped onto two lines.
  // Institute and Closing Rank are always kept (they are the answer), and everything dropped here
  // is still in the "Show More" panel.
  // Institute and Closing Rank are the answer. college_type and seat_type stay even when constant:
  // the Karnataka students explicitly asked to see them, and "every one of these is a Government
  // seat" is itself worth knowing — the point of the request was that students could not tell.
  const ALWAYS_KEEP = new Set([
    "institute",
    "closing_rank",
    "college_type",
    "seat_type",
  ]);
  const predicted_colleges_table_column = useMemo(() => {
    const cols = predicted_colleges_table_column_all;
    if (!isNeet || displayData.length < 2) return cols;
    return cols.filter((col) => {
      if (ALWAYS_KEEP.has(col.key)) return true;
      const seen = new Set();
      for (const row of displayData) {
        seen.add(String(transformData(row)[col.key] ?? ""));
        if (seen.size > 1) return true; // it varies -> worth a column
      }
      return false; // constant across every row -> drop it
    });
  }, [predicted_colleges_table_column_all, isNeet, displayData]);

  // Which counselling round(s) the visible cutoffs come from. Surya asked for this to be stated
  // "more broadly somewhere... for the particular state this is what we are using" rather than
  // repeated on every row — round is a property of the STATE's data, not of a single college.
  // It matters because round depth is not comparable across states: a Round-1 state looks harsher
  // than a mop-up state even when reality is identical.
  const neetRoundNote = useMemo(() => {
    if (!isNeet || !displayData.length) return null;
    const rounds = new Set();
    for (const row of displayData) {
      const r = String(row["Round"] || "").trim();
      if (r) rounds.add(r);
    }
    if (!rounds.size) return null;
    return [...rounds].sort().join(" · ");
  }, [isNeet, displayData]);

  // If the student has no home-state seats (e.g. "Other" state, or the current
  // filters leave none), fall back to the All-India tab so they never see a
  // confusingly empty "home" tab.
  useEffect(() => {
    if (isNeet && neetSeatTab === "home" && neetSeatCounts.home === 0) {
      setNeetSeatTab("india");
    }
  }, [isNeet, neetSeatTab, neetSeatCounts.home]);

  const getDisplayValue = (column, transformedItem) => {
    const rawValue = transformedItem[column.key];
    if (column.format) {
      return column.format(rawValue);
    }
    if (rawValue === 0) return 0;
    return rawValue || "N/A";
  };

  const toggleSalarySort = () => {
    if (!supportsSalarySort) return;
    setSortConfig((prev) => {
      if (!prev || prev.key !== salaryColumnKey) {
        return { key: salaryColumnKey, order: "desc" };
      }
      return {
        key: salaryColumnKey,
        order: prev.order === "desc" ? "asc" : "desc",
      };
    });
  };

  const toggleRankSort = () => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== rankColumnKey) {
        return { key: rankColumnKey, order: "asc" };
      }
      return {
        key: rankColumnKey,
        order: prev.order === "asc" ? "desc" : "asc",
      };
    });
  };

  const toggleNirfRankSort = () => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== nirfRankColumnKey) {
        return { key: nirfRankColumnKey, order: "asc" };
      }
      return {
        key: nirfRankColumnKey,
        order: prev.order === "asc" ? "desc" : "asc",
      };
    });
  };

  const renderSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={16} />;
    }
    if (sortConfig.order === "desc") {
      return <ArrowDown size={16} />;
    }
    return <ArrowUp size={16} />;
  };

  const renderJosaaCollegeGroupToggle = () => {
    if (!showJosaaCollegeGroupToggle) return null;

    const options = [
      {
        value: "main",
        label: "JEE Main colleges",
        detail: "NITs, IIITs, GFTIs",
        count: searchedDataExamCounts.main,
      },
      {
        value: "advanced",
        label: "JEE Advanced colleges",
        detail: "IITs",
        count: searchedDataExamCounts.advanced,
      },
    ];

    return (
      <div
        className="mb-4 rounded-xl border border-[#eaded8] bg-[#fffdfa] p-3 sm:p-4"
        aria-label="Choose JoSAA college group"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#5b1f20]">
              Show colleges by exam
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
            {options.map((option) => {
              const isActive = josaaCollegeGroup === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setJosaaCollegeGroup(option.value)}
                  className={`min-w-[210px] rounded-lg border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-[#B52326] bg-[#B52326] text-white shadow-sm"
                      : "border-[#e3d1cb] bg-white text-[#5b3a34] hover:bg-[#f8efec]"
                  }`}
                  aria-pressed={isActive}
                >
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                    {option.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[#f8efec] text-[#8f2e31]"
                      }`}
                    >
                      {option.count.toLocaleString("en-IN")}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 block text-xs ${
                      isActive ? "text-white/85" : "text-[#6d5550]"
                    }`}
                  >
                    {option.detail}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderNeetSeatTabs = () => {
    if (!isNeet) return null;
    // Only offer the home tab when there are home-state seats to show.
    if (neetSeatCounts.home === 0 && neetSeatCounts.india === 0) return null;
    const homeState = (sortedData.find(
      (r) => r["Seat Type"] === "State Quota"
    ) || {})["State"];
    const tabs = [
      {
        value: "home",
        label: homeState ? `${homeState} state quota` : "Home-state quota",
        detail: "Seats reserved for your home state",
        count: neetSeatCounts.home,
        disabled: neetSeatCounts.home === 0,
      },
      {
        value: "india",
        label: "All India Quota",
        detail: "Open to students from every state",
        count: neetSeatCounts.india,
        disabled: neetSeatCounts.india === 0,
      },
    ];
    return (
      <div
        className="mb-4 rounded-xl border border-[#eaded8] bg-[#fffdfa] p-3 sm:p-4"
        aria-label="Choose NEET seat pool"
      >
        <p className="mb-2 text-sm font-semibold text-[#5b1f20]">
          Show seats by quota
        </p>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {tabs.map((tab) => {
            const isActive = neetSeatTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                disabled={tab.disabled}
                onClick={() => setNeetSeatTab(tab.value)}
                className={`rounded-lg border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? "border-[#B52326] bg-[#B52326] text-white shadow-sm"
                    : "border-[#e3d1cb] bg-white text-[#5b3a34] hover:bg-[#f8efec]"
                }`}
                aria-pressed={isActive}
              >
                <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                  {tab.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#f8efec] text-[#8f2e31]"
                    }`}
                  >
                    {tab.count.toLocaleString("en-IN")}
                  </span>
                </span>
                <span
                  className={`mt-1 block text-xs ${
                    isActive ? "text-white/80" : "text-[#8a6b64]"
                  }`}
                >
                  {tab.detail}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const downloadCsv = () => {
    if (!sortedData.length) return;
    const headers = predicted_colleges_table_column.map((column) =>
      column.label.replace(/"/g, '""')
    );
    const rows = sortedData.map((item) => {
      const transformedItem = transformData(item);
      return predicted_colleges_table_column.map((column) => {
        const value = getDisplayValue(column, transformedItem);
        const stringValue =
          value === null || value === undefined ? "" : String(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      });
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const groupSuffix = showJosaaCollegeGroupToggle
      ? `_${josaaCollegeGroup}`
      : "";
    link.download = `college_predictions_${
      exam || "results"
    }${groupSuffix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderTableHeader = () => (
    <tr className={commonHeaderClass}>
      {predicted_colleges_table_column.map((column) => (
        <th
          key={column.key}
          className="px-4 py-3 border-b border-[#decac3] whitespace-nowrap"
        >
          {supportsSalarySort && column.key === rankColumnKey ? (
            <button
              type="button"
              onClick={toggleRankSort}
              className="font-semibold inline-flex items-center gap-1"
            >
              {column.label}
              {renderSortIcon(rankColumnKey)}
            </button>
          ) : supportsSalarySort && column.key === nirfRankColumnKey ? (
            <button
              type="button"
              onClick={toggleNirfRankSort}
              className="font-semibold inline-flex items-center gap-1"
            >
              {column.label}
              {renderSortIcon(nirfRankColumnKey)}
            </button>
          ) : supportsSalarySort && column.key === salaryColumnKey ? (
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSalarySort}
                className="font-semibold inline-flex items-center gap-1"
              >
                {column.label}
                {renderSortIcon(salaryColumnKey)}
              </button>
              <button
                type="button"
                onMouseEnter={showSalaryTooltip}
                onMouseLeave={hideSalaryTooltip}
                onFocus={showSalaryTooltip}
                onBlur={hideSalaryTooltip}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d6b8ae] text-[#8f2e31] hover:bg-[#f8efec]"
                aria-label="How expected salary is calculated"
              >
                <Info size={12} />
              </button>
            </div>
          ) : (
            column.label
          )}
        </th>
      ))}
      {supportsExpandedView && <th className="p-2">Actions</th>}
    </tr>
  );

  const renderTableBody = () => {
    const rowsToRender = showAllRows
      ? displayData
      : displayData.slice(0, ROWS_PER_PAGE_INITIAL);

    return rowsToRender.map((item, index) => {
      const transformedItem = transformData(item);
      const rowKey = getRowKey(transformedItem);

      return (
        <React.Fragment key={rowKey}>
          <tr
            className={`${commonCellClass} ${
              index % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
            }`}
          >
            {predicted_colleges_table_column.map((column) => (
              <td key={column.key} className="px-4 py-3 align-top">
                {getDisplayValue(column, transformedItem)}
              </td>
            ))}
            {supportsExpandedView && (
              <td className="px-4 py-3">
                <div className="flex justify-center">
                  <button
                    className="whitespace-nowrap rounded-lg bg-[#B52326] px-4 py-2 text-white hover:bg-[#9E1F22]"
                    onClick={() => toggleRowExpansion(rowKey)}
                  >
                    {expandedRows[rowKey] ? "Show Less" : "Show More"}
                  </button>
                </div>
              </td>
            )}
          </tr>
          {supportsExpandedView && expandedRows[rowKey] && (
            <ExpandedRowComponent
              item={transformedItem}
              fields={expandedFields}
              exam={exam}
              examColumnMapping={examColumnMapping}
            />
          )}
        </React.Fragment>
      );
    });
  };

  const renderLegend = () => {
    const examConfig = examConfigs[exam];
    if (!examConfig || !examConfig.legend) return null;

    if (isJosaaExam) {
      return (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#5b3a34]">
          <span className="inline-flex items-center rounded-full border border-[#e3d1cb] bg-[#fffdfa] px-3 py-1 font-medium">
            Based on JoSAA 2025
          </span>
          <span className="inline-flex items-center rounded-full border border-[#e3d1cb] bg-[#fffdfa] px-3 py-1 font-medium">
            Cutoffs are shown with a 10% margin above your category rank
          </span>
          <span className="basis-full pt-1 text-[#6d5550]">
            Home-state quota is used where applicable; other colleges use
            all-India or out-of-state cutoffs.
          </span>
        </div>
      );
    }

    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#5b3a34]">
        <span className="font-semibold text-[#5b1f20]">Quota labels:</span>
        {examConfig.legend.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-2 rounded-full border border-[#e3d1cb] bg-[#fffdfa] px-3 py-1"
          >
            <strong className="text-[#8f2e31]">{item.key}</strong>
            <span>{item.value}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      {salaryTooltip && (
        <div
          className="pointer-events-none fixed z-50 w-72 rounded-xl border border-[#decac3] bg-white p-3 text-left text-xs font-normal leading-5 text-[#5b3a34] shadow-lg"
          style={{
            top: `${Math.max(salaryTooltip.top, 12)}px`,
            left: `${Math.max(salaryTooltip.left, 12)}px`,
          }}
        >
          {SALARY_HELP_TEXT}
        </div>
      )}
      {renderLegend()}
      {fullData.length > 0 && (
        <div className="mb-4">
          {renderJosaaCollegeGroupToggle()}
          {renderNeetSeatTabs()}
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            {onSearchChange && (
              <div className="w-full max-w-xl">
                <input
                  type="text"
                  id="results-search"
                  aria-label="Filter results by institute, state, or program"
                  value={searchTerm}
                  onChange={onSearchChange}
                  className="w-full rounded-xl border border-[#d8c7c1] bg-white px-4 py-3 text-left text-sm outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6] sm:text-base"
                  placeholder="Filter by institute, state, or program"
                />
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
              <p className="text-sm text-[#5b3a34]">
                Showing{" "}
                {(!showAllRows &&
                displayData.length > ROWS_PER_PAGE_INITIAL
                  ? `${ROWS_PER_PAGE_INITIAL.toLocaleString(
                      "en-IN"
                    )} of ${displayData.length.toLocaleString("en-IN")}`
                  : displayData.length.toLocaleString("en-IN")) + " "}
                {showJosaaCollegeGroupToggle
                  ? josaaCollegeGroup === "advanced"
                    ? "JEE Advanced college options."
                    : "JEE Main college options."
                  : isNeet
                  ? neetSeatTab === "home"
                    ? "home-state seats."
                    : "All India Quota seats."
                  : "matching options."}
                {isNeet && neetRoundNote && (
                  <span className="block text-xs text-[#7a5b55]">
                    Cutoffs from: {neetRoundNote}
                  </span>
                )}
              </p>
              {displayData.length > 0 && (
                <button
                  className="w-full rounded-lg bg-[#B52326] px-4 py-2 text-white hover:bg-[#9E1F22] sm:w-auto"
                  onClick={downloadCsv}
                >
                  Download CSV
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {displayData.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[#eaded8] bg-white shadow-sm">
          <table className={commonTableClass}>
            <thead>{renderTableHeader()}</thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>
      ) : fullData.length > 0 ? (
        <div className="text-center py-10">
          <p className="text-xl text-gray-600">
            No results match your search term.
          </p>
        </div>
      ) : null}
      {displayData.length > ROWS_PER_PAGE_INITIAL &&
        !showAllRows && ( // Conditional button rendering
          <div className="flex justify-center mt-4">
            <button
              className="whitespace-nowrap rounded-lg bg-[#B52326] px-6 py-3 font-semibold text-white hover:bg-[#9E1F22]"
              onClick={() => setShowAllRows(true)}
            >
              Show More Recommendations
            </button>
          </div>
        )}
    </div>
  );
};

PredictedCollegesTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      "Institute ID": PropTypes.string, // For TNEA
      Institute: PropTypes.string.isRequired,
      Course: PropTypes.string, // TNEA-specific
      Category: PropTypes.string.isRequired,
      "Cutoff Marks": PropTypes.string, // TNEA-specific
      "Institute Type": PropTypes.string, // TNEA-specific
      State: PropTypes.string,
      "Academic Program Name": PropTypes.string,
      "Closing Rank": PropTypes.string,
      Quota: PropTypes.string,
      "Opening Rank": PropTypes.string,
      "College Type": PropTypes.string,
      "Management Type": PropTypes.string,
      "Expected Salary": PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
      ]),
      "Salary Tier": PropTypes.string,
      "NIRF Rank": PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
  fullData: PropTypes.array,
  exam: PropTypes.string.isRequired,
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func,
};

export default PredictedCollegesTable;

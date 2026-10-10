import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Info,
  SlidersHorizontal,
  X,
} from "lucide-react";
import PropTypes from "prop-types";
import examConfigs from "../examConfig";
import CoachMarks from "./CoachMarks";
import ChoiceBuilder from "./ChoiceBuilder";
import { buildOrder, compareKeys } from "../utils/choiceScore";
import { collegeFilterOption, shortCollegeName } from "../utils/collegeSearch";
import Dropdown from "./dropdown";
import { fmtSalary } from "./collegeShared";

// Define fields for the expanded view
const expandedFields = {
  // TGEAPCET - Telangana Engineering, Agriculture and Pharmacy Common Entrance Test
  // year_of_establish and tuition_fee were dropped with the move to the 2025
  // source — the Convener's Last Rank Statement carries neither column, so
  // both rendered as "N/A" on every row. category_key is shown instead because
  // it is the real seat code (OC_BOYS / SC_II_GIRLS), which is what a student
  // sees on the allotment order.
  TGEAPCET: [
    { key: "inst_code", label: "Institute Code" },
    { key: "place", label: "Location" },
    { key: "dist_code", label: "District" },
    { key: "co_ed", label: "Co-Ed / Girls" },
    { key: "branch_name", label: "Branch Name" },
    { key: "category_key", label: "Seat Code" },
    { key: "college_type", label: "Institute Type" },
    { key: "affiliated_to", label: "Affiliated University" },
    { key: "Year", label: "Data Year" },
  ],
  // JoSAA / JEE Main / JEE Advanced
  JoSAA: [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    {
      key: "Median Salary",
      label: "Median Salary",
      format: (value) => fmtSalary(value) || "N/A",
    },
    {
      key: "Placed %",
      label: "Placed",
      format: (value) => (value != null ? `${value}%` : "N/A"),
    },
  ],
  "JEE Main-JOSAA": [
    { key: "Opening Rank", label: "Opening Rank" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "State", label: "State" },
    { key: "College Type", label: "College Type" },
    { key: "Management Type", label: "Management Type" },
    {
      key: "Median Salary",
      label: "Median Salary",
      format: (value) => fmtSalary(value) || "N/A",
    },
    {
      key: "Placed %",
      label: "Placed",
      format: (value) => (value != null ? `${value}%` : "N/A"),
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
      key: "Median Salary",
      label: "Median Salary",
      format: (value) => fmtSalary(value) || "N/A",
    },
    {
      key: "Placed %",
      label: "Placed",
      format: (value) => (value != null ? `${value}%` : "N/A"),
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
      key: "Median Salary",
      label: "Median Salary",
      format: (value) => fmtSalary(value) || "N/A",
    },
    {
      key: "Placed %",
      label: "Placed",
      format: (value) => (value != null ? `${value}%` : "N/A"),
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
    // Data Year is per-ROW because the streams have different vintages: Engineering
    // is 2025 R3; Medical/Dental, Pharma, Agriculture, Architecture and BNYS are
    // still CET-2021. Mixed vintages must be visible, never inferred (the GUJCET
    // two-streams-two-years lesson).
    { key: "Year", label: "Data Year" },
    { key: "Course Type", label: "Course Type" },
    { key: "State", label: "State" },
    { key: "Language", label: "Language" },
    { key: "Rural/Urban", label: "Region" },
    { key: "Closing Rank", label: "Closing Rank" },
  ],
  // OJEE - Odisha B.Tech (2025; ranks are JEE Main ranks)
  OJEE: [
    { key: "Year", label: "Data Year" },
    { key: "Quota", label: "Quota" },
    { key: "Seat Type", label: "Seat Pool" },
    { key: "Category", label: "Category" },
    { key: "Opening Rank", label: "Opening Rank (JEE Main)" },
  ],
  // JAC Chandigarh (2026; JEE Main ranks, loosest of Rounds 1-3 + Special)
  "JAC Chandigarh": [
    { key: "Year", label: "Data Year" },
    { key: "Quota", label: "Quota" },
    { key: "Category", label: "Category" },
    { key: "Round", label: "Round" },
    { key: "Opening Rank", label: "Opening Rank (JEE Main)" },
  ],
  // HBTU (2026; JEE Main CRL ranks, loosest over the rounds)
  HBTU: [
    { key: "Year", label: "Data Year" },
    { key: "Quota", label: "Quota" },
    { key: "Category", label: "Category" },
    { key: "Sub Category", label: "Special quota" },
    { key: "Round", label: "Round" },
    { key: "Opening Rank", label: "Opening Rank (JEE Main)" },
  ],
  // UPTAC (2026; JEE Main ranks, loosest over the rounds open to you)
  UPTAC: [
    { key: "Year", label: "Data Year" },
    { key: "Category", label: "Category" },
    { key: "Sub Category", label: "Quota" },
    { key: "Round", label: "Round" },
    { key: "Opening Rank", label: "Opening Rank (JEE Main)" },
  ],
  // BITSAT (latest year; one cut-off per campus and programme)
  BITSAT: [
    { key: "Previous Years", label: "Earlier years (of 390)" },
    { key: "Year", label: "Data Year" },
  ],
  // CUET - DU and BHU (2025; each course's own CUET score, lowest over rounds)
  CUET: [
    { key: "Papers Counted", label: "Papers counted" },
    { key: "Out Of", label: "Out of" },
    { key: "University", label: "University" },
    { key: "Category", label: "Category" },
    { key: "Round", label: "Round" },
    { key: "Year", label: "Data Year" },
  ],
  // ICAR-UG (2025; CUET marks, three subjects of 750, lowest over rounds)
  "ICAR-UG": [
    { key: "Year", label: "Data Year" },
    { key: "Category", label: "Category" },
    { key: "Round", label: "Round" },
  ],
  // AIIMS B.Sc. Nursing (2025; entrance overall ranks, loosest of 2 rounds)
  "AIIMS Nursing": [
    { key: "Year", label: "Data Year" },
    { key: "Round", label: "Round" },
    { key: "Opening Rank", label: "Opening Rank" },
  ],
  // AP EAPCET - Andhra Pradesh (2025 consolidated)
  "AP EAPCET": [
    { key: "Year", label: "Data Year" },
    { key: "College Code", label: "APSCHE College Code" },
    { key: "District", label: "District" },
    { key: "Region", label: "Region" },
    { key: "Category", label: "Category" },
    { key: "Gender", label: "Seat Pool" },
  ],
  // CLAT - NLU law admissions (2026, final allotment list)
  CLAT: [
    { key: "Year", label: "Data Year" },
    { key: "List", label: "Closed In" },
    { key: "Domicile State", label: "State Quota" },
    { key: "Seats", label: "Seats" },
    { key: "Category Rank Cutoff", label: "Closing Category Rank" },
  ],
  // KEAM - Kerala (2026 live cycle)
  KEAM: [
    { key: "Year", label: "Data Year" },
    { key: "Phase", label: "Closed In" },
    { key: "College Code", label: "CEE College Code" },
    { key: "Category", label: "Category" },
  ],
  // WBJEE - West Bengal Joint Entrance Examination (2026 live cycle)
  WBJEE: [
    { key: "Year", label: "Data Year" },
    { key: "Round", label: "Closed In" },
    { key: "Seat Type", label: "Seat Type" },
    { key: "Quota", label: "Quota" },
    { key: "College Type", label: "College Type" },
    { key: "Opening Rank", label: "Opening Rank (GMR)" },
  ],
  // TNEA - Tamil Nadu Engineering Admissions
  TNEA: [
    { key: "Institute ID", label: "TNEA College Code" },
    { key: "Branch", label: "Branch (as published)" },
    { key: "District", label: "District" },
    { key: "College Type", label: "College Type" },
    { key: "Cutoff Marks", label: "Cutoff Marks (/200)" },
    { key: "State Rank", label: "State Merit Rank" },
    // (SS) = Self-Supporting section: a costlier self-financed stream INSIDE a
    // govt/aided college — same seat-vs-college distinction as NEET.
    { key: "Self Supporting", label: "Self-Supporting (SS)" },
  ],
  // MHT CET - Maharashtra Common Entrance Test
  "MHT CET": [
    { key: "Category_Key", label: "Seat Type (CET code)" },
    { key: "Category", label: "Category Group" },
    { key: "Gender", label: "Gender" },
    { key: "Defense", label: "Defense Quota" },
    { key: "PWD", label: "PWD Status" },
    { key: "Quota", label: "Quota Pool" },
    { key: "Home University", label: "Home University" },
    { key: "Closing Rank", label: "Closing Rank" },
    { key: "Year", label: "Cutoff Year" },
    { key: "Round", label: "Round That Set Cutoff" },
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

// The college card's figures (utils/collegeFacts.js), so they match the
// Colleges tab and Compare
const SALARY_HELP_TEXT =
  "Reported to NIRF for the whole college, not for individual branches";

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
  // the full list of cutoffs: no rank, so no rank margin to mention
  isFullList = false,
  // the student's ranks, from the form (JoSAA)
  mainRank = "",
  advRank = "",
}) => {
  const [expandedRows, setExpandedRows] = useState({});
  const [showAllRows, setShowAllRows] = useState(false); // State for showing all rows
  const [sortConfig, setSortConfig] = useState({
    key: "closing_rank",
    order: "asc",
  });
  const [salaryTooltip, setSalaryTooltip] = useState(null);
  // "all" = JEE Main and JEE Advanced colleges in one list (the default)
  const [josaaCollegeGroup, setJosaaCollegeGroup] = useState("all");
  // JoSAA rows carry the Colleges tab's college_id, so results can hand off
  // straight into /compare — the standalone's star-and-compare flow, without
  // accounts (selection lives for this results view only)
  const [compareSel, setCompareSel] = useState([]);
  const compareKeyOf = (t) => `${compareIdOf(t)}~${t.academic_program_name}`;
  const toggleCompare = (t) => {
    const key = compareKeyOf(t);
    setCompareSel((prev) =>
      prev.some((x) => x.key === key)
        ? prev.filter((x) => x.key !== key)
        : prev.length >= 3
        ? prev
        : [
            ...prev,
            { key, cid: compareIdOf(t), program: t.academic_program_name },
          ]
    );
  };
  // NEET: which seat pool the results tab is showing — home-state vs All India.
  const [neetSeatTab, setNeetSeatTab] = useState("home");

  const toggleRowExpansion = (rowKey) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  // The row index is appended because these fields do not uniquely identify a
  // row in every exam — TNEA can list the same college+course+category+cutoff
  // twice (different branch codes), which produced duplicate React keys and the
  // "two children with the same key" warning, with rows liable to be omitted or
  // duplicated on re-render. The identifying fields stay in the key so it is
  // still stable for a given position rather than being a bare index.
  const getRowKey = (transformedItem, index) => {
    const parts = [
      transformedItem.institute,
      transformedItem.institute_name,
      transformedItem["Institute ID"],
      transformedItem.academic_program_name,
      transformedItem.branch_name,
      transformedItem.Branch,
      transformedItem.category || transformedItem.Category,
      transformedItem.closing_rank,
      index,
    ];
    return parts
      .filter((p) => p !== undefined && p !== null && p !== "")
      .join("-");
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
  // MHT CET rows carry no college id, but their institute names are the
  // Colleges tab's own (same CET Cell source), so compare keys on the name
  // exams whose result rows share the Colleges tab's own names (same source)
  const NAME_LINK_EXAMS = new Set([
    "MHT CET",
    "KCET",
    "TNEA",
    "WBJEE",
    "KEAM",
    "AP EAPCET",
    "TGEAPCET",
    "OJEE",
    "JAC Chandigarh",
    "UPTAC",
    "HBTU",
    "AIIMS Nursing",
    "ICAR-UG",
    "CLAT",
    "GUJCET",
    "BITSAT",
    "CUET",
  ]);
  // AIIMS cards are MCC (medical) colleges, which /compare leaves out:
  // name links yes, compare boxes no
  // ICAR cutoffs are CUET marks, which /compare (ranks) can't line up
  // CUET and BITSAT are scores too
  const NO_COMPARE_EXAMS = new Set([
    "AIIMS Nursing",
    "ICAR-UG",
    "BITSAT",
    "CUET",
  ]);
  const supportsCompare =
    (isJosaaExam || NAME_LINK_EXAMS.has(exam)) && !NO_COMPARE_EXAMS.has(exam);
  const slugOf = (x) =>
    String(x || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  // the institute name as the Colleges tab prints it. KEA prefixes its code
  // ("E023  P E S College…") — strip it so the tab's search lands on one row.
  const INSTITUTE_KEYS = new Set([
    "institute",
    "College Name",
    "institute_name",
  ]);
  const linkNameOf = (t) => {
    const raw =
      t.institute ||
      t["Institute"] ||
      t["College Name"] ||
      t.institute_name ||
      "";
    return exam === "KCET"
      ? String(raw).replace(/^[A-Z]\d{3}\s+/, "")
      : String(raw);
  };
  // KCET's predictor also covers medical/dental/ayurveda seats, which live on
  // the tab under NEET, not KEA — no dead links for those rows
  // GUJCET's medical/pharmacy rows are nursing, physiotherapy and pharmacy
  // colleges the tab doesn't carry: its engineering rows only
  const canLinkRow = (t) =>
    exam === "GUJCET"
      ? String(t["Program"] || "Engineering") === "Engineering"
      : exam !== "KCET" ||
        /engineer|architect/i.test(String(t["Course Type"] || "Engineering"));
  const compareIdOf = (t) =>
    t["College ID"] || (canLinkRow(t) ? `n~${slugOf(linkNameOf(t))}` : null);
  const supportsSalarySort = isJosaaExam;
  const salaryColumnKey = "median_salary";
  const rankColumnKey = "closing_rank";
  const nirfRankColumnKey = "nirf_rank";

  // Coach marks (design: futures tutorial artifact). Shown once per browser.
  // Each tip only where its column exists:
  // Compare on name-linked exams, sorting on JoSAA.
  const tourSteps = [
    supportsCompare && {
      targets: ['[data-tour="compare-head"]', '[data-tour="compare-end"]'],
      title: "Tick up to 3 colleges to compare",
      body: "Pick colleges in this red column, then compare their fees, placements and cutoffs side by side.",
    },
    supportsSalarySort && {
      targets: ['[data-tour="sort-first"]', '[data-tour="sort-last"]'],
      title: "Tap a column name to sort",
      body: "Sort by Median Salary to see where graduates earn most, or by NIRF Rank to see the best-ranked colleges first.",
    },
    isCombinedJosaaExam && {
      targets: ['[data-tour="choice-cta"]', '[data-tour="choice-cta"]'],
      title: "Not sure what to pick?",
      body: "Tap Help me choose. A few quick questions put this list in the order that suits you.",
    },
  ].filter(Boolean);
  const [tour, setTour] = useState(null); // { step, solo } while showing
  // once a student builds a custom list: where to switch back, once per
  // browser
  const VIEW_TIP_SEEN = "futures:viewTipSeen";
  const [viewTip, setViewTip] = useState(false);
  const viewTipSteps = [
    {
      // the View dropdown that's showing: phones have their own
      targets: Array(2).fill(
        typeof window !== "undefined" && window.innerWidth >= 640
          ? '[data-tour="view-toggle-desktop"]'
          : '[data-tour="view-toggle"]'
      ),
      title: "Your custom list is on",
      body: "Switch between it and the default list (by closing rank) here.",
    },
  ];
  const closeViewTip = () => {
    setViewTip(false);
    try {
      window.localStorage.setItem(VIEW_TIP_SEEN, "1");
    } catch (e) {}
  };

  // College choice builder (JoSAA only): answers kept per browser
  const CHOICES_KEY = "futures:josaaChoices";
  const [choicePrefs, setChoicePrefs] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [branchParents, setBranchParents] = useState(null);
  useEffect(() => {
    if (!isCombinedJosaaExam) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(CHOICES_KEY));
      // answers saved by earlier versions of the quiz don't apply
      if (saved?.interest && saved.workplace) {
        setChoicePrefs({
          ...saved,
          states: saved.states || [],
          families: saved.families || [],
          branches: saved.branches || [],
        });
      }
    } catch (e) {}
    fetch("/data/JEE/josaa_branch_parents.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setBranchParents)
      .catch(() => setBranchParents({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCombinedJosaaExam]);
  const applyChoices = (answers) => {
    const prefs = {
      ...answers,
      states: answers.states || [],
      families: answers.families || [],
      branches: answers.branches || [],
    };
    setChoicePrefs(prefs);
    setBuilderOpen(false);
    setJosaaCollegeGroup("all");
    setSortConfig({ key: "choice", order: "asc" });
    setShowAllRows(false);
    try {
      window.localStorage.setItem(CHOICES_KEY, JSON.stringify(answers));
      if (window.localStorage.getItem(VIEW_TIP_SEEN) !== "1")
        setTimeout(() => setViewTip(true), 400);
    } catch (e) {}
  };
  // the quiz's options: states and parent branches present in these results
  const builderStates = useMemo(
    () =>
      Array.from(
        new Set(fullData.map((r) => r["State"]).filter(Boolean))
      ).sort(),
    [fullData]
  );
  const builderBranches = useMemo(() => {
    if (!branchParents) return [];
    const seen = new Map();
    for (const r of fullData) {
      const p = branchParents[r["Academic Program Name"]];
      if (p) seen.set(p.id, p);
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [fullData, branchParents]);
  const tableScrollRef = useRef(null);
  // v2: the "Help me choose" step was added, so everyone sees the tips once more
  const TIPS_SEEN = "futures:predictorTipsSeen.v2";
  const readSeen = () => {
    try {
      return window.localStorage.getItem(TIPS_SEEN) === "1";
    } catch (e) {
      return false;
    }
  };
  const closeTour = () => {
    setTour(null);
    // the sort tip scrolls the table sideways to its column; put the
    // college and program columns back in view
    if (tableScrollRef.current)
      tableScrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
    try {
      window.localStorage.setItem(TIPS_SEEN, "1");
    } catch (e) {}
  };
  const hasRows = data.length > 0;
  useEffect(() => {
    if (!hasRows || !tourSteps.length || readSeen()) return undefined;
    const t = setTimeout(() => setTour({ step: 0, solo: false }), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRows, tourSteps.length]);
  // scrolling the table sideways before the tour ran: show the sort tip alone
  const onTableScroll = (e) => {
    if (tour || readSeen() || !supportsSalarySort) return;
    if (e.currentTarget.scrollLeft > 40) {
      setTour({
        step: tourSteps.findIndex((t) => t.targets[0].includes("sort")),
        solo: true,
      });
    }
  };

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
    // a group with no rows falls back to the combined list
    if (
      !isCombinedJosaaExam ||
      (josaaCollegeGroup === "advanced" && fullDataExamCounts.advanced === 0) ||
      (josaaCollegeGroup === "main" && fullDataExamCounts.main === 0)
    ) {
      setJosaaCollegeGroup("all");
    }
  }, [exam, fullDataExamCounts, isCombinedJosaaExam, josaaCollegeGroup]);

  useEffect(() => {
    setShowAllRows(false);
  }, [josaaCollegeGroup, searchTerm]);

  const formatPercentage = (value) => {
    // Guard the raw value first: Number(null) is 0 and Number.isFinite(0) is
    // true, so a genuinely-absent cutoff rendered as "0.00%" — which a student
    // reads as "cutoff is zero, I'm guaranteed in". Hit this on GUJCET's 8
    // pharmacy ESM rows, where the source PDF's percentile column is a
    // column-boundary artifact and is deliberately NULL upstream.
    if (value === null || value === undefined || value === "") return "N/A";
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "N/A";
    return `${numericValue.toFixed(2)}%`;
  };

  // GUJCET's Medical cutoffs are raw NEET scores out of 720, not percentages —
  // rendering 675 as "675.00%" is nonsense. Engineering/Pharmacy really are a
  // 0-100 composite percentile, so the unit has to follow the program. Derived
  // from the rows rather than taken as a prop: every row in a GUJCET result set
  // shares one Program (the API filters on it), so the first row is enough.
  const gujcetProgram = exam === "GUJCET" ? data?.[0]?.Program ?? null : null;
  const isGujcetMedical = gujcetProgram === "Medical";

  // ACPC's composite merit score is a 0-100 normalised figure, not a percentage
  // of anything, so it gets no "%" suffix — that suffix invited students to read
  // it as their Class 12 percentage, which is the confusion the corrected legend
  // exists to clear up. Kept separate from formatPercentage, which other exams
  // legitimately use for real percentages.
  const formatMeritScore = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "N/A";
    return numericValue.toFixed(2);
  };

  const formatNeetScore = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "N/A";
    return `${numericValue.toFixed(0)} / 720`;
  };

  useEffect(() => {
    if (!supportsSalarySort) return;
    setSortConfig({
      key: choicePrefs ? "choice" : rankColumnKey,
      order: "asc",
    });
    // !!choicePrefs: saved answers load after the first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    exam,
    data,
    josaaCollegeGroup,
    supportsSalarySort,
    rankColumnKey,
    !!choicePrefs,
  ]);

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
        key: "median_salary",
        label: "Median Salary",
        format: (value) => fmtSalary(value) || "N/A",
      },
      {
        key: "placed_pct",
        label: "Placed",
        format: (value) => (value != null ? `${value}%` : "N/A"),
      },
      // present only when the results mix pools (a Female-only student's
      // view spans women-only and gender-neutral seats); the adaptive check
      // below removes it when every row is one pool
      { key: "seat_gender", label: "Seat Gender" },
    ],
    "JEE Main-JOSAA": [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "nirf_rank", label: "NIRF Rank" },
      {
        key: "median_salary",
        label: "Median Salary",
        format: (value) => fmtSalary(value) || "N/A",
      },
      {
        key: "placed_pct",
        label: "Placed",
        format: (value) => (value != null ? `${value}%` : "N/A"),
      },
    ],
    "JEE Main-JAC": [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "Category", label: "Category" },
      // shown only when a girl's results mix both pools (check below)
      { key: "seat_gender", label: "Seat Gender" },
    ],
    "JEE Advanced": [
      { key: "state", label: "State" },
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      { key: "nirf_rank", label: "NIRF Rank" },
      {
        key: "median_salary",
        label: "Median Salary",
        format: (value) => fmtSalary(value) || "N/A",
      },
      {
        key: "placed_pct",
        label: "Placed",
        format: (value) => (value != null ? `${value}%` : "N/A"),
      },
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
      // Closing rank leads for Engineering/Pharmacy because that is now the
      // unit the student typed in, so the comparison is direct. It is also the
      // only cutoff for the 8 pharmacy ESM rows, whose percentile is NULL
      // upstream. Medical has no rank at all in its source, so the column is
      // dropped there rather than showing 444 rows of "N/A".
      ...(isGujcetMedical
        ? []
        : [{ key: "closing_rank", label: "Closing Rank" }]),
      {
        key: "closing_marks",
        label: isGujcetMedical ? "Cutoff NEET Score" : "Cutoff Merit Score",
        format: isGujcetMedical ? formatNeetScore : formatMeritScore,
      },
    ],
    KCET: [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
    ],
    OJEE: [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      // "(JEE Main)" is load-bearing here, not noise: the OJEE page takes a
      // JEE Main rank, and an unlabelled rank column would read as an OJEE
      // exam rank (which exists, for other courses).
      { key: "closing_rank", label: "Closing Rank (JEE Main)" },
    ],
    HBTU: [
      { key: "academic_program_name", label: "Program" },
      { key: "Quota", label: "Quota" },
      { key: "closing_rank", label: "Closing Rank (JEE Main)" },
    ],
    UPTAC: [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank (JEE Main)" },
    ],
    BITSAT: [
      { key: "institute", label: "Campus" },
      { key: "academic_program_name", label: "Programme" },
      { key: "cutoff_score", label: "Cutoff (BITSAT score)" },
    ],
    // "Your score" is per course: DU and BHU add up different papers for
    // each, so the student's score changes from row to row
    CUET: [
      { key: "institute", label: "College" },
      { key: "academic_program_name", label: "Course" },
      { key: "your_score", label: "Your score" },
      { key: "cutoff_score", label: "Cutoff" },
      { key: "seat", label: "Seat" },
    ],
    "ICAR-UG": [
      { key: "institute", label: "University" },
      { key: "academic_program_name", label: "Course" },
      { key: "cutoff_marks", label: "Cutoff (CUET marks)" },
    ],
    "AIIMS Nursing": [
      { key: "institute", label: "Institute" },
      { key: "seat_category", label: "Seat" },
      { key: "closing_rank", label: "Closing Rank" },
    ],
    "JAC Chandigarh": [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank (JEE Main)" },
    ],
    "AP EAPCET": [
      { key: "institute", label: "Institute" },
      // Branch codes are shown verbatim (CSE, AID, CSD...) - the official
      // PDF ships no code-to-name legend, and students know these codes
      // from the web-options screen. A wrong expansion beats no expansion.
      { key: "academic_program_name", label: "Branch Code" },
      // Plain "Closing Rank": the page is already the AP EAPCET page, so
      // repeating the exam name in the header is noise (user feedback).
      { key: "closing_rank", label: "Closing Rank" },
      { key: "college_type", label: "College Type" },
    ],
    KEAM: [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      // "KEAM Rank" spelt out: Kerala students also hold NEET/JEE ranks and
      // an unlabelled rank column invites the wrong comparison.
      { key: "closing_rank", label: "Closing Rank (KEAM Rank)" },
      { key: "college_type", label: "College Type" },
    ],
    CLAT: [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      // AIR spelt out: the table also shows a category-rank cutoff in the
      // expanded view, and an unlabelled rank invites the wrong comparison.
      { key: "closing_rank", label: "Closing Rank (CLAT AIR)" },
      { key: "Category", label: "Category" },
    ],
    WBJEE: [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      // GMR spelt out in the header: WBJEE publishes several rank lists and
      // the JEE(Main)-seat rows would otherwise read as JEE Main ranks.
      { key: "closing_rank", label: "Closing Rank (GMR)" },
      { key: "college_type", label: "College Type" },
    ],
    "MHT CET": [
      { key: "institute", label: "Institute" },
      { key: "academic_program_name", label: "Program" },
      { key: "closing_rank", label: "Closing Rank" },
      // Seat code, not the collapsed bucket. One college+program legitimately
      // appears several times (GOBCS / LOBCS / GSEBCS ... all roll up to "OBC"),
      // so showing only the bucket made real rows look like duplicates.
      { key: "Category_Key", label: "Seat Type" },
      { key: "Round", label: "Round" },
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

  const isCombinedView =
    showJosaaCollegeGroupToggle && josaaCollegeGroup === "all";
  const predicted_colleges_table_column_all = (() => {
    const cols = examColumnMapping[exam] || examColumnMapping.DEFAULT;
    if (!isCombinedView) return cols;
    // Main and Advanced closing ranks are different scales: name the exam
    const at = cols.findIndex((c) => c.key === "closing_rank");
    return [
      ...cols.slice(0, at),
      { key: "exam_type", label: "Exam" },
      ...cols.slice(at),
    ];
  })();

  const transformData = (item) => {
    if (exam === "GUJCET") {
      return {
        ...item,
        institute: item["College Name"],
        academic_program_name: item["Course"],
        // Deliberately NOT overwriting closing_rank with closing_marks. The API
        // returns both — ACPC's merit rank and its percentile-equivalent score —
        // and they move in opposite directions (lower rank = harder, higher
        // percentile = harder). Aliasing the percentile onto closing_rank blanked
        // the real rank on the 8 pharmacy ESM rows, whose percentile is NULL
        // upstream, and made the default rank sort run on the wrong metric.
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
    if (exam === "HBTU") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
      };
    }
    if (exam === "UPTAC") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
      };
    }
    if (exam === "BITSAT") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        cutoff_score: `${item["Cutoff Score"]} / ${item["Out Of"]}`,
      };
    }
    if (exam === "CUET") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        your_score: item["Your Score"],
        cutoff_score: item["Cutoff Note"]
          ? "All admitted"
          : item["Cutoff Score"] == null
          ? null
          : `${item["Cutoff Score"]} / ${item["Out Of"]}`,
        seat: item["Seat"],
      };
    }
    if (exam === "ICAR-UG") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        cutoff_marks:
          item["Cutoff Marks"] == null ? null : `${item["Cutoff Marks"]} / 750`,
      };
    }
    if (exam === "AIIMS Nursing") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: "B.Sc. (Hons.) Nursing",
        seat_category: item["Seat Category"],
        closing_rank: item["Closing Rank"],
      };
    }
    if (exam === "JAC Chandigarh") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
      };
    }
    if (exam === "OJEE") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
        "Year": item["Year"],
        "Quota": item["Quota"],
        "Seat Type": item["Seat Type"],
        "Category": item["Category"],
        "Opening Rank": item["Opening Rank"],
        "Closing Rank": item["Closing Rank"],
      };
    }
    if (exam === "AP EAPCET") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
        college_type: item["College Type"],
        "Year": item["Year"],
        "College Code": item["College Code"],
        "District": item["District"],
        "Region": item["Region"],
        "Category": item["Category"],
        "Gender": item["Gender"],
        "College Type": item["College Type"],
        "Closing Rank": item["Closing Rank"],
      };
    }
    if (exam === "CLAT") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
        Category: item["Category"],
        "Category Code": item["Category Code"],
        "Domicile State": item["Domicile State"] || "All India",
        Seats: item["Seats"],
        "Category Rank Cutoff": item["Category Rank Cutoff"],
        Year: item["Year"],
        List: item["List"],
      };
    }
    if (exam === "KEAM") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
        college_type: item["College Type"],
        "Year": item["Year"],
        "Phase": item["Phase"],
        "College Code": item["College Code"],
        "Category": item["Category"],
        "College Type": item["College Type"],
        "Closing Rank": item["Closing Rank"],
      };
    }
    if (exam === "WBJEE") {
      return {
        ...item,
        institute: item["Institute"],
        academic_program_name: item["Academic Program Name"],
        closing_rank: item["Closing Rank"],
        college_type: item["College Type"],
        "Year": item["Year"],
        "Round": item["Round"],
        "Seat Type": item["Seat Type"],
        "Quota": item["Quota"],
        "College Type": item["College Type"],
        "Opening Rank": item["Opening Rank"],
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
        seat_gender:
          item["Gender"] === "Female-only (including Supernumerary)"
            ? "Women-only"
            : "Open to all",
        nirf_rank: item["NIRF Rank"],
        closing_rank: item["Closing Rank"],
        median_salary: item["Median Salary"],
        placed_pct: item["Placed %"],
        "Seat Type": item["Seat Type"],
        "State": item["State"],
        "Quota": item["Quota"] || "AI",
        "Closing Rank": item["Closing Rank"],
        "Opening Rank": item["Opening Rank"],
        "College Type": item["College Type"],
        "Management Type": item["Management Type"],
        "Median Salary": item["Median Salary"],
        "Placed %": item["Placed %"],
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
        seat_gender:
          item["Gender"] === "Female-Only" ? "Women-only" : "Open to all",
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
        college_type:
          item["College Type"] ||
          neetCollegeTypeFromSeatType(item["Seat Type"]),
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
          item["College Type"] ||
          neetCollegeTypeFromSeatType(item["Seat Type"]),
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
      // Pass the row through untouched. It used to coerce every field with
      // `|| "N/A"`, which defeats the adaptive-column rule below: a literal
      // "N/A" string is non-empty, so a column that is genuinely absent on
      // every row could never be detected and dropped. The renderer already
      // shows "N/A" for a missing value.
      return { ...item };
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
    const raw = item?.["Median Salary"] ?? item?.median_salary;
    const numericValue = Number(raw);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const getClosingRankValue = (item) => {
    const raw =
      item?.["Closing Rank"] ??
      item?.closing_rank ??
      item?.["Cutoff Marks"] ??
      item?.closing_marks;
    // "" would become 0 via Number(), sorting a row with no cutoff to the very
    // top of an ascending rank sort — i.e. presenting it as the hardest seat.
    if (raw === null || raw === undefined || raw === "") return null;
    const numericValue = Number(raw);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const getNirfRankValue = (item) => {
    const raw = item?.["NIRF Rank"] ?? item?.nirf_rank;
    const numericValue = Number(raw);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  // The combined JoSAA list's filters: one college, branch (parent) and
  // state each, or all
  const [pickCollege, setPickCollege] = useState(null);
  const [pickBranch, setPickBranch] = useState(null);
  const [pickState, setPickState] = useState(null);
  const collegeOptions = useMemo(
    () =>
      Array.from(new Set(fullData.map((r) => r["Institute"])))
        .filter(Boolean)
        .sort()
        .map((c) => ({ value: c, label: c, short: shortCollegeName(c) })),
    [fullData]
  );
  // the short name students use on top, the full JoSAA name under it; once
  // chosen, the short name alone
  const formatCollegeOption = (o, { context }) =>
    context === "value" ? (
      o.short || o.label
    ) : o.short ? (
      <span>
        <span className="block font-bold">{o.short}</span>
        <span className="block text-xs opacity-75">{o.label}</span>
      </span>
    ) : (
      o.label
    );
  const pickedData = useMemo(() => {
    if (!isCombinedJosaaExam) return data;
    return data.filter(
      (r) =>
        (!pickCollege || r["Institute"] === pickCollege) &&
        (!pickState || r["State"] === pickState) &&
        (!pickBranch ||
          branchParents?.[r["Academic Program Name"]]?.id === pickBranch)
    );
  }, [
    data,
    isCombinedJosaaExam,
    pickCollege,
    pickBranch,
    pickState,
    branchParents,
  ]);

  const examFilteredData = useMemo(() => {
    if (!showJosaaCollegeGroupToggle) return pickedData;

    if (josaaCollegeGroup === "all") return pickedData;
    const activeExam =
      josaaCollegeGroup === "advanced" ? "JEE Advanced" : "JEE Main";
    return pickedData.filter((item) => getJeeExamType(item) === activeExam);
  }, [pickedData, josaaCollegeGroup, showJosaaCollegeGroupToggle]);

  // Choice-builder order (utils/choiceScore.js), from the whole result set
  // so a search or exam tab doesn't move the percentiles
  const choiceScore = useMemo(() => {
    if (!choicePrefs || !branchParents) return null;
    return buildOrder(fullData, choicePrefs, branchParents, {
      "JEE Main": mainRank,
      "JEE Advanced": advRank,
    });
  }, [fullData, choicePrefs, branchParents, mainRank, advRank]);
  // in the combined list a closing rank only compares within its exam
  const examOrder = (item) =>
    isCombinedView ? (getJeeExamType(item) === "JEE Advanced" ? 0 : 1) : 0;

  const sortedData = useMemo(() => {
    if (!supportsSalarySort) return examFilteredData;
    if (!examFilteredData.length) return examFilteredData;
    const { key, order } = sortConfig || {};
    const copy = [...examFilteredData];

    if (key === "choice" && choiceScore) {
      const keys = new Map(copy.map((r) => [r, choiceScore(r)]));
      copy.sort((a, b) => {
        const d = compareKeys(keys.get(a), keys.get(b));
        if (d) return d;
        // same key: harder seat first
        return (
          examOrder(a) - examOrder(b) ||
          (getClosingRankValue(a) ?? Infinity) -
            (getClosingRankValue(b) ?? Infinity)
        );
      });
      return copy;
    }

    copy.sort((a, b) => {
      let aVal = null;
      let bVal = null;
      if (key === rankColumnKey && examOrder(a) !== examOrder(b))
        return examOrder(a) - examOrder(b);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    examFilteredData,
    sortConfig,
    supportsSalarySort,
    choiceScore,
    isCombinedView,
  ]);

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

  // In the custom view, the states the student picked in the choice builder
  // come first, as a stable re-ordering of the sort
  const preferredStates =
    isCombinedJosaaExam && sortConfig?.key === "choice"
      ? choicePrefs?.states || []
      : [];
  const stateOrdered = useMemo(() => {
    if (!preferredStates.length) return sortedData;
    const inState = (r) => preferredStates.includes(r["State"]);
    return [
      ...sortedData.filter(inState),
      ...sortedData.filter((r) => !inState(r)),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedData, preferredStates.join("|")]);

  // how many rows show: the combined JoSAA list picks it (25/50/100/all);
  // other exams show 30 until "Show More"
  const [pageSize, setPageSize] = useState(50);
  const rowLimit = isCombinedJosaaExam
    ? pageSize
    : showAllRows
    ? Infinity
    : ROWS_PER_PAGE_INITIAL;

  const displayData = useMemo(() => {
    if (!isNeet) return stateOrdered;
    const wantState = neetSeatTab === "home";
    return stateOrdered.filter((r) => isHomeStateRow(r) === wantState);
  }, [isNeet, stateOrdered, neetSeatTab]);

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
    let cols = predicted_colleges_table_column_all;
    if (!displayData.length) return cols;

    // EMPTY COLUMNS (all exams). A column with no value on ANY row is pure
    // N/A — it cannot inform a choice and it steals width from the columns
    // that can. GUJCET is the live case: ACPC's closure PDFs carry no district
    // field, so District is null on all 2,487 engineering + pharmacy rows
    // (it is populated only for Medical, from a different source). Feedback
    // from Sakshi was exactly this: a District column that is "mostly N/A".
    // Kept deliberately narrower than the NEET rule below — this drops only
    // columns that are ENTIRELY absent, never ones that merely happen to be
    // constant on the current view.
    // Only the answer pair is exempt here. college_type/seat_type's
    // always-keep is about CONSTANT values (the Karnataka ask below) — a
    // column with NO value on any visible row (Maharashtra's source carries
    // no college type) is still an all-dash column and gets dropped.
    cols = cols.filter((col) => {
      if (col.key === "institute" || col.key === "closing_rank") return true;
      return displayData.some((row) => {
        const value = transformData(row)[col.key];
        return value !== null && value !== undefined && value !== "";
      });
    });

    const isConstant = (key) => {
      const seen = new Set();
      for (const row of displayData) {
        seen.add(String(transformData(row)[key] ?? ""));
        if (seen.size > 1) return false;
      }
      return true;
    };
    // JoSAA's one adaptive column: seat_gender only earns its place when the
    // results actually mix pools (a Female-only student's view). Decided on
    // fullData — `data` is just the visible page, and the tightest 30
    // closings are usually all gender-neutral even when women-only seats sit
    // further down the list.
    if (isJosaaExam || exam === "JEE Main-JAC") {
      const seen = new Set();
      for (const row of fullData.length ? fullData : displayData) {
        seen.add(String(transformData(row).seat_gender ?? ""));
        if (seen.size > 1) break;
      }
      if (seen.size <= 1) {
        cols = cols.filter((col) => col.key !== "seat_gender");
      }
    }
    if (!isNeet || displayData.length < 2) return cols;
    return cols.filter((col) => {
      if (ALWAYS_KEEP.has(col.key)) return true;
      return !isConstant(col.key);
    });
  }, [
    predicted_colleges_table_column_all,
    isNeet,
    displayData,
    isJosaaExam,
    fullData,
  ]);

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
    // Year: derived from the Source string (every source is named "<state>_<year>_..."), never
    // hardcoded, so the label stays correct when 2026 counselling data lands. A round with no year
    // is ambiguous — "Round 1" of which cycle?
    const years = new Set();
    for (const row of displayData) {
      const m = String(row["Source"] || "").match(/(20\d\d)/);
      if (m) years.add(m[1]);
    }
    const yearLabel = years.size ? [...years].sort().join("/") + " " : "";
    return yearLabel + [...rounds].sort().join(" · ");
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

  // the combined JoSAA list's college, branch and state filters
  const renderTableDropdowns = () => (
    <>
      <Dropdown
        options={collegeOptions}
        selectedValue={pickCollege}
        onChange={(o) => setPickCollege(o?.value ?? null)}
        filterOption={collegeFilterOption}
        formatOptionLabel={formatCollegeOption}
        placeholder="All colleges"
        isClearable
        menuAtPageLevel
        hideValueWhileSearching
      />
      <Dropdown
        options={builderBranches.map((b) => ({
          value: b.id,
          label: b.name,
        }))}
        selectedValue={pickBranch}
        onChange={(o) => setPickBranch(o?.value ?? null)}
        placeholder="All branches"
        isClearable
        menuAtPageLevel
        hideValueWhileSearching
      />
      <Dropdown
        options={builderStates.map((st) => ({
          value: st,
          label: st,
        }))}
        selectedValue={pickState}
        onChange={(o) => setPickState(o?.value ?? null)}
        placeholder="All states"
        isClearable
        menuAtPageLevel
        hideValueWhileSearching
      />
    </>
  );
  // View: default (closing rank) or custom (the choice builder's order;
  // with no answers yet, choosing it opens the builder)
  const renderViewSelect = (tour) => (
    <label
      data-tour={tour}
      className="flex items-center gap-1.5 whitespace-nowrap font-semibold"
    >
      View
      <select
        value={sortConfig?.key === "choice" ? "custom" : "default"}
        onChange={(e) => {
          if (e.target.value === "default")
            setSortConfig({ key: rankColumnKey, order: "asc" });
          else if (choicePrefs) setSortConfig({ key: "choice", order: "asc" });
          else setBuilderOpen(true);
        }}
        className="rounded-lg border border-[#d8c7c1] bg-white px-1 py-0.5 text-xs font-bold text-[#2f2320] focus:border-[#B52326] focus:outline-none sm:px-2 sm:py-1 sm:text-sm"
      >
        <option value="default">Default</option>
        <option value="custom">Custom</option>
      </select>
    </label>
  );
  // Phones: every filter (exam, college, branch, state) sits in one window
  // behind a "Filter this table" button, to keep the page short
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters =
    (josaaCollegeGroup !== "all" ? 1 : 0) +
    (pickCollege ? 1 : 0) +
    (pickBranch ? 1 : 0) +
    (pickState ? 1 : 0);
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setFiltersOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen]);

  const renderJosaaCollegeGroupToggle = () => {
    if (!showJosaaCollegeGroupToggle) return null;

    const options = [
      {
        value: "all",
        label: "All colleges",
        detail: "JEE Main and Advanced",
        count: searchedDataExamCounts.main + searchedDataExamCounts.advanced,
      },
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
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
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
      {supportsCompare && (
        // students didn't notice Compare in the Pune review: the column
        // wears the brand red header and a rose tint, in the site's palette
        <th
          data-tour="compare-head"
          className="whitespace-nowrap border-b border-[#9E1F22] bg-[#B52326] px-3 py-3 text-center text-white"
        >
          Compare
        </th>
      )}
      {predicted_colleges_table_column.map((column) => (
        <th
          key={column.key}
          data-tour={
            supportsSalarySort && column.key === rankColumnKey
              ? "sort-first"
              : supportsSalarySort && column.key === salaryColumnKey
              ? "sort-last"
              : undefined
          }
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
    const rowsToRender = displayData.slice(0, rowLimit);

    return rowsToRender.map((item, index) => {
      const transformedItem = transformData(item);
      const rowKey = getRowKey(transformedItem, index);

      return (
        <React.Fragment key={rowKey}>
          <tr
            className={`${commonCellClass} ${
              index % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
            }`}
          >
            {supportsCompare && (
              <td
                data-tour={
                  index === Math.min(4, rowsToRender.length - 1)
                    ? "compare-end"
                    : undefined
                }
                className="border-r border-[#f0cfca] bg-[#fbeae8] px-3 py-3 text-center align-top"
              >
                {compareIdOf(transformedItem) ? (
                  <input
                    type="checkbox"
                    aria-label={`Compare ${transformedItem.institute}`}
                    checked={compareSel.some(
                      (x) => x.key === compareKeyOf(transformedItem)
                    )}
                    disabled={
                      compareSel.length >= 3 &&
                      !compareSel.some(
                        (x) => x.key === compareKeyOf(transformedItem)
                      )
                    }
                    title={
                      compareSel.length >= 3 &&
                      !compareSel.some(
                        (x) => x.key === compareKeyOf(transformedItem)
                      )
                        ? "3 picked already — untick one first"
                        : "Pick to compare"
                    }
                    onChange={() => toggleCompare(transformedItem)}
                    className="h-5 w-5 cursor-pointer accent-[#B52326] disabled:cursor-not-allowed disabled:opacity-30"
                  />
                ) : null}
              </td>
            )}
            {predicted_colleges_table_column.map((column) => (
              <td key={column.key} className="px-4 py-3 align-top">
                {INSTITUTE_KEYS.has(column.key) &&
                ((isJosaaExam && transformedItem["College ID"]) ||
                  (NAME_LINK_EXAMS.has(exam) &&
                    canLinkRow(transformedItem))) ? (
                  <Link
                    href={`/colleges?q=${encodeURIComponent(
                      linkNameOf(transformedItem)
                    )}`}
                    className="underline decoration-[#e3d1cb] underline-offset-2 transition hover:text-[#8f2e31] hover:decoration-[#8f2e31]"
                  >
                    {getDisplayValue(column, transformedItem)}
                  </Link>
                ) : column.key === "Category" &&
                  transformedItem["Category Label"] &&
                  transformedItem["Category Label"] !==
                    transformedItem["Category"] ? (
                  <span
                    title={transformedItem["Category Label"]}
                    className="cursor-help underline decoration-dotted decoration-[#d8c7c1] underline-offset-2"
                  >
                    {getDisplayValue(column, transformedItem)}
                  </span>
                ) : (
                  getDisplayValue(column, transformedItem)
                )}
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

    // A legend may be a function of the visible rows, so an exam can drop notes
    // that do not apply to what the student actually picked. GUJCET needs it:
    // its ACPC merit-rank note is meaningless on the Medical tab, which is
    // ranked on NEET.
    const legendItems =
      typeof examConfig.legend === "function"
        ? examConfig.legend(data?.[0] ?? null) || []
        : examConfig.legend;
    if (!legendItems.length) return null;

    // the combined JoSAA list says this inside its FAQ instead
    if (isCombinedJosaaExam) return null;
    if (isJosaaExam) {
      return (
        // the rows' closing ranks are JoSAA 2025 round 5 (checked against
        // public/data/JEE/josaa_2025_all_rounds.json)
        <p className="mb-4 text-sm text-[#6d5550]">
          Based on JoSAA 2025 round 5 cutoffs
        </p>
      );
    }

    // The data year now sits under the result count, next to the number it
    // qualifies — see the "Showing N matching options" block below.
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#5b3a34]">
        <span className="font-semibold text-[#5b1f20]">Note:</span>
        {legendItems.map((item, index) => (
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
          {/* phones: in the "Filter this table" window instead */}
          <div className={isCombinedJosaaExam ? "hidden sm:block" : ""}>
            {renderJosaaCollegeGroupToggle()}
          </div>
          {renderNeetSeatTabs()}
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            {isCombinedJosaaExam && (
              <div className="hidden w-full gap-3 sm:grid sm:grid-cols-3 xl:max-w-4xl">
                {renderTableDropdowns()}
              </div>
            )}
            {onSearchChange && !isCombinedJosaaExam && (
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
              {/* Wrapped so the year line stacks UNDER the count instead of
                  becoming a third flex sibling beside it on sm+ screens.
                  (main's layout fix, kept.) */}
              <div className={isCombinedJosaaExam ? "hidden" : ""}>
                <p className="text-sm text-[#5b3a34]">
                  Showing{" "}
                  {(displayData.length > rowLimit
                    ? `${rowLimit.toLocaleString(
                        "en-IN"
                      )} of ${displayData.length.toLocaleString("en-IN")}`
                    : displayData.length.toLocaleString("en-IN")) + " "}
                  {showJosaaCollegeGroupToggle
                    ? josaaCollegeGroup === "advanced"
                      ? "JEE Advanced college options."
                      : josaaCollegeGroup === "all"
                      ? "college options (JEE Main and Advanced)."
                      : "JEE Main college options."
                    : isNeet
                    ? neetSeatTab === "home"
                      ? "home-state seats."
                      : "All India Quota seats."
                    : "matching options."}
                </p>
                {/* Year + round caption. NEET states the round too, because round depth is not
                    comparable across states; other exams show the year alone. Both read the data
                    rather than hardcoding a year, so they self-correct for the next cycle. */}
                {isNeet && neetRoundNote ? (
                  <p className="mt-1 text-xs text-[#6d5550]">
                    Cutoffs from: {neetRoundNote}
                  </p>
                ) : (
                  displayData[0]?.["Year"] && (
                    <p className="mt-1 text-xs text-[#6d5550]">
                      Based on {displayData[0]["Year"]} cutoffs
                      {displayData[0]["Round"] ? " (all rounds)" : ""}
                    </p>
                  )
                )}
              </div>
              {displayData.length > 0 && !isCombinedJosaaExam && (
                <button
                  type="button"
                  className="inline-flex w-auto items-center gap-1.5 self-start rounded-lg bg-[#B52326] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#9E1F22]"
                  onClick={downloadCsv}
                >
                  <Download size={15} />
                  Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {isCombinedJosaaExam && fullData.length > 0 && (
        <>
          {/* phones: View on its own line, centred */}
          <div className="mb-2 flex justify-center text-xs text-[#2f2320] sm:hidden">
            {renderViewSelect("view-toggle")}
          </div>
          {/* "[50] entries" left; right: View (desktop), Filter (phones) and
              Download. Phones: stuck to the top while scrolling. */}
          <div className="sticky top-0 z-30 -mx-1 mb-3 flex items-center justify-between gap-2 bg-white px-1 py-2 text-xs text-[#2f2320] sm:static sm:mx-0 sm:mb-4 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm">
            <label className="flex items-center gap-1 whitespace-nowrap sm:gap-1.5">
              <select
                value={pageSize === Infinity ? "all" : pageSize}
                onChange={(e) =>
                  setPageSize(
                    e.target.value === "all" ? Infinity : +e.target.value
                  )
                }
                className="rounded-lg border border-[#d8c7c1] bg-white px-1 py-0.5 text-xs font-bold text-[#2f2320] focus:border-[#B52326] focus:outline-none sm:px-2 sm:py-1.5 sm:text-sm"
              >
                {[25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
                <option value="all">all</option>
              </select>
              entries
            </label>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block">
                {renderViewSelect("view-toggle-desktop")}
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="flex flex-none items-center gap-1 whitespace-nowrap rounded-lg border-[1.5px] border-[#B52326] bg-[#fbeeec] px-2.5 py-1 text-xs font-extrabold text-[#B52326] sm:hidden"
              >
                <SlidersHorizontal size={14} />
                Filter
                {activeFilters > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#B52326] px-1 text-[10px] text-white">
                    {activeFilters}
                  </span>
                )}
              </button>
              {displayData.length > 0 && (
                <button
                  type="button"
                  onClick={downloadCsv}
                  className="inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-lg border-[1.5px] border-[#B52326] bg-[#B52326] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#9E1F22] sm:gap-1.5 sm:py-1.5 sm:text-sm"
                >
                  <Download size={14} />
                  Download
                </button>
              )}
            </div>
          </div>
        </>
      )}
      {filtersOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(36,18,14,.55)] sm:hidden"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter this table"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full flex-col rounded-t-[20px] bg-white p-5 text-left shadow-[0_24px_56px_rgba(74,42,38,.16)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Lato',sans-serif] text-xl font-black text-[#2f2320]">
                Filter this table
              </h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-[#7a635d] hover:bg-[#f3dcd8]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              {renderJosaaCollegeGroupToggle()}
              {renderTableDropdowns()}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={!activeFilters}
                onClick={() => {
                  setJosaaCollegeGroup("all");
                  setPickCollege(null);
                  setPickBranch(null);
                  setPickState(null);
                }}
                className="text-sm font-bold text-[#7a635d] hover:text-[#2f2320] disabled:opacity-40"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-[10px] bg-[#B52326] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#9E1F22]"
              >
                Show {displayData.length.toLocaleString("en-IN")} results
              </button>
            </div>
          </div>
        </div>
      )}
      {isCombinedJosaaExam && fullData.length > 0 && !builderOpen && (
        // sticky CTA: lifts above the compare bar when that is showing
        <div
          className={`fixed right-4 z-40 sm:right-6 ${
            compareSel.length > 0 ? "bottom-24" : "bottom-5"
          }`}
        >
          <button
            type="button"
            data-tour="choice-cta"
            onClick={() => setBuilderOpen(true)}
            className="rounded-full bg-[#B52326] px-5 py-3 text-sm font-extrabold text-white shadow-[0_10px_28px_rgba(74,42,38,.25)] transition hover:-translate-y-px hover:bg-[#9E1F22] sm:text-base"
          >
            Help me choose a college and course
          </button>
        </div>
      )}
      {builderOpen && (
        <ChoiceBuilder
          states={builderStates}
          branches={builderBranches}
          initial={choicePrefs}
          onDone={applyChoices}
          onClose={() => setBuilderOpen(false)}
        />
      )}
      {viewTip && !tour && (
        <CoachMarks
          steps={viewTipSteps}
          step={0}
          solo
          onNext={closeViewTip}
          onClose={closeViewTip}
        />
      )}
      {tour && (
        <CoachMarks
          steps={tourSteps}
          step={tour.step}
          solo={tour.solo}
          onNext={() => setTour((t) => ({ ...t, step: t.step + 1 }))}
          onClose={closeTour}
          clipTo={tableScrollRef}
        />
      )}
      {displayData.length > 0 ? (
        <div
          ref={tableScrollRef}
          onScroll={onTableScroll}
          className="overflow-x-auto rounded-xl border border-[#eaded8] bg-white shadow-sm"
        >
          {supportsCompare && compareSel.length > 0 ? (
            <div className="fixed bottom-5 left-1/2 z-40 flex w-max max-w-[95vw] -translate-x-1/2 items-center gap-4 rounded-full border border-[#eaded8] bg-white px-6 py-3.5 text-base shadow-lg">
              <span className="whitespace-nowrap font-semibold text-[#5b3a34]">
                {compareSel.length} of 3 picked
              </span>
              {compareSel.length >= 2 ? (
                <Link
                  href={`/compare?o=${compareSel
                    .map(
                      (x) =>
                        `${x.cid}~${String(x.program)
                          // greedy .* so nested parens strip too — dual-degree
                          // strings end "(5 Years, B.Tech and M.Tech (Dual
                          // Degree))" and [^)]* stopped at the inner ")"
                          .replace(/\s*\(\d+\s*Years?,.*\)$/, "")
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "")}`
                    )
                    .join(",")}`}
                  className="inline-flex items-center whitespace-nowrap rounded-full bg-[#B52326] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#9E1F22]"
                >
                  Compare {compareSel.length} colleges →
                </Link>
              ) : (
                <span className="whitespace-nowrap text-sm text-[#7a635d]">
                  Pick one more to compare
                </span>
              )}
              <button
                type="button"
                onClick={() => setCompareSel([])}
                className="text-sm text-[#7a635d] underline hover:text-[#B52326]"
              >
                Clear
              </button>
            </div>
          ) : null}
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
      {displayData.length > rowLimit &&
        !isCombinedJosaaExam && ( // the combined list has its own selector
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
  isFullList: PropTypes.bool,
  mainRank: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  advRank: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  data: PropTypes.arrayOf(
    PropTypes.shape({
      "Institute ID": PropTypes.string, // For TNEA
      Institute: PropTypes.string.isRequired,
      Course: PropTypes.string, // TNEA-specific
      Category: PropTypes.string, // JoSAA rows carry Seat Type instead
      "Cutoff Marks": PropTypes.string, // TNEA-specific
      "Institute Type": PropTypes.string, // TNEA-specific
      State: PropTypes.string,
      "Academic Program Name": PropTypes.string,
      "Closing Rank": PropTypes.string,
      Quota: PropTypes.string,
      "Opening Rank": PropTypes.string,
      "College Type": PropTypes.string,
      "Management Type": PropTypes.string,
      "Median Salary": PropTypes.number,
      "Placed %": PropTypes.number,
      "NIRF Rank": PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
  fullData: PropTypes.array,
  exam: PropTypes.string.isRequired,
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func,
};

export default PredictedCollegesTable;

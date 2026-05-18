import path from "path";

/**
 * @fileoverview Exam configuration objects for AF Futures College Predictor.
 *
 * This file is the single source of truth that drives both the student-facing
 * form UI (index.js) and the server-side filter logic (pages/api/exam-result.js).
 *
 * Each config object follows the {@link ExamConfig} shape. Adding a new exam
 * requires only:
 *  1. Creating a new config object here.
 *  2. Adding a JSON data file under public/data/<EXAM>/.
 *  3. Registering the config in the {@link examConfigs} map at the bottom.
 *
 * Supported exams: JoSAA, JEE Main-JOSAA, JEE Main-JAC, JEE Advanced,
 * NEETUG, MHT CET, KCET, TNEA, TGEAPCET, GUJCET.
 *
 * @example
 * // Example API call for JEE Main-JOSAA
 * // GET /api/exam-result?exam=JEE%20Main&gender=Female-only%20(including%20Supernumerary)&homeState=Karnataka&category=obc_ncl
 */

// ─────────────────────────────────────────────────────────────
// Type Definitions (JSDoc)
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SelectOption
 * @property {string} value - The value sent to the API as a query parameter.
 * @property {string} label - The human-readable label shown in the dropdown UI.
 */

/**
 * @typedef {Object} NumberInputConfig
 * @property {string} label       - Label text shown above the input field.
 * @property {string} placeholder - Placeholder text shown inside the input.
 * @property {"number"} inputType - Always "number" for numeric inputs.
 * @property {string} step        - Step size ("1" for integers, "0.01" for decimals).
 * @property {string} min         - Minimum allowed value as a string.
 * @property {string} [max]       - Maximum allowed value (optional, e.g. "100" for percentile).
 * @property {boolean} allowDecimal - Whether decimal input is permitted.
 */

/**
 * @typedef {Object} FormField
 * @property {string} name                    - Query parameter name sent to the API.
 * @property {string} label                   - Human-readable label rendered in the form.
 * @property {Array<string|SelectOption>} options - Dropdown options. Strings are used
 *   directly as both value and label; objects allow separate value/label pairs.
 */

/**
 * @typedef {Object} LegendEntry
 * @property {string} key   - Short quota code shown in results (e.g. "AI", "HS", "OS").
 * @property {string} value - Full description shown in the legend tooltip (e.g. "All India").
 */

/**
 * @typedef {Object} ExamConfig
 * @property {string}            name             - Display name of the exam (shown in UI).
 * @property {string}            [code]           - Internal exam code matched against JSON data
 *                                                  (e.g. item.Exam === query.code). Omitted for
 *                                                  exams where filtering uses other keys.
 * @property {string[]}          searchKeys       - JSON data keys used by the fuzzy search bar
 *                                                  (fuse.js). Typically ["Institute", "State",
 *                                                  "Academic Program Name"].
 * @property {NumberInputConfig} primaryInput     - Config for the main rank/score input field.
 * @property {FormField[]}       fields           - Ordered list of dropdown fields rendered
 *                                                  in the prediction form.
 * @property {LegendEntry[]}     [legend]         - Quota code definitions shown below results.
 *                                                  Omitted for exams without quota columns.
 * @property {function(string): string} getDataPath - Returns the absolute path to the JSON
 *                                                  data file. Receives `category` (the selected
 *                                                  category value) as its argument. Uses
 *                                                  `path.join(process.cwd(), ...)` to resolve
 *                                                  relative to the Next.js project root.
 * @property {function(Object): Array<function>} getFilters - Returns an array of predicate
 *                                                  functions applied to each JSON row. Each
 *                                                  predicate receives a data row object and
 *                                                  returns true if the row should be included.
 *                                                  Receives the full API query object as input.
 * @property {function(): Array} [getSort]        - Optional. Returns a sort specification
 *                                                  array (e.g. [["Closing Rank", "ASC"]]).
 *                                                  If omitted, results are returned unsorted.
 */

// ─────────────────────────────────────────────────────────────
// Shared Data
// ─────────────────────────────────────────────────────────────

/**
 * Complete list of Indian states and union territories.
 * Used as the `options` array for "Select Your Home State" fields
 * across JEE Main-JOSAA, JEE Advanced, and JoSAA configs.
 *
 * @type {string[]}
 */
export const statesList = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

/**
 * Default fuse.js search keys shared by most exam configs.
 * Used to power the fuzzy search bar on the results page.
 *
 * @type {string[]}
 */
const defaultSearchKeys = ["Institute", "State", "Academic Program Name"];

// ─────────────────────────────────────────────────────────────
// Input Factory Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Creates a {@link NumberInputConfig} for whole-number rank inputs.
 *
 * @param {string} label       - Label text shown above the input.
 * @param {string} [placeholder=label] - Placeholder text (defaults to label).
 * @returns {NumberInputConfig}
 *
 * @example
 * integerInput("Enter JEE Main Category Rank", "Enter JEE Main category rank")
 * // → { label, placeholder, inputType: "number", step: "1", min: "1", allowDecimal: false }
 */
const integerInput = (label, placeholder = label) => ({
  label,
  placeholder,
  inputType: "number",
  step: "1",
  min: "1",
  allowDecimal: false,
});

/**
 * Creates a {@link NumberInputConfig} for decimal score/percentage inputs.
 * Used by GUJCET (percentage score) and JoSAA (percentile estimate).
 *
 * @param {string} label       - Label text shown above the input.
 * @param {string} placeholder - Placeholder text (e.g. "e.g., 78.45").
 * @param {string} [max="100"] - Maximum allowed value string.
 * @returns {NumberInputConfig}
 *
 * @example
 * decimalInput("Enter Percentage Score", "e.g., 78.45")
 * // → { label, placeholder, inputType: "number", step: "0.01", min: "0", max: "100", allowDecimal: true }
 */
const decimalInput = (label, placeholder, max = "100") => ({
  label,
  placeholder,
  inputType: "number",
  step: "0.01",
  min: "0",
  max,
  allowDecimal: true,
});

// ─────────────────────────────────────────────────────────────
// Exam Configurations
// ─────────────────────────────────────────────────────────────

/**
 * Configuration for JEE Main via JOSAA counselling.
 *
 * Data file: public/data/JEE/<category>.json (one file per category, e.g. obc_ncl.json)
 * Quota logic: Always includes AI (All India) quota rows. For HS/OS quota,
 *   matches based on whether the student's homeState matches item.State.
 * Program filter: Separates Engineering / Architecture / Planning by checking
 *   the "Academic Program Name" field for keywords.
 *
 * @type {ExamConfig}
 */
export const jeeMainJosaaConfig = {
  name: "JEE Main-JOSAA",
  code: "JEE Main",
  searchKeys: defaultSearchKeys,
  primaryInput: integerInput(
    "Enter JEE Main Category Rank",
    "Enter JEE Main category rank"
  ),
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "ews", label: "EWS" },
        { value: "ews_pwd", label: "EWS (PwD)" },
        { value: "obc_ncl", label: "OBC-NCL" },
        { value: "obc_ncl_pwd", label: "OBC-NCL (PwD)" },
        { value: "open", label: "OPEN" },
        { value: "open_pwd", label: "OPEN (PwD)" },
        { value: "sc", label: "SC" },
        { value: "sc_pwd", label: "SC (PwD)" },
        { value: "st", label: "ST" },
        { value: "st_pwd", label: "ST (PwD)" },
      ],
    },
    // Round number filter is commented out — data currently uses final closing ranks only.
    // Uncomment and add round data to re-enable per-round filtering.
    // {
    //   name: "roundNumber",
    //   label: "Select Round Number",
    //   options: ["1", "2", "3", "4", "5", "6"],
    // },
    {
      name: "gender",
      label: "Select Gender",
      options: ["Gender-Neutral", "Female-only (including Supernumerary)"],
    },
    {
      name: "program",
      label: "Select Program",
      options: [
        { value: "engineering", label: "Engineering" },
        { value: "architecture", label: "Architecture" },
        { value: "planning", label: "Planning" },
      ],
    },
    {
      name: "homeState",
      label: "Select Your Home State",
      options: statesList,
    },
  ],
  /**
   * Quota legend for JEE Main-JOSAA results table.
   * AI = All India seats open to all students regardless of home state.
   * HS = Home State quota (50% of NIT seats reserved for home state candidates).
   * OS = Out of State quota (remaining NIT seats for non-home-state candidates).
   */
  legend: [
    { key: "AI", value: "All India" },
    { key: "HS", value: "Home State" },
    { key: "OS", value: "Out of State" },
  ],
  /**
   * Returns the path to the category-specific JSON data file.
   *
   * @param {string} category - Selected category value (e.g. "obc_ncl", "open").
   * @returns {string} Absolute path to public/data/JEE/<category>.json
   */
  getDataPath: (category) => {
    return path.join(process.cwd(), "public", "data", "JEE", `${category}.json`);
  },
  /**
   * Returns filter predicates for JEE Main-JOSAA results.
   *
   * Filters applied:
   *  1. item.Exam must match config code ("JEE Main")
   *  2. item.Gender must match selected gender
   *  3. Academic Program Name filtered by engineering/architecture/planning keyword
   *  4. Quota logic: AI rows always included; HS/OS matched against homeState
   *
   * @param {Object} query              - Parsed API query parameters.
   * @param {string} query.code         - Exam code ("JEE Main").
   * @param {string} query.gender       - Selected gender value.
   * @param {string} query.program      - Selected program ("engineering"|"architecture"|"planning").
   * @param {string} query.homeState    - Student's home state.
   * @returns {Array<function(Object): boolean>}
   */
  getFilters: (query) => {
    const normalizedProgram = String(query.program || "").toLowerCase();
    const baseFilters = [
      (item) => item.Exam === query.code,
      (item) => item.Gender === query.gender,
      (item) => {
        if (normalizedProgram === "architecture") {
          return item["Academic Program Name"].toLowerCase().includes("architecture");
        } else if (normalizedProgram === "planning") {
          return item["Academic Program Name"].toLowerCase().includes("planning");
        } else {
          return (
            !item["Academic Program Name"].toLowerCase().includes("architecture") &&
            !item["Academic Program Name"].toLowerCase().includes("planning")
          );
        }
      },
    ];

    return [
      ...baseFilters,
      (item) => {
        if (item.Quota === "AI") return true;
        if (query.homeState === item.State) return item.Quota === "HS";
        return item.Quota === "OS";
      },
    ];
  },
};

/**
 * Configuration for JEE Main via JAC (Joint Admission Counselling) Delhi.
 *
 * Data file: public/data/JEE/jac_data.json (single file, all categories)
 * Note: Uses All India Rank (not category rank) as the primary input.
 * Unique fields: isPWD, isDefenseWard — used directly as item.PWD and item.Defense filters.
 * Closing rank buffer: 10% (closingRank >= 0.9 * userRank).
 *
 * @type {ExamConfig}
 */
export const jacExamConfig = {
  code: "JEE Main",
  name: "JEE Main-JAC",
  searchKeys: defaultSearchKeys,
  primaryInput: integerInput("Enter All India Rank", "Enter All India Rank"),
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "ews", label: "EWS" },
        { value: "kashmiri_minority", label: "Kashmiri Minority" },
        { value: "obc", label: "OBC" },
        { value: "general", label: "General" },
        { value: "st", label: "ST" },
        { value: "sc", label: "SC" },
      ],
    },
    {
      name: "gender",
      label: "Select Gender",
      options: ["Gender-Neutral", "Female-Only"],
    },
    {
      name: "homeState",
      label: "Select Your Home State",
      options: ["Delhi", "Outside Delhi"],
    },
    {
      name: "isPWD",
      label: "Are you a PWD Student?",
      options: ["Yes", "No"],
    },
    {
      name: "isDefenseWard",
      label: "Are you a Defense Ward Student?",
      options: [
        { value: "No", label: "No" },
        { value: "Yes", label: "Yes" },
      ],
    },
  ],
  /**
   * JAC quota legend.
   * D  = Delhi domicile seats.
   * OD = Outside Delhi seats.
   */
  legend: [
    { key: "D", value: "Delhi" },
    { key: "OD", value: "Outside Delhi" },
  ],
  /**
   * Returns path to the single JAC data file (not split by category).
   *
   * @returns {string} Absolute path to public/data/JEE/jac_data.json
   */
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "JEE", "jac_data.json");
  },
  /**
   * Returns filter predicates for JAC results.
   * Unlike JoSAA/JEE Main, all filters are direct equality checks.
   * Rank buffer: closing rank must be ≥ 90% of the user's rank.
   *
   * @param {Object} query               - Parsed API query parameters.
   * @param {string} query.homeState     - "Delhi" or "Outside Delhi".
   * @param {string} query.category      - Selected category value.
   * @param {string} query.isDefenseWard - "Yes" or "No".
   * @param {string} query.isPWD         - "Yes" or "No".
   * @param {string} query.gender        - Selected gender value.
   * @param {string} query.rank          - Student's All India Rank as a string.
   * @returns {Array<function(Object): boolean>}
   */
  getFilters: (query) => [
    (item) => item.State === query.homeState,
    (item) => item.Category === query.category,
    (item) => item.Defense === query.isDefenseWard,
    (item) => item.PWD === query.isPWD,
    (item) => item.Gender === query.gender,
    (item) => parseInt(item["Closing Rank"], 10) > 0.9 * parseInt(query.rank, 10),
  ],
  getSort: () => [["Closing Rank", "ASC"]],
};

/**
 * Configuration for JEE Advanced (IIT admissions via JOSAA).
 *
 * Data file: public/data/JEE/<category>.json (shared with JEE Main-JOSAA)
 * Filtered from the same files using item.Exam === "JEE Advanced".
 * No program filter (Architecture/Planning not applicable for JEE Advanced).
 *
 * @type {ExamConfig}
 */
export const jeeAdvancedConfig = {
  name: "JEE Advanced",
  code: "JEE Advanced",
  searchKeys: defaultSearchKeys,
  primaryInput: integerInput(
    "Enter JEE Advanced Category Rank",
    "Enter JEE Advanced category rank"
  ),
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "ews", label: "EWS" },
        { value: "ews_pwd", label: "EWS (PwD)" },
        { value: "obc_ncl", label: "OBC-NCL" },
        { value: "obc_ncl_pwd", label: "OBC-NCL (PwD)" },
        { value: "open", label: "OPEN" },
        { value: "open_pwd", label: "OPEN (PwD)" },
        { value: "sc", label: "SC" },
        { value: "sc_pwd", label: "SC (PwD)" },
        { value: "st", label: "ST" },
        { value: "st_pwd", label: "ST (PwD)" },
      ],
    },
    {
      name: "gender",
      label: "Select Gender",
      options: ["Gender-Neutral", "Female-only (including Supernumerary)"],
    },
    {
      name: "homeState",
      label: "Select Your Home State",
      options: statesList,
    },
  ],
  legend: [
    { key: "AI", value: "All India" },
    { key: "HS", value: "Home State" },
    { key: "OS", value: "Out of State" },
  ],
  /**
   * @param {string} category - Selected category value.
   * @returns {string} Absolute path to public/data/JEE/<category>.json
   */
  getDataPath: (category) => {
    return path.join(process.cwd(), "public", "data", "JEE", `${category}.json`);
  },
  /**
   * Returns filter predicates for JEE Advanced results.
   * Identical quota logic to JEE Main-JOSAA but without the program filter.
   *
   * @param {Object} query           - Parsed API query parameters.
   * @param {string} query.code      - "JEE Advanced".
   * @param {string} query.gender    - Selected gender value.
   * @param {string} query.homeState - Student's home state.
   * @returns {Array<function(Object): boolean>}
   */
  getFilters: (query) => {
    const baseFilters = [
      (item) => item.Exam === query.code,
      (item) => item.Gender === query.gender,
    ];

    return [
      ...baseFilters,
      (item) => {
        if (item.Quota === "AI") return true;
        if (query.homeState === item.State) return item.Quota === "HS";
        return item.Quota === "OS";
      },
    ];
  },
};

/**
 * Valid seat type options for NEET UG.
 * Covers All India quota, state quota, institutional quotas (AMU, Jamia),
 * minority quotas, NRI, and nursing-specific seats.
 *
 * @type {string[]}
 */
const neetUgSeatTypeOptions = [
  "Any",
  "All India",
  "Open Seat",
  "Deemed/Paid Seats",
  "Delhi University",
  "IP University",
  "Delhi NCR Children/Widows of Personnel of the Armed Forces (CW)",
  "Aligarh Muslim University (AMU)",
  "Jamia Internal",
  "Jain Minority",
  "Muslim",
  "Muslim Minority",
  "Muslim OBC",
  "Muslim ST",
  "Muslim Women",
  "Employees State Insurance Scheme(ESI)",
  "Employees State Insurance Scheme Nursing",
  "Internal -Puducherry UT Domicile",
  "Non-Resident Indian",
  "Non-Resident Indian(AMU)",
  "Foreign Country",
  "B.Sc Nursing All India",
  "B.Sc Nursing Delhi NCR",
  "B.Sc Nursing Delhi NCR CW",
];

/**
 * Configuration for NEET UG (Medical undergraduate admissions).
 *
 * Data file: public/data/NEETUG/NEETUG.json (single file, all categories)
 * Rank buffer: closing rank must be ≥ 90% of the user's rank.
 * Gender logic: "Female" gender shows both Female and Open gender rows
 *   (female students are eligible for gender-neutral seats too).
 * Normalization: All string comparisons use normalize() to handle
 *   special characters and case differences in the raw data.
 *
 * @type {ExamConfig}
 */
export const neetUGConfig = {
  name: "NEETUG",
  code: "NEETUG",
  searchKeys: defaultSearchKeys,
  primaryInput: integerInput("Enter All India Rank", "Enter All India Rank"),
  fields: [
    {
      name: "program",
      label: "Select Program",
      options: [
        { value: "MBBS", label: "MBBS" },
        { value: "BDS", label: "BDS" },
        { value: "BSC Nursing", label: "BSC Nursing" },
      ],
    },
    {
      name: "gender",
      label: "Select Gender",
      options: [
        { value: "Open", label: "Open" },
        { value: "Female", label: "Female" },
      ],
    },
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "EWS", label: "EWS" },
        { value: "EWS PwD", label: "EWS PwD" },
        { value: "Open", label: "Open" },
        { value: "Open PwD", label: "Open PwD" },
        { value: "OBC", label: "OBC" },
        { value: "OBC PwD", label: "OBC PwD" },
        { value: "SC", label: "SC" },
        { value: "SC PwD", label: "SC PwD" },
        { value: "ST", label: "ST" },
        { value: "ST PwD", label: "ST PwD" },
      ],
    },
    {
      name: "seat_type",
      label: "Seat Type / Quota",
      options: neetUgSeatTypeOptions,
    },
  ],
  legend: [
    { key: "AI", value: "All India" },
    { key: "SQ", value: "State Quota" },
  ],
  /**
   * @returns {string} Absolute path to public/data/NEETUG/NEETUG.json
   */
  getDataPath: () => {
    return path.join(process.cwd(), "public/data/NEETUG/NEETUG.json");
  },
  /**
   * Returns filter predicates for NEET UG results.
   *
   * All string comparisons are normalized (lowercase, alphanumeric only)
   * to handle inconsistencies in the raw NEET data (e.g. "B.Sc Nursing"
   * vs "BSC Nursing").
   *
   * Filters applied in order:
   *  1. Program match (MBBS / BDS / BSC Nursing)
   *  2. Gender match (Female shows Female + Open rows)
   *  3. Category match
   *  4. Seat type match ("Any" skips this filter)
   *  5. Rank buffer: closingRank >= 0.9 * userRank
   *
   * @param {Object} query              - Parsed API query parameters.
   * @param {string} query.program      - "MBBS" | "BDS" | "BSC Nursing".
   * @param {string} query.gender       - "Open" | "Female".
   * @param {string} query.category     - Selected category value.
   * @param {string} query.seat_type    - Selected seat type (or "Any").
   * @param {string} query.rank         - Student's All India Rank as a string.
   * @returns {Array<function(Object): boolean>}
   */
  getFilters: (query) => {
    const normalize = (str) =>
      String(str || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const selectedSeatType = query.seat_type;
    return [
      (item) => {
        if (query.program) {
          return normalize(item["Academic Program Name"]) === normalize(query.program);
        }
        return true;
      },
      (item) => {
        if (query.gender === "Open") {
          return item["Gender"] === "Open" || item.gender === "Open";
        } else if (query.gender === "Female") {
          return (
            item["Gender"] === "Female" ||
            item["Gender"] === "Open" ||
            item.gender === "Female" ||
            item.gender === "Open"
          );
        }
        return true;
      },
      (item) => {
        if (query.category) {
          return normalize(item["Category"]) === normalize(query.category);
        }
        return true;
      },
      (item) => {
        if (selectedSeatType && normalize(selectedSeatType) !== normalize("Any")) {
          return normalize(item["Seat Type"]) === normalize(selectedSeatType);
        }
        return true;
      },
      (item) => {
        if (query.rank) {
          const closingRank = parseInt(item["Closing Rank"], 10);
          const userRank = parseInt(query.rank, 10);
          if (!isNaN(closingRank) && !isNaN(userRank)) {
            return closingRank >= 0.9 * userRank;
          }
        }
        return true;
      },
    ];
  },
  getSort: () => [["Closing Rank", "ASC"]],
};

/**
 * Configuration for MHT CET (Maharashtra state engineering admissions).
 *
 * Data file: public/data/MHTCET/mhtcet_data.json
 * Note: No rank buffer — closing rank must be ≥ user's exact rank (not 0.9x).
 * Maharashtra-specific categories: VJ, NT, Religious Minority, Orphan.
 *
 * @type {ExamConfig}
 */
export const mhtCetConfig = {
  name: "MHT CET",
  apiEndpoint: "mhtcet",
  searchKeys: defaultSearchKeys,
  primaryInput: integerInput("Enter MHT CET Rank", "Enter MHT CET rank"),
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "OBC", label: "OBC" },
        { value: "SC", label: "SC" },
        { value: "ST", label: "ST" },
        { value: "Open", label: "Open" },
        { value: "Religious Minority", label: "Religious Minority" },
        { value: "EWS", label: "EWS" },
        { value: "VJ", label: "VJ" },
        { value: "NT", label: "NT" },
        { value: "Orphan", label: "Orphan" },
      ],
    },
    {
      name: "gender",
      label: "Select Gender",
      options: [
        { value: "Gender-Neutral", label: "Gender-Neutral" },
        { value: "Female-Only", label: "Female-Only" },
      ],
    },
    {
      name: "homeState",
      label: "Select Your Home State",
      options: ["Maharashtra", "Other"],
    },
    {
      name: "isPWD",
      label: "Are you a PWD Student?",
      options: [
        { value: "No", label: "No" },
        { value: "Yes", label: "Yes" },
      ],
    },
    {
      name: "isDefenseWard",
      label: "Are you a Defense Ward Student?",
      options: [
        { value: "No", label: "No" },
        { value: "Yes", label: "Yes" },
      ],
    },
  ],
  legend: [
    { key: "AI", value: "All India" },
    { key: "MH", value: "Maharashtra" },
  ],
  /**
   * @returns {string} Absolute path to public/data/MHTCET/mhtcet_data.json
   */
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "MHTCET", "mhtcet_data.json");
  },
  /**
   * Returns filter predicates for MHT CET results.
   * Note: rank filter uses exact threshold (closingRank >= userRank),
   * unlike JEE/NEET which use a 10% buffer.
   *
   * @param {Object} query               - Parsed API query parameters.
   * @param {string} query.category      - Selected category.
   * @param {string} query.gender        - Selected gender.
   * @param {string} query.homeState     - "Maharashtra" or "Other".
   * @param {string} query.isPWD         - "Yes" or "No".
   * @param {string} query.isDefenseWard - "Yes" or "No".
   * @param {string} query.rank          - Student's MHT CET rank as a string.
   * @returns {Array<function(Object): boolean>}
   */
  getFilters: (query) => [
    (item) => item.Category === query.category,
    (item) => item.Gender === query.gender,
    (item) => item.State === query.homeState,
    (item) => item.PWD === query.isPWD,
    (item) => item.Defense === query.isDefenseWard,
    (item) => {
      if (query.rank) {
        const closingRank = parseInt(item["Closing Rank"], 10);
        const userRank = parseInt(query.rank, 10);
        if (!isNaN(closingRank) && !isNaN(userRank)) {
          return closingRank >= userRank;
        }
      }
      return true;
    },
  ],
  getSort: () => [["Closing Rank", "ASC"]],
};

/**
 * Configuration for KCET (Karnataka Common Entrance Test).
 *
 * Data file: public/data/KCET/kcet_data.json
 * KCET-specific fields: language (Kannada medium preference), region (Rural/Urban),
 *   courseType (covers Medical/Dental, Agriculture, BNYS, Pharma, Engineering, Architecture).
 * Quota legend: HK = Hyderabad-Karnataka region, a special constitutional provision
 *   reserving seats for students from the HK region (Bidar, Kalaburagi, Raichur, Yadgir,
 *   Koppal, Bellary, Vijayanagara districts).
 *
 * @type {ExamConfig}
 */
export const kcetConfig = {
  name: "KCET",
  searchKeys: ["Institute", "State", "Academic Program Name"],
  primaryInput: integerInput("Enter KCET Rank", "Enter KCET rank"),
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "1", label: "1" },
        { value: "2A", label: "2A" },
        { value: "2B", label: "2B" },
        { value: "3A", label: "3A" },
        { value: "3B", label: "3B" },
        { value: "General", label: "General" },
        { value: "ST", label: "ST" },
        { value: "SC", label: "SC" },
      ],
    },
    {
      name: "courseType",
      label: "Select Course Type",
      options: [
        "Medical/Dental",
        "Agriculture",
        "BNYS",
        "Pharma",
        "Engineering",
        "Architecture",
      ],
    },
    {
      name: "homeState",
      label: "Select Your Home State",
      options: [
        { value: "All India", label: "All India" },
        { value: "Karnataka", label: "Karnataka" },
      ],
    },
    {
      name: "language",
      label: "Choose your Class 1 - Class 10 Language",
      options: [
        { value: "Any", label: "Any" },
        { value: "Kannada", label: "Kannada" },
      ],
    },
    {
      name: "region",
      label: "Choose Your Region",
      options: [
        { value: "Rural", label: "Rural" },
        { value: "All", label: "All" },
      ],
    },
  ],
  /**
   * KCET quota legend.
   * AI = All India seats.
   * KA = Karnataka domicile seats.
   * HK = Hyderabad-Karnataka region (constitutional reservation under Article 371(J)).
   */
  legend: [
    { key: "AI", value: "All India" },
    { key: "KA", value: "Karnataka" },
    { key: "HK", value: "Hyderabad-Karnataka Region" },
  ],
  /**
   * @returns {string} Absolute path to public/data/KCET/kcet_data.json
   */
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "KCET", "kcet_data.json");
  },
  /**
   * Returns filter predicates for KCET results.
   * Rank filter: closing rank must be ≥ user's exact rank (no buffer).
   * Rows with closing rank ≤ 0 are excluded (invalid data rows).
   *
   * @param {Object} query              - Parsed API query parameters.
   * @param {string} query.category     - KCET category code (e.g. "2A", "General").
   * @param {string} query.courseType   - Course type (e.g. "Engineering").
   * @param {string} query.homeState    - "All India" or "Karnataka".
   * @param {string} query.language     - "Any" or "Kannada".
   * @param {string} query.region       - "Rural" or "All".
   * @param {string} query.rank         - Student's KCET rank as a string.
   * @returns {Array<function(Object): boolean>}
   */
  getFilters: (query) => [
    (item) => item.Category === query.category,
    (item) => item["Course Type"] === query.courseType,
    (item) => item.State === query.homeState || item.State === "All India",
    (item) => query.language === "Any" || item.Language === query.language,
    (item) => query.region === "All" || item["Rural/Urban"] === query.region,
    (item) => {
      if (!query.rank) return true;
      const closingRank = parseInt(item["Closing Rank"], 10);
      const userRank = parseInt(query.rank, 10);
      if (isNaN(closingRank) || isNaN(userRank)) return false;
      if (closingRank <= 0) return false;
      return closingRank >= userRank;
    },
  ],
  getSort: () => [["Closing Rank", "ASC"]],
};

/**
 * Configuration for TNEA (Tamil Nadu Engineering Admissions).
 *
 * Data file: public/data/TNEA/tnea_data.json
 * Note: TNEA has no primaryInput (score-based, not rank-based — handled by
 *   TneaScoreCalculator.js component separately). No rank buffer filter.
 * Search keys differ from default: uses "Institute", "Course", "District".
 * District filter: "Any" skips the district filter entirely.
 *
 * @type {ExamConfig}
 */
export const tneaConfig = {
  name: "TNEA",
  searchKeys: ["Institute", "Course", "District"],
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "General/OC", label: "General/OC" },
        { value: "BC", label: "BC" },
        { value: "BCM", label: "BCM" },
        { value: "MBC", label: "MBC" },
        { value: "SC", label: "SC" },
        { value: "SCA", label: "SCA" },
        { value: "ST", label: "ST" },
        { value: "PwD", label: "PwD" },
        { value: "OBC", label: "OBC" },
      ],
    },
    {
      name: "courseType",
      label: "Select Course Type",
      options: [
        "Computer Science",
        "Electronics and Communications (ECE)",
        "Mechanical",
        "Electrical and Electronics (EEE)",
        "Civil",
        "Information Technology",
        "Biomedical",
        "Aerospace",
        "Automobile",
        "Robotics",
        "Electrical Engineering",
      ],
    },
    {
      name: "collegeType",
      label: "Select College Type",
      options: [
        "State Government",
        "Private Aided (Government Aided)",
        "Private Un-Aided",
        "University",
        "Any",
      ],
    },
    {
      name: "district",
      label: "Select District",
      options: [
        "Any", "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore",
        "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Hazaribagh",
        "Idukki", "Kancheepuram", "Kanniyakumari", "Karur", "Krishnagiri",
        "Madurai", "Mayiladuthurai", "Namakkal", "Perambalur", "Pudukkottai",
        "Ramanathapuram", "Salem", "Sivaganga", "Thanjavur", "Theni",
        "Thiruvallur", "Thiruvarur", "Thoothukkudi", "Tiruchirappalli",
        "Tirunelveli", "Tiruppur", "Tiruvannamalai", "Vellore", "Viluppuram",
        "Virudhunagar",
      ],
    },
  ],
  /**
   * @returns {string} Absolute path to public/data/TNEA/tnea_data.json
   */
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "TNEA", "tnea_data.json");
  },
  /**
   * Returns filter predicates for TNEA results.
   * No rank/score filter here — score filtering is handled upstream
   * by the TneaScoreCalculator component before this config is invoked.
   *
   * @param {Object} query              - Parsed API query parameters.
   * @param {string} query.category     - TNEA category (e.g. "BC", "MBC").
   * @param {string} query.courseType   - Course type (e.g. "Computer Science").
   * @param {string} query.district     - District name or "Any".
   * @param {string} query.collegeType  - College type or "Any".
   * @returns {Array<function(Object): boolean>}
   */
  getFilters: (query) => [
    (item) => item.Category === query.category,
    (item) => item.Course === query.courseType,
    (item) => item.District === query.district || "Any" === query.district,
    (item) => item["College Type"] === query.collegeType || "Any" === query.collegeType,
  ],
};

/**
 * Configuration for JoSAA (Joint Seat Allocation Authority).
 *
 * JoSAA is the combined counselling process for IITs (via JEE Advanced)
 * and NITs/IIITs/GFTIs (via JEE Main). It is the most complex config
 * because it accepts both a JEE Main rank and a JEE Advanced rank simultaneously.
 *
 * Data file: public/data/JEE/<category>.json (shared with JEE Main-JOSAA)
 * Special inputs:
 *   - estimateMarksInput: Allows rank estimation from JEE Main marks (0–300).
 *   - estimatePercentileInput: Allows rank estimation from percentile.
 *   - advancedInput: JEE Advanced rank with optional "P" suffix for preparatory course.
 *
 * Rank filter logic:
 *   - If only JEE Main rank provided: filters by mainRank with 10% buffer.
 *   - If JEE Advanced rank also provided: row passes if it matches EITHER rank filter
 *     (OR logic via examFilters.some()).
 *   - If no valid rank provided: returns no results (returns () => false).
 *
 * "P" suffix handling: JEE Advanced preparatory course ranks have a "P" suffix.
 *   The filter only matches "P" rows to "P" input and non-"P" rows to non-"P" input.
 *
 * @type {ExamConfig}
 */
export const josaaConfig = {
  name: "JoSAA",
  code: "JoSAA",
  searchKeys: defaultSearchKeys,
  primaryInput: integerInput(
    "Enter JEE Main Category Rank",
    "Enter JEE Main category rank"
  ),
  /** @type {Object} Optional marks-to-rank estimation input config */
  estimateMarksInput: {
    label: "Enter JEE Main marks out of 300",
    placeholder: "e.g., 182",
    min: "0",
    max: "300",
  },
  /** @type {NumberInputConfig} Optional percentile-to-rank estimation input config */
  estimatePercentileInput: decimalInput(
    "Enter JEE Main percentile",
    "e.g., 97.45"
  ),
  /** @type {Object} Optional JEE Advanced rank input (supports "P" suffix for preparatory) */
  advancedInput: {
    label: "Enter JEE Advanced Category Rank",
    placeholder: "e.g., 104 or 104P",
  },
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "ews", label: "EWS" },
        { value: "ews_pwd", label: "EWS (PwD)" },
        { value: "obc_ncl", label: "OBC-NCL" },
        { value: "obc_ncl_pwd", label: "OBC-NCL (PwD)" },
        { value: "open", label: "OPEN" },
        { value: "open_pwd", label: "OPEN (PwD)" },
        { value: "sc", label: "SC" },
        { value: "sc_pwd", label: "SC (PwD)" },
        { value: "st", label: "ST" },
        { value: "st_pwd", label: "ST (PwD)" },
      ],
    },
    {
      name: "gender",
      label: "Select Gender",
      options: ["Gender-Neutral", "Female-only (including Supernumerary)"],
    },
    {
      name: "program",
      label: "Select Program",
      options: [
        { value: "engineering", label: "Engineering" },
        { value: "architecture", label: "Architecture" },
        { value: "planning", label: "Planning" },
      ],
    },
    {
      name: "homeState",
      label: "Select Your Home State",
      options: statesList,
    },
    {
      name: "qualifiedJeeAdv",
      label: "Did you qualify JEE Advanced?",
      options: [
        { value: "No", label: "No" },
        { value: "Yes", label: "Yes" },
      ],
    },
  ],
  legend: [
    { key: "AI", value: "All India" },
    { key: "HS", value: "Home State" },
    { key: "OS", value: "Out of State" },
  ],
  /**
   * @param {string} category - Selected category value.
   * @returns {string} Absolute path to public/data/JEE/<category>.json
   */
  getDataPath: (category) => {
    return path.join(process.cwd(), "public", "data", "JEE", `${category}.json`);
  },
  /**
   * Returns filter predicates for JoSAA combined results.
   *
   * @param {Object} query                  - Parsed API query parameters.
   * @param {string} query.gender           - Selected gender.
   * @param {string} query.program          - "engineering" | "architecture" | "planning".
   * @param {string} query.homeState        - Student's home state.
   * @param {string} [query.mainRank]       - JEE Main category rank (optional).
   * @param {string} query.qualifiedJeeAdv  - "Yes" | "No".
   * @param {string} [query.advRank]        - JEE Advanced rank, may have "P" suffix (optional).
   * @returns {Array<function(Object): boolean>}
   */
  getFilters: (query) => {
    const normalizedProgram = String(query.program || "").toLowerCase();
    const baseFilters = [
      (item) => item.Gender === query.gender || item.Gender === "All",
      (item) => {
        if (normalizedProgram === "architecture") {
          return item["Academic Program Name"].toLowerCase().includes("architecture");
        } else if (normalizedProgram === "planning") {
          return item["Academic Program Name"].toLowerCase().includes("planning");
        } else {
          return (
            !item["Academic Program Name"].toLowerCase().includes("architecture") &&
            !item["Academic Program Name"].toLowerCase().includes("planning")
          );
        }
      },
    ];

    const examFilters = [];

    if (query.mainRank && parseInt(query.mainRank) > 0) {
      examFilters.push((item) => {
        const closingRank = parseInt(item["Closing Rank"]);
        const mainRank = parseInt(query.mainRank);
        return !isNaN(closingRank) && !isNaN(mainRank) && closingRank >= 0.9 * mainRank;
      });
    }

    if (
      query.qualifiedJeeAdv === "Yes" &&
      query.advRank &&
      query.advRank.toString().trim() !== ""
    ) {
      const advRankStr = query.advRank.toString().trim();
      const hasPSuffix = advRankStr.endsWith("P");
      const numericAdvRank = parseInt(advRankStr.replace(/[^0-9]/g, "")) || 0;

      examFilters.push((item) => {
        const closingRankStr = String(item["Closing Rank"] || "").trim();
        const hasClosingPSuffix = closingRankStr.endsWith("P");
        if (hasPSuffix !== hasClosingPSuffix) return false;
        const numericClosingRank = parseInt(closingRankStr.replace(/[^0-9]/g, "")) || 0;
        return numericClosingRank >= 0.9 * numericAdvRank;
      });
    }

    if (examFilters.length === 0) {
      return [...baseFilters, () => false];
    }

    const stateFilter = (item) => {
      if (item.Quota === "AI") return true;
      if (query.homeState === item.State) return item.Quota === "HS";
      return item.Quota === "OS";
    };

    return [
      ...baseFilters,
      (item) => examFilters.some((filter) => filter(item)),
      stateFilter,
    ];
  },
};

/**
 * Configuration for TGEAPCET (Telangana State Engineering, Agriculture
 * and Pharmacy Common Entrance Test, formerly TS EAMCET).
 *
 * Data file: public/data/TSEAPERT/tseapert.json
 * Note: Data uses lowercase field names (item.category, item.gender,
 *   item.closing_rank) unlike other exams that use Title Case.
 * EWS handling: EWS category also shows OC (Open Category) rows since
 *   EWS students are eligible for both EWS-reserved and OC seats.
 * Region filter: OU (Osmania University) region includes both OU and "other"
 *   region rows; "Other" region excludes OU rows.
 *
 * @type {ExamConfig}
 */
export const tseApertConfig = {
  name: "TGEAPCET",
  code: "TGEAPCET",
  searchKeys: ["institute_name", "branch_name", "place"],
  primaryInput: integerInput("Enter TG EAPCET Rank", "Enter TG EAPCET rank"),
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "oc", label: "OC" },
        { value: "bc_a", label: "BC-A" },
        { value: "bc_b", label: "BC-B" },
        { value: "bc_c", label: "BC-C" },
        { value: "bc_d", label: "BC-D" },
        { value: "bc_e", label: "BC-E" },
        { value: "sc", label: "SC" },
        { value: "st", label: "ST" },
        { value: "ews", label: "EWS" },
      ],
    },
    {
      name: "gender",
      label: "Select Gender",
      options: ["Male", "Female"],
    },
    {
      name: "region",
      label: "Select Region",
      options: ["OU", "Other"],
    },
  ],
  legend: [
    { key: "AI", value: "All India" },
    { key: "OU", value: "OU Region" },
    { key: "OTHER", value: "Other Region" },
  ],
  /**
   * @returns {string} Absolute path to public/data/TSEAPERT/tseapert.json
   */
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "TSEAPERT", "tseapert.json");
  },
  /**
   * Returns filter predicates for TGEAPCET results.
   *
   * @param {Object} query          - Parsed API query parameters.
   * @param {string} query.rank     - Student's TGEAPCET rank as a string.
   * @param {string} query.category - Category value (lowercase, e.g. "bc_a").
   * @param {string} query.gender   - "Male" or "Female".
   * @param {string} query.region   - "OU" or "Other".
   * @returns {Array<function(Object): boolean>}
   */
  getFilters: (query) => {
    const userRank = parseInt(query.rank, 10);
    const queryCategory = query.category?.toUpperCase().replace(/-/g, "_");
    const queryGender = query.gender?.toLowerCase();
    const queryRegion = query.region;

    const baseFilters = [
      (item) => {
        if (queryCategory === "EWS") {
          return item.category === "EWS" || item.category === "OC";
        }
        return item.category === queryCategory;
      },
      (item) => item.gender?.toLowerCase() === queryGender,
      (item) => {
        const itemRank = parseInt(item.closing_rank, 10);
        return !isNaN(itemRank) && itemRank >= userRank;
      },
    ];

    if (queryRegion) {
      baseFilters.push((item) => {
        if (queryRegion === "OU") return item.region === "OU" || item.region === "other";
        return item.region !== "OU";
      });
    }

    return baseFilters;
  },
};

/**
 * Configuration for GUJCET (Gujarat Common Entrance Test).
 *
 * Data file: public/data/GUJCET/GUJCET.json
 * Note: Uses percentage score (decimal) as the primary input, not rank.
 * Sort: Sorted by closing_marks in descending order (higher marks = better colleges first).
 * No rank/score filter in getFilters — filtering is done by sort order only.
 * Only two categories: general and ST (no OBC separate category in GUJCET data).
 *
 * @type {ExamConfig}
 */
export const gujcetConfig = {
  name: "GUJCET",
  code: "GUJCET",
  searchKeys: ["College Name", "District", "Course"],
  primaryInput: decimalInput("Enter Percentage Score", "e.g., 78.45"),
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "general", label: "General" },
        { value: "st", label: "ST" },
      ],
    },
    {
      name: "program",
      label: "Select Program",
      options: [
        { value: "Engineering", label: "Engineering" },
        { value: "Medical", label: "Medical" },
        { value: "Pharmacy", label: "Pharmacy" },
      ],
    },
  ],
  /**
   * @returns {string} Absolute path to public/data/GUJCET/GUJCET.json
   */
  getDataPath: () => {
    return path.join(process.cwd(), "public/data/GUJCET/GUJCET.json");
  },
  /**
   * Returns filter predicates for GUJCET results.
   * No score threshold filter — results are sorted by closing_marks descending
   * and the student compares their score against displayed values.
   *
   * @param {Object} query          - Parsed API query parameters.
   * @param {string} query.category - "general" or "st".
   * @param {string} query.program  - "Engineering" | "Medical" | "Pharmacy".
   * @returns {Array<function(Object): boolean>}
   */
  getFilters: (query) => {
    return [
      (item) => {
        if (query.category) return item.category === query.category.toLowerCase();
        return true;
      },
      (item) => {
        if (query.program) return item.Program === query.program;
        return true;
      },
    ];
  },
  /** Sort by closing_marks descending — higher marks colleges shown first */
  getSort: () => [["closing_marks", "DESC"]],
};

// ─────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────

/**
 * Central registry mapping exam display names to their config objects.
 *
 * This map is consumed by:
 *  - `pages/index.js` — to populate the exam selector dropdown.
 *  - `pages/api/exam-result.js` — to look up the config for a given exam query param.
 *  - `pages/college_predictor.js` — to render the correct results table columns.
 *
 * To add a new exam:
 *  1. Create a new ExamConfig object above.
 *  2. Add a JSON data file to public/data/<EXAM>/.
 *  3. Add an entry here with the exact display name as the key.
 *
 * @type {Object.<string, ExamConfig>}
 */
export const examConfigs = {
  "JoSAA": josaaConfig,
  "JEE Main-JOSAA": jeeMainJosaaConfig,
  "JEE Main-JAC": jacExamConfig,
  "GUJCET": gujcetConfig,
  "JEE Advanced": jeeAdvancedConfig,
  // "NEET MCC": neetConfig, // Disabled — data not yet available
  "NEETUG": neetUGConfig,
  "MHT CET": mhtCetConfig,
  "KCET": kcetConfig,
  "TNEA": tneaConfig,
  "TGEAPCET": tseApertConfig,
};

export default examConfigs;

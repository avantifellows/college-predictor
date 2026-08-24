import path from "path";

/**
 * This file contains configuration objects for various exams such as JEE Main-JOSAA, JEE Main-JAC, JEE Advanced, NEET, and MHT CET.
 * Each configuration object includes details like the exam name, code, form fields, legends, and methods to get data paths and filters.
 * These configurations are used to dynamically generate forms and filter data based on user inputs in the index.js and college_predictor.js files.
 */

/**
 * Example URL with query parameters for JEE Main-JOSAA
 *  http://futures.avantifellow.com/api/exam-result?exam=JEE%20Main-JOSAA&gender=Female-only%20(including%20Supernumerary)&homeState=Karnataka&category=obc_ncl
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

// Default search keys for most exams
const defaultSearchKeys = ["Institute", "State", "Academic Program Name"];

const integerInput = (label, placeholder = label) => ({
  label,
  placeholder,
  inputType: "number",
  step: "1",
  min: "1",
  allowDecimal: false,
});

const decimalInput = (label, placeholder, max = "100") => ({
  label,
  placeholder,
  inputType: "number",
  step: "0.01",
  min: "0",
  max,
  allowDecimal: true,
});

const josaaSpecialQuotaByHomeState = {
  Goa: "GO",
  "Jammu and Kashmir": "JK",
  Ladakh: "LA",
};

// Exported so the mock-allotment simulator (utils/josaaSimulator.js) can reuse
// the exact same AI/HS/OS/JK/GO/LA matching the live predictor uses, instead of
// a second copy of this logic that could quietly drift out of sync.
export const matchesJosaaQuota = (item, homeState) => {
  if (item.Quota === "AI") {
    return true;
  }

  const specialQuota = josaaSpecialQuotaByHomeState[homeState];
  if (specialQuota && item.Quota === specialQuota) {
    return true;
  }

  if (homeState === item.State) {
    return item.Quota === "HS";
  }

  return item.Quota === "OS";
};

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
  legend: [
    { key: "AI", value: "All India" },
    { key: "HS", value: "Home State" },
    { key: "OS", value: "Out of State" },
  ],
  getDataPath: (category) => {
    return path.join(
      process.cwd(),
      "public",
      "data",
      "JEE",
      `${category}.json`
    );
  },
  getFilters: (query) => {
    const normalizedProgram = String(query.program || "").toLowerCase();
    const baseFilters = [
      (item) => item.Exam === "JEE Main",
      (item) => item.Gender === query.gender,
      (item) => {
        if (normalizedProgram === "architecture") {
          return item["Academic Program Name"]
            .toLowerCase()
            .includes("architecture");
        } else if (normalizedProgram === "planning") {
          return item["Academic Program Name"]
            .toLowerCase()
            .includes("planning");
        } else {
          // Default to Engineering
          return (
            !item["Academic Program Name"]
              .toLowerCase()
              .includes("architecture") &&
            !item["Academic Program Name"].toLowerCase().includes("planning")
          );
        }
      },
    ];

    // query.homeState will now always be a specific state (not "All India")
    return [...baseFilters, (item) => matchesJosaaQuota(item, query.homeState)];
  },
};

export const jacExamConfig = {
  code: "JEE Main",
  name: "JEE Main-JAC",
  searchKeys: defaultSearchKeys,
  primaryInput: integerInput("Enter All India Rank", "Enter All India Rank"),
  fields: [
    {
      name: "category",
      label: "Select Category",
      // label MUST equal value here: pages/index.js submits
      // selectedOption.label, and getFilters below compares it RAW against
      // item.Category with no normalization. These matched the data only by
      // coincidence — the lowercase values were dead code, so editing a label
      // would have silently returned zero rows. (Unlike JoSAA/JEE, where the
      // lowercase value is real: getDataPath(category) turns it into a
      // filename.)
      options: [
        { value: "EWS", label: "EWS" },
        { value: "Kashmiri Minority", label: "Kashmiri Minority" },
        { value: "OBC", label: "OBC" },
        { value: "General", label: "General" },
        { value: "ST", label: "ST" },
        { value: "SC", label: "SC" },
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
  legend: [
    { key: "D", value: "Delhi" },
    { key: "OD", value: "Outside Delhi" },
  ],
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "JEE", "jac_data.json");
  },
  getFilters: (query) => [
    // "Any" means the seat is open regardless of Delhi domicile — all 9
    // Kashmiri Minority rows are State="Any", so an exact match against the
    // Delhi / Outside Delhi dropdown made that entire category unreachable.
    (item) => item.State === "Any" || item.State === query.homeState,
    (item) => item.Category === query.category,
    (item) => item.Defense === query.isDefenseWard,
    (item) => item.PWD === query.isPWD,
    (item) => item.Gender === query.gender,
    (item) =>
      parseInt(item["Closing Rank"], 10) >= 0.9 * parseInt(query.rank, 10),
  ],
  getSort: () => [["Closing Rank", "ASC"]],
};

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
  getDataPath: (category) => {
    return path.join(
      process.cwd(),
      "public",
      "data",
      "JEE",
      `${category}.json`
    );
  },
  getFilters: (query) => {
    const baseFilters = [
      (item) => item.Exam === "JEE Advanced",
      (item) => item.Gender === query.gender,
    ];

    // query.homeState will now always be a specific state (not "All India")
    return [...baseFilters, (item) => matchesJosaaQuota(item, query.homeState)];
  },
};

// Central NEET categories the student self-identifies with (from their NEET form).
// These filter the All-India-Quota rows directly. State-quota rows use each
// state's own category codes and are matched separately (see getFilters).
const neetCentralCategoryOptions = [
  { value: "Open", label: "Open (General)" },
  { value: "OBC", label: "OBC-NCL" },
  { value: "EWS", label: "EWS" },
  { value: "SC", label: "SC" },
  { value: "ST", label: "ST" },
  { value: "Open PwD", label: "Open (PwD)" },
  { value: "OBC PwD", label: "OBC-NCL (PwD)" },
  { value: "EWS PwD", label: "EWS (PwD)" },
  { value: "SC PwD", label: "SC (PwD)" },
  { value: "ST PwD", label: "ST (PwD)" },
];

// The form submits the selected dropdown LABEL (see handleInputChange), while
// the data uses the central-category VALUE ("OBC" not "OBC-NCL"). Map any
// incoming label OR value to the canonical AIQ category so filtering is robust.
const neetCategoryCanonical = (() => {
  const map = {};
  for (const { value, label } of neetCentralCategoryOptions) {
    const norm = (s) =>
      String(s || "")
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();
    map[norm(value)] = value;
    map[norm(label)] = value;
  }
  return (input) => {
    const norm = String(input || "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
    return map[norm] || null;
  };
})();

// ---------------------------------------------------------------------------
// SEAT TYPE classifier (added 2026-07-29 from Karnataka medical-student feedback
// via Amogh). The reports were: "They can see DU quota / puducherry quota / etc
// in the All India list even if it's not applicable to them", and "show college
// type and seat type in state quota list". Root cause (Amogh): seat type was
// being conflated with category because there was NO separate seat-type filter —
// every AIQ-sourced row was shown to every user regardless of eligibility.
//
// Our data has 25 distinct AIQ `Seat Type` values and 13 state ones, spelled
// inconsistently across states (GOVT / Government / Govt. Quota all mean the
// same). This collapses them into the handful of buckets a student can act on.
//
// RESTRICTED = you must belong to a specific domicile/institution/cohort. These
// are the ones that were misleading Karnataka students: DU Quota and IP Quota are
// Delhi-domicile-only, "Internal - Puducherry UT Domicile" is Puducherry-only,
// AMU/Jamia/minority quotas are institution-internal, ESI needs an ESI card, CW
// is armed-forces children/widows, Foreign Country Quota is foreign nationals.
const NEET_SEAT_BUCKETS = [
  // [bucket, test on the normalized Seat Type string]
  ["nri", (s) => s.includes("nonresidentindian") || s.includes("nri")],
  ["deemed", (s) => s.includes("deemed") || s.includes("paidseats")],
  [
    "management",
    (s) => s.includes("management") || s.includes("institutequota"),
  ],
  ["private", (s) => s.includes("private")],
  [
    "restricted",
    (s) =>
      s.includes("delhiuniversity") ||
      s.includes("ipuniversity") ||
      s.includes("dsquota") ||
      s.includes("puducherryutdomicile") ||
      s.includes("amu") ||
      s.includes("jamia") ||
      s.includes("minority") ||
      s.includes("muslim") ||
      s.includes("jain") ||
      s.includes("employeesstateinsurance") ||
      s.includes("esi") ||
      s.includes("foreigncountry") ||
      s.includes("armedforces") ||
      s.includes("cwquota") ||
      s.includes("bscnursingdelhincr"),
  ],
  ["govt", (s) => s.includes("govt") || s.includes("government")],
  ["allindia", (s) => s.includes("allindia")],
  [
    "statequota",
    (s) =>
      s.includes("statequota") ||
      s.includes("openquota") ||
      s.includes("hpquota"),
  ],
];

const neetSeatBucket = (seatType) => {
  const s = String(seatType || "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
  for (const [bucket, test] of NEET_SEAT_BUCKETS) {
    if (test(s)) return bucket;
  }
  return "other";
};

// Buckets a normal applicant can actually compete for with no extra credential.
const NEET_OPEN_BUCKETS = new Set([
  "allindia",
  "statequota",
  "govt",
  "private",
  "management",
  "deemed",
  "other",
]);

const neetSeatTypeOptions = [
  {
    value: "",
    label:
      "Seats I can apply to (recommended — hides NRI/DU/AMU/ESI-type quotas)",
  },
  { value: "govt-only", label: "Government seats only" },
  { value: "private-management", label: "Private / Management seats" },
  { value: "deemed", label: "Deemed / paid seats (no category reservation)" },
  { value: "all", label: "Show every seat type (incl. restricted quotas)" },
];

export const neetUGConfig = {
  name: "NEETUG",
  code: "NEETUG",
  // Institute + State cover both AIQ and state-quota rows for search.
  searchKeys: ["Institute", "State", "Academic Program Name", "Category"],
  primaryInput: integerInput(
    "Enter your NEET All India Rank",
    "Enter your NEET All India Rank"
  ),
  // Marks->rank estimation DISABLED 2026-07-20 (Amogh). The score->AIR model
  // (/api/neet-predict, score_rank_model.json) was fitted on 2025 data, but the
  // 2026 paper was easier and the score-rank distribution shifted a lot (e.g. a
  // 564 score was ~7.4k AIR in 2025 but ~26k in 2026), so the estimate is no
  // longer trustworthy. NEET now takes a directly-entered All India Rank only.
  // The model, API route, fit script and calibration CSV are kept in the repo
  // for when we handle year-to-year difficulty variance — re-enable by
  // uncommenting these three keys and restoring the index.js NEET rank-mode
  // toggle (search "estimator disabled 2026-07-20").
  // estimateMarksInput: {
  //   label: "Enter your NEET marks (out of 720)",
  //   placeholder: "e.g., 545",
  //   min: "0",
  //   max: "720",
  // },
  // estimateApi: "/api/neet-predict",
  // estimateReturnsCategoryRank: false,
  fields: [
    {
      name: "program",
      label: "Select Program",
      options: [
        { value: "MBBS", label: "MBBS" },
        { value: "BDS", label: "BDS" },
        { value: "BSc Nursing", label: "BSc Nursing" },
      ],
    },
    {
      name: "homeState",
      label: "Select Home State",
      // Used for cross-state scoping: a student sees All-India-Quota cutoffs for
      // every college, plus their HOME state's state-quota cutoffs. Options are
      // the states we currently have state-quota data for.
      options: [
        { value: "Andhra Pradesh", label: "Andhra Pradesh" },
        { value: "Assam", label: "Assam" },
        { value: "Bihar", label: "Bihar" },
        { value: "Chandigarh", label: "Chandigarh" },
        { value: "Chhattisgarh", label: "Chhattisgarh" },
        { value: "Gujarat", label: "Gujarat" },
        { value: "Haryana", label: "Haryana" },
        { value: "Himachal Pradesh", label: "Himachal Pradesh" },
        { value: "Jammu & Kashmir", label: "Jammu & Kashmir" },
        { value: "Karnataka", label: "Karnataka" },
        { value: "Kerala", label: "Kerala" },
        { value: "Madhya Pradesh", label: "Madhya Pradesh" },
        { value: "Maharashtra", label: "Maharashtra" },
        { value: "Manipur", label: "Manipur" },
        { value: "Mizoram", label: "Mizoram" },
        { value: "Odisha", label: "Odisha" },
        { value: "Punjab", label: "Punjab" },
        { value: "Rajasthan", label: "Rajasthan" },
        { value: "Tamil Nadu", label: "Tamil Nadu" },
        { value: "Telangana", label: "Telangana" },
        { value: "Tripura", label: "Tripura" },
        { value: "Uttar Pradesh", label: "Uttar Pradesh" },
        { value: "Uttarakhand", label: "Uttarakhand" },
        { value: "West Bengal", label: "West Bengal" },
        { value: "Other", label: "Other / Not listed (All India only)" },
      ],
    },
    {
      name: "category",
      label: "Select Category (as on your NEET form)",
      options: neetCentralCategoryOptions,
    },
    {
      // Gender is a SEAT-TYPE filter, mirroring how every other exam (JoSAA,
      // JEE, MHT CET) filters gender: pick a seat pool, see only that pool.
      // Female-only = seats reserved for women (MH 30% / AP·TG 33.3% within each
      // category, plus women-only AIQ institutions like LHMC/RAK/nursing);
      // Gender-Neutral = seats open to all. "Show all" shows both. Optional, and
      // only meaningful where female data exists (MH/TG/AP/AIQ).
      name: "gender",
      label: "Select Gender (optional)",
      optional: true,
      options: [
        { value: "", label: "Show all seats" },
        { value: "Female", label: "Female-only seats" },
        { value: "Gender-Neutral", label: "Gender-neutral seats" },
      ],
    },
    {
      // SEAT TYPE — added from the Karnataka feedback. Default (empty value)
      // hides the restricted quotas a normal applicant cannot use, which is the
      // behaviour students expected all along.
      name: "seatType",
      label: "Select Seat Type",
      optional: true,
      options: neetSeatTypeOptions,
    },
    {
      // Options are populated at runtime from public/data/NEETUG/
      // neet_state_categories.json for the chosen home state (each state uses
      // its own codes). Only shown once a home state with data is selected.
      name: "stateCategory",
      label: "Select Home-State Category (optional)",
      dynamicOptionsByHomeState: true,
      optional: true,
      options: [],
    },
  ],
  legend: [
    { key: "All India", value: "All India Quota (open to every state)" },
    { key: "State Quota", value: "Home-state quota (your home state only)" },
  ],
  getDataPath: () => {
    return path.join(process.cwd(), "public/data/NEETUG/NEETUG.json");
  },
  getFilters: (query) => {
    const normalize = (str) =>
      String(str || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();

    return [
      // Program
      (item) => {
        if (!query.program) return true;
        return (
          normalize(item["Academic Program Name"]) === normalize(query.program)
        );
      },
      // Cross-state scoping (mirrors JoSAA AI/HS/OS):
      //   - AIQ-sourced rows: always shown. These are all MCC national
      //     counselling, including the domicile-restricted pools (Delhi
      //     University / IP University / AMU / ESI / ...) which we keep as their
      //     own labeled Seat Type so the list is complete — the student reads the
      //     Seat Type to see which apply to them.
      //   - State-file rows (Maharashtra/Gujarat/...): home-state-only, whatever
      //     their seat-type label (State Quota / Management / NRI / ...), so a
      //     state's private/management pools are gated to that state, not leaked.
      (item) => {
        if ((item["Source"] || "").startsWith("aiq")) return true;
        if (item["Seat Type"] === "All India") return true;
        if (!query.homeState || query.homeState === "Other") return false;
        return normalize(item["State"]) === normalize(query.homeState);
      },
      // SEAT TYPE filter (Karnataka feedback, 2026-07-29). The form submits the
      // option LABEL, so match on label text like the gender filter does.
      (item) => {
        const raw = String(query.seatType || "").toLowerCase();
        const bucket = neetSeatBucket(item["Seat Type"]);
        // ★ `Seat Type = "State Quota"` spans BOTH govt and private colleges — a private college
        //   sells state-quota-priced seats too (Rajasthan: 217 govt vs 134 private under the very
        //   same "State Quota" label; Haryana 42/55; Odisha 58/16). So "Government seats only" MUST
        //   consult College Type, not just the seat pool. Bucketing alone returned MG MC Jaipur
        //   (govt) mislabelled and Adesh/HITECH (private) as "government".
        const collegeType = String(item["College Type"] || "").toLowerCase();
        const isGovtCollege = collegeType
          ? collegeType.startsWith("govt") ||
            collegeType.startsWith("government")
          : bucket === "govt" ||
            bucket === "allindia" ||
            bucket === "statequota";
        if (raw.includes("every seat type")) return true;
        if (raw.includes("government seats only")) return isGovtCollege;
        if (raw.includes("private / management"))
          return (
            !isGovtCollege &&
            (bucket === "private" ||
              bucket === "management" ||
              bucket === "statequota" ||
              bucket === "govt")
          );
        if (raw.includes("deemed")) return bucket === "deemed";
        // Default / "Seats I can apply to": drop the restricted + NRI pools.
        return NEET_OPEN_BUCKETS.has(bucket);
      },
      // Category:
      //   - AIQ rows (all pools, incl. Delhi University / IP / ...) use central
      //     categories -> match the student's chosen NEET-form category exactly.
      //   - **Deemed/paid seats are EXEMPT** (Karnataka feedback): deemed
      //     universities admit on rank + fee with NO category reservation, so
      //     filtering them by the student's category both hides real options from
      //     reserved-category students and implies a reservation that does not
      //     exist.
      //   - State-file rows use the state's own codes (which don't map cleanly
      //     to central categories); we surface all of the home state's rows and
      //     let the student read the Category / Category Label column.
      (item) => {
        if (!query.category) return true;
        if (neetSeatBucket(item["Seat Type"]) === "deemed") return true;
        if ((item["Source"] || "").startsWith("aiq")) {
          // query.category may arrive as the label ("OBC-NCL") or value ("OBC");
          // canonicalize both sides. Match on the BASE category (strip any seat
          // sub-pool annotation like " (PwD)") so the base reservation matches;
          // gender is handled by its own filter below, not here.
          const wanted = neetCategoryCanonical(query.category);
          if (!wanted) return true; // unknown category -> don't over-filter
          const baseCat = String(item["Category"] || "").replace(
            /\s*\(.*\)\s*$/,
            ""
          );
          return neetCategoryCanonical(baseCat) === wanted;
        }
        return true; // AIQ category handled above; state rows handled next
      },
      // Gender is a SEAT-TYPE filter (not an eligibility model): it narrows the
      // list to the seat pool the user picked. Female-only rows are seats
      // reserved for women (MH/AP/TG) or women-only institutions (AIQ LHMC/RAK/
      // nursing); the rest are gender-neutral (open to all).
      //   - "Female"            -> ONLY Female-only seats
      //   - "Male/Gender-neutral" -> ONLY gender-neutral seats
      //   - "Show all" / no selection -> everything
      // The form submits the option LABEL (see handleQueryObjectChange), so we
      // match on the label text.
      (item) => {
        // Match on the submitted LABEL (the form sends option.label). "female…"
        // -> only female seats; anything mentioning "neutral"/"male" -> only
        // neutral seats; "show all"/empty -> everything.
        const g = String(query.gender || "").toLowerCase();
        const isFemaleSeat =
          (item["Gender"] || "Gender-Neutral") === "Female-only";
        if (g.includes("female")) return isFemaleSeat;
        if (g.includes("neutral") || g.includes("male")) return !isFemaleSeat;
        return true; // "show all seats" or no selection
      },
      // Home-state category: constrains the home-state (state-file) rows to the
      // picked code. Keys on Source (not the literal "State Quota" label) so it
      // also covers a state's Government / Management / NRI / Institute-Quota
      // rows. AIQ rows are unaffected. No selection -> all home-state rows.
      (item) => {
        if (!query.stateCategory) return true;
        if (String(item["Source"] || "").startsWith("aiq")) return true;
        // ★ The form submits the option LABEL, and since 2026-07-29 those labels are
        //   human-readable ("3BG — Category-3B (OBC) — Govt seat pool") rather than the bare
        //   code. Comparing the whole label against item.Category never matched, so picking ANY
        //   home-state category silently returned zero home-state rows. Take the code, which is
        //   the part before the first em-dash separator, and fall back to the whole string.
        const wanted = String(query.stateCategory).split("—")[0].trim();
        // Compare EXACTLY first. `normalize()` strips non-alphanumerics, which collides distinct
        // Kerala codes: "NR" and "NR *" both normalize to "nr", so picking either returned both
        // (33 + 5 rows). Exact match keeps them apart; the normalized compare stays as a fallback
        // for whitespace/case drift between the dropdown and the data.
        if (String(item["Category"] || "").trim() === wanted) return true;
        const a = String(item["Category"] || "");
        const b = wanted;
        // Only fall back to fuzzy matching when neither side carries a distinguishing marker.
        if (/[*()]/.test(a) !== /[*()]/.test(b)) return false;
        return normalize(a) === normalize(b);
      },
      // Closing-rank filter: show colleges whose closing rank is within reach
      // (0.9 * user AIR headroom). Rank is the primary input — with no rank the
      // predictor has no basis to predict, so return NOTHING (not everything).
      // This matches JoSAA (which also yields no rows without a rank); the old
      // `return true` here wrongly showed every college when the rank was blank.
      (item) => {
        if (!query.rank) return false;
        const closingRank = parseInt(item["Closing Rank"], 10);
        const userRank = parseInt(query.rank, 10);
        if (isNaN(closingRank) || isNaN(userRank)) return false;
        return closingRank >= 0.9 * userRank;
      },
    ];
  },
  getSort: () => [["Closing Rank", "ASC"]],
};

export const mhtCetConfig = {
  name: "MHT CET",
  apiEndpoint: "mhtcet",
  searchKeys: defaultSearchKeys,
  primaryInput: integerInput(
    "Enter Your Merit Rank",
    "Enter your MHT CET rank (or B.Arch/B.Design merit no.)"
  ),
  fields: [
    {
      // Maharashtra runs a separate CAP per stream and the merit lists are NOT
      // the same number space: engineering and pharmacy rank on MHT-CET,
      // B.Arch on NATA/2 + Class XII % (max 200), B.Design on MAH-B.Design
      // CET. Results must be scoped to one stream or the ranks are meaningless
      // side by side. See the legend for which exam governs which stream.
      //
      // NOTE handleInputChange in pages/index.js submits `selectedOption.label`,
      // not `.value`, so the label IS the query value — keep them identical.
      // A decorative label (e.g. "Engineering (MHT-CET)") silently matches
      // nothing.
      name: "stream",
      label: "Select Stream",
      options: [
        { value: "Engineering", label: "Engineering" },
        { value: "Pharmacy", label: "Pharmacy" },
        { value: "Architecture", label: "Architecture" },
        { value: "B.Design", label: "B.Design" },
      ],
    },
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
        // SEBC is a separate reservation from OBC under Maharashtra law, not a
        // synonym — it closes ~1,000 ranks looser. It used to be folded into
        // OBC, which made the same college+program appear up to 4x all labelled
        // "OBC" with different ranks.
        { value: "SEBC", label: "SEBC" },
        { value: "SBC", label: "SBC" },
        { value: "Orphan", label: "Orphan" },
        { value: "TFWS", label: "TFWS" },
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
      // Maharashtra's CAP splits seats by whether the candidate's HOME
      // UNIVERSITY matches the college's, not by state. The CET Cell's section
      // headings read seat-type -> candidate-type, so eligibility comes from the
      // second half ("Home University Seats Allotted to OTHER Than Home
      // University Candidates" is an out-of-region seat).
      // A yes/no question cannot answer this: whether a "Home University" seat
      // is yours depends on WHICH university the college belongs to, and that
      // varies row by row. So ask for the student's own region once, then
      // compare it against each row's Home University (see getFilters).
      //
      // These are the 11 university regions that actually run a home quota.
      // Autonomous / Deemed / SNDT institutes are ~99.7% State Level — they
      // have no home-region quota, so their seats show for every choice.
      name: "homeState",
      label: "Your Home University Region",
      // label MUST equal value: pages/index.js submits selectedOption.label,
      // not .value. A friendly label ("Nagpur") against a data value
      // ("Rashtrasant Tukadoji Maharaj Nagpur University") silently matched
      // nothing, so EVERY Home-University seat was filtered out and students
      // saw only the out-of-region pool. Same trap as the Stream field.
      options: [
        { value: "Mumbai University", label: "Mumbai University" },
        {
          value: "Savitribai Phule Pune University",
          label: "Savitribai Phule Pune University",
        },
        { value: "Shivaji University", label: "Shivaji University" },
        {
          value: "Sant Gadge Baba Amravati University",
          label: "Sant Gadge Baba Amravati University",
        },
        {
          value: "Rashtrasant Tukadoji Maharaj Nagpur University",
          label: "Rashtrasant Tukadoji Maharaj Nagpur University",
        },
        {
          value: "Dr. Babasaheb Ambedkar Marathwada University",
          label: "Dr. Babasaheb Ambedkar Marathwada University",
        },
        {
          value: "Swami Ramanand Teerth Marathwada University, Nanded",
          label: "Swami Ramanand Teerth Marathwada University, Nanded",
        },
        {
          value:
            "Kavayitri Bahinabai Chaudhari North Maharashtra University, Jalgaon",
          label:
            "Kavayitri Bahinabai Chaudhari North Maharashtra University, Jalgaon",
        },
        {
          value: "Punyashlok Ahilyadevi Holkar Solapur University",
          label: "Punyashlok Ahilyadevi Holkar Solapur University",
        },
        { value: "Gondwana University", label: "Gondwana University" },
        {
          value: "Dr. Babasaheb Ambedkar Technological University,Lonere",
          label: "Dr. Babasaheb Ambedkar Technological University,Lonere",
        },
        {
          value: "Outside Maharashtra",
          label: "Outside Maharashtra",
        },
      ],
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
  // Kept deliberately short — the previous version repeated what the dropdowns
  // already say. The one thing a student cannot infer from the form is that
  // B.Arch and B.Design are scored on a different scale from MHT-CET, so a
  // B.Arch "163" is a merit score out of 200, not a rank.
  legend: [
    {
      key: "Architecture",
      value: "merit = NATA ÷ 2 + Class XII %, out of 200 (not an MHT-CET rank)",
    },
    { key: "B.Design", value: "ranked on MAH-B.Design CET, not MHT-CET" },
  ],
  getDataPath: () => {
    return path.join(
      process.cwd(),
      "public",
      "data",
      "MHTCET",
      "mhtcet_data.json"
    );
  },
  getFilters: (query) => [
    (item) => !query.stream || item.Stream === query.stream,
    (item) => {
      if (query.category === "TFWS") {
        return item.Category_Key === "TFWS";
      }
      return item.Category === query.category;
    },
    // Maharashtra's 30% female reservation is HORIZONTAL: L-coded seats are
    // reserved for women *in addition to* the gender-neutral G-coded pool, so
    // a female candidate competes for both. Matching Gender exactly hid the
    // larger pool — at Open/rank 5000 it showed 2,191 options instead of the
    // 4,414 she is actually eligible for.
    (item) =>
      query.gender === "Female-Only"
        ? item.Gender === "Female-Only" || item.Gender === "Gender-Neutral"
        : item.Gender === query.gender,
    // Home-region eligibility. `item.State` says who a seat is open to
    // ("Any" = State Level, "Home University", "Other than Home University")
    // and `item["Home University"]` says which university the college belongs
    // to. A seat is reachable when:
    //
    //   State Level                  -> anyone from Maharashtra
    //   Home University seat         -> only if the college's university is YOURS
    //   Other-than-Home seat         -> only if it is NOT yours
    //
    // Colleges with no home university published (Autonomous / Deemed / SNDT,
    // ~99.7% State Level) have no home quota, so they stay visible either way.
    (item) => {
      if (!query.homeState) return true;
      const seatFor = item.State;
      if (seatFor === "Any") return true;
      const collegeUni = item["Home University"];
      if (!collegeUni || collegeUni === "Autonomous Institute") return true;
      // Not from Maharashtra: only the out-of-region pools are open.
      if (query.homeState === "Outside Maharashtra") {
        return seatFor === "Other than Home University";
      }
      const isMyRegion = collegeUni === query.homeState;
      return seatFor === "Home University" ? isMyRegion : !isMyRegion;
    },
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
  legend: [
    { key: "AI", value: "All India" },
    { key: "KA", value: "Karnataka" },
    { key: "HK", value: "Hyderabad-Karnataka Region" },
  ],
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "KCET", "kcet_data.json");
  },
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

export const tneaConfig = {
  name: "TNEA",
  searchKeys: ["Institute", "Course", "District"],
  // TNEA admits on a 200-point cutoff mark, NOT a rank — the global default
  // label ("Enter Rank") was simply wrong here, and the field is filled by the
  // marks calculator rather than typed directly.
  primaryInput: {
    label: "TNEA Cutoff Score",
    placeholder: "e.g., 178.5",
    inputType: "number",
    step: "0.5",
    min: "0",
    max: "200",
    allowDecimal: true,
  },
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
        // PwD and OBC removed 2026-08-18: TNEA publishes exactly these 7
        // communities (no separate PwD column, and "OBC" is not a TN category —
        // BC/BCM/MBC are). Both options returned wrong or no rows.
      ],
    },
    {
      name: "courseType",
      label: "Select Course Type",
      // Generated from the data (57 canonical courses). The hand-written list
      // had 16, hiding 53 real courses — VLSI (129 rows), Electronics &
      // Instrumentation (91), Food Technology (97), AI & ML (78), Cyber
      // Security and 48 more were unreachable. "(Ss)" suffixes are stripped:
      // self-supporting is already its own column, so the suffix only split
      // the same course into two dropdown entries.
      options: [
        "Any",
        "Computer Science",
        "Electronics and Communications (ECE)",
        "Artificial Intelligence And Data Science",
        "Information Technology",
        "Mechanical",
        "Electrical and Electronics (EEE)",
        "Civil",
        "Biomedical",
        "Bio Technology",
        "Agricultural Engineering",
        "Aerospace",
        "Mechatronics Engineering",
        "Chemical Engineering",
        "Electronics Engineering (Vlsi Design And Technology)",
        "Robotics",
        "Food Technology",
        "Electronics And Instrumentation Engineering",
        "Automobile",
        "Artificial Intelligence And Machine Learning",
        "Computer And Communication Engineering",
        "Pharmaceutical Technology",
        "Fashion Technology",
        "Textile Technology",
        "Electrical Engineering",
        "Instrumentation And Control Engineering",
        "Medical Electronics Engineering",
        "Petro Chemical Technology",
        "Production Engineering",
        "Industrial Bio Technology",
        "Metallurgical Engineering",
        "Cyber Security",
        "Electronics And Computer Engineering",
        "Geo Informatics",
        "Petroleum Engineering",
        "Manufacturing Engineering",
        "Safety And Fire Engineering",
        "Interior Design",
        "B.Plan",
        "Ceramic Technology",
        "Handloom And Textile Technology",
        "Industrial Engineering",
        "Leather Technology",
        "Mechatronics",
        "Apparel Technology",
        "Bio Technology And Bio Chemical Engineering",
        "Material Science And Engineering",
        "Mining Engineering",
        "Petroleum Engineering And Technology",
        "Plastic Technology",
        "Printing & Packing Technology",
        "Rubber And Plastic Technology",
        "Chemical And Electro Chemical Engineering",
        "Environmental Engineering",
        "Bachelor Of Design",
        "Marine Engineering",
        "Environmental Science & Technology",
        "Industrial Engineering And Management",
      ],
    },
    {
      name: "collegeType",
      label: "Select College Type",
      options: [
        "State Government",
        "Private Aided (Government Aided)",
        "Private Un-Aided",
        "Any",
      ],
    },
    {
      name: "district",
      label: "Select District",
      options: [
        "Any",
        "Ariyalur",
        "Chengalpattu",
        "Chennai",
        "Coimbatore",
        "Cuddalore",
        "Dharmapuri",
        "Dindigul",
        "Erode",
        "Kancheepuram",
        "Kanniyakumari",
        "Karur",
        "Krishnagiri",
        "Madurai",
        "Mayiladuthurai",
        "Namakkal",
        "Perambalur",
        "Pudukkottai",
        "Ramanathapuram",
        "Salem",
        "Sivaganga",
        "Thanjavur",
        "The Nilgiris",
        "Theni",
        "Thiruvallur",
        "Thiruvarur",
        "Thoothukkudi",
        "Tiruchirappalli",
        "Tirunelveli",
        "Tiruppur",
        "Tiruvannamalai",
        "Vellore",
        "Viluppuram",
        "Virudhunagar",
      ],
    },
  ],
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "TNEA", "tnea_data.json");
  },
  getFilters: (query) => [
    (item) => item.Category === query.category,
    (item) => {
      if (!query.courseType || query.courseType === "Any") return true;
      // The dropdown offers canonical names; the data still carries the
      // "(Ss)" self-supporting suffix on 132 rows. Strip it so picking
      // "Chemical Engineering" also returns "Chemical Engineering (Ss)" —
      // the Self Supporting column already records that distinction.
      const canonical = String(item.Course || "").replace(/\s*\(Ss\)$/i, "");
      return canonical === query.courseType;
    },
    (item) => item.District === query.district || "Any" === query.district,
    (item) =>
      item["College Type"] === query.collegeType || "Any" === query.collegeType,
  ],
  // Cutoff marks DESC — the closest-to-reach seats first, same direction the
  // student's own score is measured in.
  getSort: () => [["Cutoff Marks", "DESC"]],
};

export const josaaConfig = {
  name: "JoSAA (JEE Main and Advanced)",
  code: "JoSAA",
  searchKeys: defaultSearchKeys,
  primaryInput: integerInput(
    "Enter JEE Main Category Rank",
    "Enter JEE Main category rank"
  ),
  estimateMarksInput: {
    label: "Enter JEE Main marks out of 300",
    placeholder: "e.g., 182",
    min: "0",
    max: "300",
  },
  estimatePercentileInput: decimalInput(
    "Enter JEE Main percentile",
    "e.g., 97.45"
  ),
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
  getDataPath: (category) => {
    return path.join(
      process.cwd(),
      "public",
      "data",
      "JEE",
      `${category}.json`
    );
  },
  getFilters: (query) => {
    const normalizedProgram = String(query.program || "").toLowerCase();
    const baseFilters = [
      (item) => item.Gender === query.gender || item.Gender === "All",
      (item) => {
        if (normalizedProgram === "architecture") {
          return item["Academic Program Name"]
            .toLowerCase()
            .includes("architecture");
        } else if (normalizedProgram === "planning") {
          return item["Academic Program Name"]
            .toLowerCase()
            .includes("planning");
        } else {
          // Default to Engineering
          return (
            !item["Academic Program Name"]
              .toLowerCase()
              .includes("architecture") &&
            !item["Academic Program Name"].toLowerCase().includes("planning")
          );
        }
      },
    ];

    // Separate filters for JEE Main and JEE Advanced
    const examFilters = [];

    // JEE Main filter
    if (query.mainRank && parseInt(query.mainRank) > 0) {
      examFilters.push((item) => {
        const closingRank = parseInt(item["Closing Rank"]);
        const mainRank = parseInt(query.mainRank);
        return (
          !isNaN(closingRank) &&
          !isNaN(mainRank) &&
          closingRank >= 0.9 * mainRank
        );
      });
    }

    // JEE Advanced filter - only apply if user qualified and provided his jee adv rank
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

        // If input has 'P' suffix, only match ranks that also have 'P' suffix
        // If input doesn't have 'P' suffix, only match ranks that also don't have 'P' suffix
        if (hasPSuffix !== hasClosingPSuffix) {
          return false;
        }

        // Compare numeric values
        const numericClosingRank =
          parseInt(closingRankStr.replace(/[^0-9]/g, "")) || 0;
        return numericClosingRank >= 0.9 * numericAdvRank;
      });
    }

    // If no valid ranks are provided, returning empty false
    if (examFilters.length === 0) {
      return [...baseFilters, () => false];
    }

    // State filter
    const stateFilter = (item) => matchesJosaaQuota(item, query.homeState);

    // Combine all filters - a row should match if it passes either rank filter
    return [
      ...baseFilters,
      (item) => examFilters.some((filter) => filter(item)),
      stateFilter,
    ];
  },
};

export const tseApertConfig = {
  // Display name only - the registry key stays "TGEAPCET" so existing URLs
  // and table mappings are untouched. Spaced to match "AP EAPCET".
  name: "TG EAPCET",
  code: "TGEAPCET",
  searchKeys: ["institute_name", "branch_name", "place"],
  primaryInput: integerInput("Enter TG EAPCET Rank", "Enter TG EAPCET rank"),
  fields: [
    {
      name: "category",
      label: "Select Category",
      // SC is deliberately NOT one option. Telangana's 2024 SC Rationalization
      // GO splits it into SC-I / SC-II / SC-III and the 2025 source publishes
      // all three separately, with cutoffs that differ by tens of thousands of
      // ranks (Earth Sciences Univ CSE boys: SC-I 45,412 vs SC-II 120,845).
      // Collapsing them to one "SC" would hide exactly what an SC student
      // needs to know.
      options: [
        { value: "oc", label: "OC" },
        { value: "bc_a", label: "BC-A" },
        { value: "bc_b", label: "BC-B" },
        { value: "bc_c", label: "BC-C" },
        { value: "bc_d", label: "BC-D" },
        { value: "bc_e", label: "BC-E" },
        { value: "sc_i", label: "SC-I" },
        { value: "sc_ii", label: "SC-II" },
        { value: "sc_iii", label: "SC-III" },
        { value: "st", label: "ST" },
        { value: "ews", label: "EWS" },
      ],
    },
    {
      name: "gender",
      label: "Select Gender",
      // Not a preference — Telangana publishes a SEPARATE closing rank per
      // gender for every category, because the 33% women's reservation is a
      // distinct seat pool rather than something applied afterwards.
      options: ["Male", "Female"],
    },
  ],
  // Short by design — these render as inline chips above the table.
  legend: [
    { key: "SC-I / II / III", value: "Separate seat pools, separate cutoffs" },
    { key: "Male / Female", value: "Separate seat pools, separate cutoffs" },
    {
      key: "Local area",
      value: "State-wide rank; OU/KU may be slightly easier",
    },
  ],
  getDataPath: () => {
    return path.join(
      process.cwd(),
      "public",
      "data",
      "TSEAPERT",
      "tseapert.json"
    );
  },
  getFilters: (query) => {
    const userRank = parseInt(query.rank, 10);
    // pages/index.js submits selectedOption.label, so match on the label text
    // ("BC-A", "SC-I") normalised to the stored value ("bc_a", "sc_i").
    const queryCategory = query.category?.toLowerCase().replace(/-/g, "_");
    const queryGender = query.gender?.toLowerCase();

    return [
      (item) => {
        if (!queryCategory) return true;
        // No EWS->OC fallback any more. The 2024 file had no usable EWS rows so
        // the old config OR-ed in OC to avoid an empty page; the 2025 source
        // publishes a real EWS pool (1,859 rows), and OR-ing OC in now just
        // shows a student seats they are not competing for.
        return item.category === queryCategory;
      },
      (item) => {
        if (!queryGender) return true;
        return item.gender?.toLowerCase() === queryGender;
      },
      (item) => {
        // Lower rank = harder, so a seat is reachable when its closing rank is
        // at or beyond the student's rank.
        const itemRank = parseInt(item.closing_rank, 10);
        return !isNaN(itemRank) && itemRank >= userRank;
      },
    ];
  },
  getSort: () => [["closing_rank", "ASC"]],
};

export const gujcetConfig = {
  name: "GUJCET",
  code: "GUJCET",
  searchKeys: ["College Name", "District", "Course"],
  // Default is the ACPC merit RANK, which is what Engineering and Pharmacy
  // students actually hold: ACPC publishes a merit number on the merit card and
  // runs its own estimated-rank tool, so a rank is a real thing a student can
  // look up. The old "Enter Percentage Score" field asked instead for the
  // composite merit SCORE and compared it straight against closing_marks —
  // which silently assumed the student had already computed ACPC's 50:50
  // themselves, while the label invited them to type a Class 12 percentage.
  primaryInput: integerInput("Enter ACPC Merit Rank", "e.g., 6450"),
  // Medical is the exception: those rows carry raw NEET scores (28..690 of 720)
  // and NO rank at all, so it keeps a score input.
  refinePrimaryInput: (base, formData) => {
    if (formData?.program !== "Medical") return base;
    return {
      ...decimalInput("Enter NEET Score (out of 720)", "e.g., 545", "720"),
      helperText:
        "Gujarat's medical seats are allotted on the NEET score, not a GUJCET percentage or an ACPC rank.",
    };
  },
  fields: [
    {
      name: "category",
      label: "Select Category",
      // Engineering + Pharmacy now carry all seven ACPC categories. Medical is
      // still the older two-category source, so a student picking SEBC/SC/EWS
      // with Program=Medical correctly gets nothing rather than a wrong answer.
      // SEBC is Gujarat's OBC label — a real category, not a synonym for OBC.
      // TFWS (tuition-fee waiver) and ESM (ex-servicemen) are horizontal pools.
      //
      // Labels are bare codes on purpose: pages/index.js submits
      // selectedOption.label and this config's filter does
      // query.category.toLowerCase(), so a decorated label ("SEBC (Gujarat
      // OBC)") lowercases to "sebc (gujarat obc)" and matches NOTHING. The
      // legend below spells the codes out instead.
      options: [
        { value: "general", label: "General" },
        { value: "sebc", label: "SEBC" },
        { value: "ews", label: "EWS" },
        { value: "sc", label: "SC" },
        { value: "st", label: "ST" },
        { value: "tfws", label: "TFWS" },
        { value: "esm", label: "ESM" },
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
  // A function so the notes follow the program: the ACPC merit-rank note is
  // meaningless on Medical, which is ranked on NEET. Kept deliberately short —
  // these render as inline chips above the table, and long sentences turn the
  // whole strip into a wall of text.
  legend: (row) => {
    const shared = [
      { key: "SEBC", value: "Gujarat's OBC category" },
      { key: "TFWS", value: "Tuition Fee Waiver (income-based)" },
      { key: "ESM", value: "Ex-Servicemen" },
    ];
    if (row?.Program === "Medical") {
      return [...shared, { key: "Medical", value: "Ranked on NEET score" }];
    }
    return [
      ...shared,
      { key: "Merit rank", value: "From your ACPC merit card" },
      {
        key: "Merit score",
        value: "50% Class 12 PCM theory + 50% GUJCET, both percentile",
      },
    ];
  },

  getDataPath: () => {
    return path.join(process.cwd(), "public/data/GUJCET/GUJCET.json");
  },
  getFilters: (query) => {
    return [
      (item) => {
        if (query.category) {
          return item.category === query.category.toLowerCase();
        }
        return true;
      },
      (item) => {
        if (query.program) {
          return item.Program === query.program;
        }
        return true;
      },
    ];
  },
  // Merit rank ASC (hardest seat first) with the composite percentile DESC as
  // the tiebreaker. Ordering the results the same way the student's own input
  // is measured keeps "how close am I?" readable down the page. Medical is the
  // reverse case — raw NEET marks, no rank at all — so it falls through to the
  // second key. Nulls sort last in either direction (see exam-result.js), which
  // is what keeps the 8 pharmacy ESM rows (null percentile, real rank) ordered.
  getSort: () => [
    ["closing_rank", "ASC"],
    ["closing_marks", "DESC"],
  ],
};

export const wbjeeConfig = {
  name: "WBJEE",
  searchKeys: ["Institute", "Academic Program Name"],
  // WBJEE counsels on the General Merit Rank (GMR) — a single state-wide
  // rank list. Not comparable to JEE Main ranks even for the "JEE(Main)
  // Seats" rows: those seats are ALLOTTED via JEE Main scores but WBJEEB
  // still publishes their OR/CR as GMR positions.
  primaryInput: integerInput(
    "Enter WBJEE General Merit Rank (GMR)",
    "Enter WBJEE GMR"
  ),
  fields: [
    {
      name: "category",
      label: "Select Category",
      // Reserved categories exist ONLY under the Home State quota in the
      // ORCR — every All India bucket is Open. Without this note a student
      // picking OBC + All India gets an empty result that reads like a
      // rank problem when it is counselling policy.
      helperText:
        "Reserved categories (EWS, OBC, SC, ST) apply to Home State (West Bengal domicile) seats only. For All India quota seats, everyone competes as Open.",
      // 2026's own vocabulary, verbatim (label == value). WBJEE merged the
      // former OBC-A / OBC-B sub-pools into one "OBC" from 2026, so the old
      // sub-pool names must NOT appear here — they'd match zero rows.
      // Tuition Fee Waiver is a separate seat pool with its own (much
      // tighter) closing ranks, so it is offered as its own option rather
      // than mixed into the open list.
      options: [
        { value: "Open", label: "Open" },
        { value: "EWS", label: "EWS" },
        { value: "OBC", label: "OBC" },
        { value: "SC", label: "SC" },
        { value: "ST", label: "ST" },
        { value: "Open (PwD)", label: "Open (PwD)" },
        { value: "OBC (PwD)", label: "OBC (PwD)" },
        { value: "SC (PwD)", label: "SC (PwD)" },
        { value: "ST (PwD)", label: "ST (PwD)" },
        { value: "Tuition Fee Waiver", label: "Tuition Fee Waiver" },
      ],
    },
    {
      name: "quota",
      label: "Select Quota",
      // Home State = West Bengal domicile seats; All India is open to
      // everyone. Separate competitions with separate closing ranks.
      // label == value, pinned: the form submits the LABEL as the query
      // value (found in the browser audit — a "(West Bengal domicile)"
      // suffix reached the filter verbatim and matched zero rows).
      options: [
        { value: "Home State", label: "Home State" },
        { value: "All India", label: "All India" },
      ],
    },
    {
      name: "seatType",
      label: "Select Seat Type",
      // WBJEEB fills some seats from the WBJEE merit list and some from
      // JEE(Main) applicants — two separate pools in the same colleges.
      options: [
        { value: "WBJEE Seats", label: "WBJEE Seats" },
        { value: "JEE(Main) Seats", label: "JEE(Main) Seats" },
      ],
    },
    {
      name: "collegeType",
      label: "Select College Type",
      options: [
        "Any",
        "Government",
        "Government Aided",
        "State University",
        "Private",
      ],
    },
  ],
  getDataPath: () => {
    return path.join(
      process.cwd(),
      "public",
      "data",
      "WBJEE",
      "wbjee_data.json"
    );
  },
  getFilters: (query) => [
    (item) => item.Category === query.category,
    (item) => item.Quota === query.quota,
    (item) => item["Seat Type"] === query.seatType,
    (item) =>
      query.collegeType === "Any" || item["College Type"] === query.collegeType,
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

export const keamConfig = {
  name: "KEAM",
  searchKeys: ["Institute", "Academic Program Name"],
  // KEAM allots on the KEAM engineering rank - a single state rank list.
  primaryInput: integerInput("Enter KEAM Rank", "Enter KEAM rank"),
  fields: [
    {
      name: "category",
      label: "Select Category",
      // Labels decode the code in the option itself, NEETUG home-state
      // style: "CODE — description", with getFilters comparing only the
      // code before the separator (the form submits the label). The 13
      // published columns + FW; the long tail of college-specific
      // special-seat codes (MM, Y-series...) is deliberately not offered -
      // each would return a near-empty result.
      helperText:
        "SEBC community seats need Kerala's state community certificate; central OBC certificates are not valid in Kerala.",
      options: [
        "SM — State Merit (open to all)",
        "EZ — Ezhava",
        "MU — Muslim",
        "LA — Latin Catholic and Anglo-Indian",
        "DV — Dheevara",
        "VK — Viswakarma",
        "BH — Billava and Other Backward Hindu",
        "BX — Backward Christian",
        "KN — Kusavan",
        "KU — Kudumbi",
        "SC — Scheduled Caste",
        "ST — Scheduled Tribe",
        "EW — EWS",
        "FW — Fee Waiver (family income up to Rs 2.5 lakh)",
      ],
    },
    {
      name: "collegeType",
      label: "Select College Type",
      // CEE's Type column has exactly two values; G collapses Government
      // and Government-Aided, so the label says both.
      options: ["Any", "Government/Aided", "Private (Self-financing)"],
    },
  ],
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "KEAM", "keam_data.json");
  },
  getFilters: (query) => [
    // The dropdown label is "CODE — description" and the form submits the
    // label; the data carries the bare code (the NEETUG home-state lesson).
    (item) =>
      item.Category ===
      String(query.category || "")
        .split("—")[0]
        .trim(),
    (item) =>
      query.collegeType === "Any" || item["College Type"] === query.collegeType,
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

export const apEapcetConfig = {
  name: "AP EAPCET",
  searchKeys: ["Institute", "Academic Program Name", "District"],
  // AP EAPCET allots on the AP EAPCET rank - not comparable to TG-EAPCET
  // even though the exam family shares a name from before bifurcation.
  primaryInput: integerInput("Enter AP EAPCET Rank", "Enter AP EAPCET rank"),
  fields: [
    {
      name: "category",
      label: "Select Category",
      // "CODE - description" labels; getFilters compares the code before
      // the separator (the KEAM pattern - the form submits the label).
      // SC is sub-classified I/II/III from 2025 and BC-A..E are AP's own
      // sub-lists, so there is no single SC or OBC option to offer.
      helperText:
        "AP sub-classifies SC into SC-I, SC-II and SC-III (from 2025) and BC into BC-A to BC-E. Pick the sub-group on your caste certificate.",
      options: [
        "OC — Open Competition",
        "OC_EWS — EWS (within OC)",
        "BCA — Backward Class A",
        "BCB — Backward Class B",
        "BCC — Backward Class C",
        "BCD — Backward Class D",
        "BCE — Backward Class E",
        "SCI — Scheduled Caste I",
        "SCII — Scheduled Caste II",
        "SCIII — Scheduled Caste III",
        "ST — Scheduled Tribe",
      ],
    },
    {
      name: "gender",
      label: "Select Seat Pool",
      // The source's own footnote: "Girls are also eligible for Boys
      // seats" - the Boys column is the open-to-all pool, Girls is the
      // 33% women's reservation.
      options: [
        "Boys — open to all candidates",
        "Girls — women's reservation seats",
      ],
    },
    {
      name: "region",
      label: "Select Region",
      // The college's university region: AU (Andhra University area,
      // north/coastal) or SVU (Sri Venkateswara University area,
      // Rayalaseema/south). Private universities publish separate closing
      // ranks per region pool.
      options: [
        { value: "Any", label: "Any" },
        { value: "AU", label: "AU (Andhra University region)" },
        { value: "SVU", label: "SVU (Sri Venkateswara University region)" },
      ],
    },
    {
      name: "collegeType",
      label: "Select College Type",
      options: [
        "Any",
        "Government University",
        "University (Self-finance)",
        "Private",
        "Private University",
      ],
    },
  ],
  getDataPath: () => {
    return path.join(
      process.cwd(),
      "public",
      "data",
      "APEAPCET",
      "apeapcet_data.json"
    );
  },
  getFilters: (query) => [
    (item) =>
      item.Category ===
      String(query.category || "")
        .split("—")[0]
        .trim(),
    (item) =>
      item.Gender ===
      String(query.gender || "")
        .split("—")[0]
        .trim(),
    (item) =>
      query.region === "Any" ||
      item.Region ===
        String(query.region || "")
          .split("(")[0]
          .trim(),
    (item) =>
      query.collegeType === "Any" || item["College Type"] === query.collegeType,
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

export const ojeeConfig = {
  name: "OJEE (Odisha B.Tech)",
  searchKeys: ["Institute", "Academic Program Name"],
  // Odisha admits first-year B.Tech on the JEE (Main) rank through OJEE
  // counselling - the input here is a JEE Main rank, NOT an OJEE exam rank.
  primaryInput: integerInput("Enter JEE (Main) Rank", "Enter JEE Main rank"),
  fields: [
    {
      name: "category",
      label: "Select Category",
      // Odisha's published set is small: General / SC / ST / EW.
      // No OBC/SEBC column exists in the source. TFW is its own seat pool
      // with its own (tighter) curve - offered separately, WBJEE-style.
      options: [
        "General",
        "SC — Scheduled Caste",
        "ST — Scheduled Tribe",
        "EW — EWS",
        "TFW — Tuition Fee Waiver seats",
      ],
    },
    {
      name: "seatType",
      label: "Select Seat Pool",
      options: [
        "Gender Neutral — open to all candidates",
        "Female Only — women's reservation seats",
      ],
    },
    {
      name: "quota",
      label: "Select Quota",
      // HS is the main table (Odisha domicile). AI / OS / OL are the
      // non-domicile pools as the source prints them.
      options: [
        "HS — Home State (Odisha domicile)",
        "AI — All India",
        "OS — Outside State",
        "OL",
      ],
    },
  ],
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "OJEE", "ojee_data.json");
  },
  getFilters: (query) => [
    (item) =>
      item.Category ===
      String(query.category || "")
        .split("—")[0]
        .trim(),
    (item) =>
      item["Seat Type"] ===
      String(query.seatType || "")
        .split("—")[0]
        .trim(),
    (item) =>
      item.Quota ===
      String(query.quota || "")
        .split("—")[0]
        .trim(),
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

export const examConfigs = {
  "JoSAA": josaaConfig,
  "JEE Main-JOSAA": jeeMainJosaaConfig,
  "JEE Main-JAC": jacExamConfig,
  "GUJCET": gujcetConfig,
  "JEE Advanced": jeeAdvancedConfig,
  // "NEET MCC": neetConfig,
  "NEETUG": neetUGConfig,
  "MHT CET": mhtCetConfig,
  "KCET": kcetConfig,
  "TNEA": tneaConfig,
  "WBJEE": wbjeeConfig,
  "KEAM": keamConfig,
  "AP EAPCET": apEapcetConfig,
  "OJEE": ojeeConfig,
  "TGEAPCET": tseApertConfig,
};

export default examConfigs;

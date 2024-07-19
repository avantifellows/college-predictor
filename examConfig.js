import path from "path";

const statesList = [
  "All India",
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

export const jeeMainJossaConfig = {
  name: "JEE Main-JOSAA",
  code: "JEE Main",
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
      name: "roundNumber",
      label: "Select Round Number",
      options: ["1", "2", "3", "4", "5", "6"],
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
  getFilters: (query) => [
    (item) => item.Exam === query.code,
    (item) => parseInt(item.Round, 10) === parseInt(query.roundNumber, 10),
    (item) => item.Gender === query.gender,
    (item) => item.Quota === "OS" || "AI",
    (item) => item.State === query.homeState || "All India",
  ],
};

export const jacExamConfig = {
  code: "JEE Main",
  name: "JEE Main-JAC",
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
  legend: [
    { key: "D", value: "Delhi" },
    { key: "OD", value: "Outside Delhi" },
  ],
  getDataPath: () => {
    return path.join(process.cwd(), "public", "data", "JEE", "jac_data.json");
  },
  getFilters: (query) => [
    (item) => item.State === query.homeState,
    (item) => item.Category === query.category,
    (item) => item.Defense === query.isDefenseWard,
    (item) => item.PWD === query.isPWD,
    (item) => item.Gender === query.gender,
    (item) =>
      parseInt(item["Closing Rank"], 10) > 0.9 * parseInt(query.rank, 10),
  ],
};

export const jeeAdvancedConfig = {
  name: "JEE Advanced",
  code: "JEE Advanced",
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
      name: "roundNumber",
      label: "Select Round Number:",
      options: ["1", "2", "3", "4", "5", "6"],
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
  getFilters: (query) => [
    (item) => item.Exam === query.code,
    (item) => parseInt(item.Round, 10) === parseInt(query.roundNumber, 10),
    (item) => item.Gender === query.gender,
    (item) => item.Quota === "OS" || "AI",
    (item) => item.State === query.homeState || "All India",
  ],
};

export const neetConfig = {
  name: "NEET",
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
      name: "roundNumber",
      label: "Select Round Number:",
      options: ["1", "2", "3", "4", "5", "6"],
    },
  ],
  legend: [
    { key: "AI", value: "All India" },
    { key: "SQ", value: "State Quota" },
  ],
  getDataPath: (category) => {
    return path.join(
      process.cwd(),
      "public",
      "data",
      "NEET",
      `${category}.json`
    );
  },
  getFilters: (query) => [
    (item) => item["Seat Type"].toLowerCase() === query.category.toLowerCase(),
    (item) => item.Round.toString() === query.roundNumber,
  ],
};

export const mhtCetConfig = {
  name: "MHT CET",
  apiEndpoint: "mhtcet",
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
    (item) => item.Category === query.category,
    (item) => item.Gender === query.gender,
    (item) => item.State === query.homeState,
    (item) => item.PWD === (query.isPWD === "Yes"),
    (item) => item.Defense === (query.isDefenseWard === "Yes"),
  ],
};

export const kcetConfig = {
  name: "KCET",
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
    { key: "HK", label: "Hyderabad-Karnataka Region" },
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
  ],
};

export const examConfigs = {
  "JEE Main-JOSAA": jeeMainJossaConfig,
  "JEE Main-JAC": jacExamConfig,
  "JEE Advanced": jeeAdvancedConfig,
  "NEET": neetConfig,
  "MHT CET": mhtCetConfig,
  "KCET": kcetConfig,
};

export default examConfigs;

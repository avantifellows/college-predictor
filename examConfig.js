import path from "path";

/**
 * This file contains configuration objects for various exams such as JEE Main-JOSAA, JEE Main-JAC, JEE Advanced, NEET, and MHT CET.
 * Each configuration object includes details like the exam name, code, form fields, legends, and methods to get data paths and filters.
 * These configurations are used to dynamically generate forms and filter data based on user inputs in the index.js and college_predictor.js files.
 */

/**
 * Example URL with query parameters for JEE Main-JOSAA
 *  http://futures.avantifellow.com/api/exam-result?exam=JEE%20Main&roundNumber=2&gender=Female-only%20(including%20Supernumerary)&homeState=Karnataka&category=obc_ncl
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

export const jeeMainJosaaConfig = {
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
    const baseFilters = [
      (item) => item.Exam === query.code,
      (item) => item.Gender === query.gender,
      (item) => {
        if (query.program === "Architecture") {
          return item["Academic Program Name"]
            .toLowerCase()
            .includes("architecture");
        } else if (query.program === "Planning") {
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
    return [
      ...baseFilters,
      (item) => {
        // Always include 'AI' quota items
        if (item.Quota === "AI") {
          return true;
        }
        // For HS/OS quota, apply state matching
        if (query.homeState === item.State) {
          return item.Quota === "HS";
        } else {
          return item.Quota === "OS";
        }
      },
    ];
  },
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
      (item) => item.Exam === query.code,
      (item) => item.Gender === query.gender,
    ];

    // query.homeState will now always be a specific state (not "All India")
    return [
      ...baseFilters,
      (item) => {
        // Always include 'AI' quota items
        if (item.Quota === "AI") {
          return true;
        }
        // For HS/OS quota, apply state matching
        if (query.homeState === item.State) {
          return item.Quota === "HS";
        } else {
          return item.Quota === "OS";
        }
      },
    ];
  },
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
    (item) => item.PWD === query.isPWD,
    (item) => item.Defense === query.isDefenseWard,
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

export const tneaConfig = {
  name: "TNEA",
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
        "Any",
        "Ariyalur",
        "Chengalpattu",
        "Chennai",
        "Coimbatore",
        "Cuddalore",
        "Dharmapuri",
        "Dindigul",
        "Erode",
        "Hazaribagh",
        "Idukki",
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
    (item) => item.Course === query.courseType,
    (item) => item.District === query.district || "Any" === query.district,
    (item) =>
      item["College Type"] === query.collegeType || "Any" === query.collegeType,
  ],
};

export const josaaConfig = {
  name: "JoSAA",
  code: "JoSAA",
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
    const baseFilters = [
      (item) => item.Gender === query.gender,
      (item) => {
        if (query.program === "architecture") {
          return item["Academic Program Name"]
            .toLowerCase()
            .includes("architecture");
        } else if (query.program === "planning") {
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
          !isNaN(closingRank) && !isNaN(mainRank) && closingRank >= 0.9*mainRank
        );
      });
    }

    // JEE Advanced filter - only apply if user qualified and provided his jee adv rank
    if (
      query.qualifiedJeeAdv === "Yes" &&
      query.advRank &&
      query.advRank.toString().trim() !== ''
    ) {
      const advRankStr = query.advRank.toString().trim();
      const hasPSuffix = advRankStr.endsWith('P');
      const numericAdvRank = parseInt(advRankStr.replace(/[^0-9]/g, '')) || 0;
      
      examFilters.push((item) => {
        const closingRankStr = String(item["Closing Rank"] || '').trim();
        const hasClosingPSuffix = closingRankStr.endsWith('P');
        
        // If input has 'P' suffix, only match ranks that also have 'P' suffix
        // If input doesn't have 'P' suffix, only match ranks that also don't have 'P' suffix
        if (hasPSuffix !== hasClosingPSuffix) {
          return false;
        }
        
        // Compare numeric values
        const numericClosingRank = parseInt(closingRankStr.replace(/[^0-9]/g, '')) || 0;
        return numericClosingRank >= 0.9 * numericAdvRank;
      });
    }

    // If no valid ranks are provided, returning empty false
    if (examFilters.length === 0) {
      return [...baseFilters, () => false];
    }

    // State filter
    const stateFilter = (item) => {
      // Always include 'AI' quota items
      if (item.Quota === "AI") {
        return true;
      }
      // For HS/OS quota, apply state matching
      if (query.homeState === item.State) {
        return item.Quota === "HS";
      } else {
        return item.Quota === "OS";
      }
    };

    // Combine all filters - a row should match if it passes either rank filter
    return [
      ...baseFilters,
      (item) => examFilters.some((filter) => filter(item)),
      stateFilter,
    ];
  },
};

export const examConfigs = {
  "JEE Main-JOSAA": jeeMainJosaaConfig,
  "JEE Main-JAC": jacExamConfig,
  "JEE Advanced": jeeAdvancedConfig,
  "JoSAA": josaaConfig,
  "NEET": neetConfig,
  "MHT CET": mhtCetConfig,
  "KCET": kcetConfig,
  "TNEA": tneaConfig,
};

export default examConfigs;

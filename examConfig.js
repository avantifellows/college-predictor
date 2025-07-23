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

// export const neetConfig = {
//   name: "NEET MCC",
//   code: "NEET MCC",
//   fields: [
//     {
//       name: "program",
//       label: "Select Program",
//       options: [
//         { value: "MBBS", label: "MBBS" },
//         { value: "BDS", label: "BDS" },
//         { value: "BSC Nursing", label: "BSC Nursing" },
//       ],
//     },
//     {
//       name: "gender",
//       label: "Select Gender",
//       options: [
//         { value: "Open", label: "Open" },
//         { value: "Female", label: "Female" },
//       ],
//     },
//     {
//       name: "category",
//       label: "Select Category",
//       options: [
//         { value: "EWS", label: "EWS" },
//         { value: "EWS PwD", label: "EWS PwD" },
//         { value: "Open", label: "Open" },
//         { value: "Open PwD", label: "Open PwD" },
//         { value: "OBC", label: "OBC" },
//         { value: "OBC PwD", label: "OBC PwD" },
//         { value: "SC", label: "SC" },
//         { value: "SC PwD", label: "SC PwD" },
//         { value: "ST", label: "ST" },
//         { value: "ST PwD", label: "ST PwD" },
//       ],
//     },
//     {
//       name: "religion",
//       label: "Select Religion",
//       options: [
//         { value: "jain", label: "Jain" },
//         { value: "muslim", label: "Muslim" },
//         { value: "other", label: "Other" },
//       ],
//     },
//     {
//       name: "nationality",
//       label: "Select Nationality",
//       options: [
//         { value: "indian", label: "Indian" },
//         { value: "non resident", label: "Non Resident" },
//         { value: "other", label: "Other" },
//       ],
//     },
//     {
//       name: "region",
//       label: "Select Region",
//       options: [
//         { value: "delhi ncr", label: "Delhi NCR" },
//         { value: "puducherry", label: "Puducherry" },
//         { value: "other", label: "Other" },
//       ],
//     },
//     {
//       name: "defence_war",
//       label: "Defence War Quota",
//       options: [
//         { value: "Yes", label: "Yes" },
//         { value: "No", label: "No" },
//       ],
//     },
//   ],
//   legend: [
//     { key: "AI", value: "All India" },
//     { key: "SQ", value: "State Quota" },
//   ],
//   getDataPath: () => {
//     return path.join(process.cwd(), "public/data/NEET/NEET.json");
//   },
//   getFilters: (query) => {
//     console.log(query)
//     // Helper to normalize program names for comparison
//     const normalize = (str) =>
//       String(str || "")
//         .replace(/[^a-zA-Z0-9]/g, "")
//         .toLowerCase();
//     return [
//       (item) => {
//         if (query.program) {
//           return (
//             normalize(item["Academic Program Name"]) ===
//             normalize(query.program)
//           );
//         }
//         return true;
//       },
//       (item) => {
//         if (query.gender === "Female") {
//           return (
//             item["Seat Type"].includes("Female") || item.gender === "Female"
//           );
//         }
//         return true;
//       },
//       (item) => {
//         if (query.category) {
//           const seatType = String(item["Seat Type"] || "").toLowerCase();
//           const isPWD = String(item["is_PWD"] || "No").toLowerCase();
//           const queryCat = query.category.toLowerCase();

//           // If user selected a PwD category, require is_PWD to be yes
//           if (queryCat.includes("pwd")) {
//             return (
//               isPWD === "yes" &&
//               seatType.includes(queryCat.replace(/\s+pwd$/, ""))
//             );
//           }
//           // If user selected a non-PwD category, require is_PWD to be no
//           return isPWD === "no" && seatType === queryCat;
//         }
//         return true;
//       },
//       (item) => {
//         // 0.9 * rank coefficient filter for NEET closing rank
//         if (query.rank) {
//           const closingRank = parseInt(item["Closing Rank"], 10);
//           const userRank = parseInt(query.rank, 10);
//           if (!isNaN(closingRank) && !isNaN(userRank)) {
//             return closingRank >= 0.9 * userRank;
//           }
//         }
//         return true;
//       },
//       (item) => {
//         if (query.defence_war === "Yes") {
//           return item.quota && item.quota.toLowerCase().includes("defence");
//         } else if (query.defence_war === "No") {
//           return !item.quota || !item.quota.toLowerCase().includes("defence");
//         }
//         return true;
//       },
//     ];
//   },
//   getSort: () => [["Closing Rank", "ASC"]],
// };
// New NEET UG Exam
// Mapping from filter values to database values for seat type


const seatTypeMap = {
  "All India/Open Seat":"Open Seat",
  "Deemed/Paid": "Deemed/Paid Seats",
  "Non-Resident Indian": "Non-Resident Indian",
  "Foreign National": "Foreign Country",
  "Aligarh Muslim University": "Aligarh Muslim University (AMU)",
  "Employees State Insurance": "Employees State Insurance Scheme(ESI)",
  "Jamia": "Jamia Internal",
  "Delhi University": "Delhi University",
};


export const neetUGConfig = {
  name: "NEETUG",
  code: "NEETUG",
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
      name: "religion",
      label: "Select Religion",
      options: [
        { value: "jain", label: "Jain" },
        { value: "muslim", label: "Muslim" },
        { value: "other", label: "Other" },
      ],
    },
    {
      name: "nationality",
      label: "Select Nationality",
      options: [
        { value: "indian", label: "Indian" },
        { value: "non resident", label: "Non Resident" },
        { value: "other", label: "Other" },
      ],
    },
    {
      name: "region",
      label: "Select Region",
      options: [
        { value: "delhi ncr", label: "Delhi NCR" },
        { value: "puducherry", label: "Puducherry" },
        { value: "other", label: "Other" },
      ],
    },
    {
      name: "defence_war",
      label: "Defence War Quota",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
    },
    {
      name: "seat_type",
      label: "Seat Type",
      options: [
        { value: "Any", label: "Any" },
        { value: "All India/Open Seat", label: "All India/Open Seat" },
        { value: "Deemed/Paid", label: "Deemed/Paid" },
        { value: "Non-Resident Indian", label: "Non-Resident Indian" },
        { value: "Foreign National", label: "Foreign National" },
        { value: "Aligarh Muslim University", label: "Aligarh Muslim University" },
        { value: "Employees State Insurance", label: "Employees State Insurance" },
        { value: "Jamia", label: "Jamia" },
        { value: "Delhi University", label: "Delhi University" },
      ],
    },
  ],
  legend: [
    { key: "AI", value: "All India" },
    { key: "SQ", value: "State Quota" },
  ],
  getDataPath: () => {
    return path.join(process.cwd(), "public/data/NEETUG/NEETUG.json");
  },
  getFilters: (query) => {
    console.log(query)
    // Helper to normalize program names for comparison
    const normalize = (str) =>
      String(str || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
    return [
      (item) => {
        if (query.program) {
          return (
            normalize(item["Academic Program Name"]) ===
            normalize(query.program)
          );
        }
        return true;
      },
      (item) => {
        if (query.gender === "Open") {
          // Only show items where Gender is exactly 'Open'
          return item["Gender"] === "Open" || item.gender === "Open";
        } else if (query.gender === "Female") {
          // Show items where Gender is 'Female' or 'Open'
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
         return(
          item["Category"]==query.category
         ) 
         
        }
        return true;
      },
      (item) => {
        if (query.religion!="Other" ) {
         return(
          item["Seat Type"]==query.religion
         ) 
        }
        return true;
      },
      (item) => {
        // If seat_type is 'All India' (Any), skip filtering
        
        if (query.seat_type && String(query.seat_type).trim().toLowerCase() !== "any") {
          const dbValue = seatTypeMap[query.seat_type] || query.seat_type;
          if(dbValue=="Open Seat"){
            return(
              String(item["Seat Type"]||"").trim().toLowerCase()===String(dbValue).trim().toLowerCase()
              ||
              String(item["Seat Type"]||"").trim().toLowerCase()===String("All India").trim().toLowerCase()
            )
          }
          return (
            String(item["Seat Type"] || "").trim().toLowerCase() ===
            String(dbValue).trim().toLowerCase()
          );
        }
        return true;
      },
      (item) => {
        // 0.9 * rank coefficient filter for NEET closing rank
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
      name: "preferHomeState",
      label: (values) =>
        `Do you want us to list colleges in ${
          values.homeState || "your home state"
        } first?`,
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
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
      (item) => item.Gender === query.gender || item.Gender === "All",
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

export const tseApertConfig = {
  name: "TGEAPCET",
  code: "TGEAPCET",
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
    const queryCategory = query.category?.toUpperCase().replace(/-/g, "_");
    const queryGender = query.gender?.toLowerCase();
    const queryRegion = query.region;

    const baseFilters = [
      (item) => {
        // Case 1: If EWS category is selected, also include OC category
        if (queryCategory === "EWS") {
          return item.category === "EWS" || item.category === "OC";
        }
        // Normal category matching
        return item.category === queryCategory;
      },
      (item) => {
        // Gender filter
        return item.gender?.toLowerCase() === queryGender;
      },
      (item) => {
        // Only include items where closing_rank is greater than or equal to user's rank
        const itemRank = parseInt(item.closing_rank, 10);
        return !isNaN(itemRank) && itemRank >= userRank;
      },
    ];

    // Add region filter if specified
    if (queryRegion) {
      baseFilters.push((item) => {
        // Case 2: If OU region is selected, also include items with same category/gender from Other region
        if (queryRegion === "OU") {
          return item.region === "OU" || item.region === "other";
        }
        // For Other region, only include items from Other region
        return item.region !== "OU";
      });
    }

    return baseFilters;
  },
};

export const gujcetConfig = {
  name: "GUJCET",
  code: "GUJCET",
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
  getSort: () => [["closing_marks", "DESC"]], // Sort by closing_marks in descending order
};

export const examConfigs = {
  "JEE Main-JOSAA": jeeMainJosaaConfig,
  "JEE Main-JAC": jacExamConfig,
  "GUJCET": gujcetConfig,
  "JEE Advanced": jeeAdvancedConfig,
  // "NEET MCC": neetConfig,
  "NEETUG": neetUGConfig,
  "MHT CET": mhtCetConfig,
  "KCET": kcetConfig,
  "TNEA": tneaConfig,
  "JoSAA": josaaConfig,
  "TGEAPCET": tseApertConfig,
};

export default examConfigs;

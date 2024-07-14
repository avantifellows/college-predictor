const statesList = [
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
  code: "JEE Main",
  name: "JEE MAIN-JOSAA",
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "ews", label: "EWS" },
        { value: "ews_pwd", label: "EWS PWD" },
        { value: "obc_ncl", label: "OBC NCL" },
        { value: "obc_ncl_pwd", label: "OBC NCL PWD" },
        { value: "open", label: "OPEN" },
        { value: "open_pwd", label: "OPEN PWD" },
        { value: "sc", label: "SC" },
        { value: "sc_pwd", label: "SC PWD" },
        { value: "st", label: "ST" },
        { value: "st_pwd", label: "ST PWD" },
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
};
export const jeeAdvancedConfig = {
  name: "JEE Advanced",
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "ews", label: "EWS" },
        { value: "ews_pwd", label: "EWS PWD" },
        { value: "obc_ncl", label: "OBC NCL" },
        { value: "obc_ncl_pwd", label: "OBC NCL PWD" },
        { value: "open", label: "OPEN" },
        { value: "open_pwd", label: "OPEN PWD" },
        { value: "sc", label: "SC" },
        { value: "sc_pwd", label: "SC PWD" },
        { value: "st", label: "ST" },
        { value: "st_pwd", label: "ST PWD" },
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
};

export const neetConfig = {
  name: "NEET",
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "ews_pwd", label: "EWS (PwD)" },
        { value: "ews", label: "EWS" },
        { value: "obc_ncl_pwd", label: "OBC-NCL (PwD)" },
        { value: "obc_ncl", label: "OBC-NCL" },
        { value: "open_pwd", label: "OPEN (PwD)" },
        { value: "open", label: "OPEN" },
        { value: "sc_pwd", label: "SC (PwD)" },
        { value: "sc", label: "SC" },
        { value: "st_pwd", label: "ST (PwD)" },
        { value: "st", label: "ST" },
      ],
    },
    {
      name: "roundNumber",
      label: "Select Round Number:",
      options: ["1", "2", "3", "4", "5", "6"],
    },
  ],
};

export const mhtCetConfig = {
  name: "MHT CET",
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
};

export const examConfigs = {
  "JEE Main - JOSAA": jeeMainJossaConfig,
  "JEE Main - JAC": jacExamConfig,
  "JEE Advanced": jeeAdvancedConfig,
  NEET: neetConfig,
  "MHT CET": mhtCetConfig,
  KCET: kcetConfig,
};
export default examConfigs;

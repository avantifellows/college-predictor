import { statesList } from "./examConfig";

export const scholarshipConfig = {
  name: "Scholarship Finder",
  fields: [
    {
      name: "status",
      label: "Enter Scholarship Status",
      options: [
        { value: "Open", label: "Open" },
        { value: "Closed", label: "Closed" },
        { value: "show_both", label: "Both" },
      ],
    },
    {
      name: "grade",
      label: "Enter Grade",
      options: [
        { value: "10", label: "Currently in 10th or below" },
        { value: "11", label: "Currently in 11th" },
        { value: "12", label: "Currently in 12th" },
        { value: "12_pass", label: "12th Pass/ Currently in 1st Year" },
        { value: "UG", label: "Currently in UG 2nd/3rd/4th year" },
        { value: "PG", label: "Currently in PG" },
        { value: "Diploma", label: "Currently in Diploma" },
      ],
    },
    {
      name: "stream",
      label: "Enter Stream",
      options: [
        { value: "Engineering (BTech)", label: "Engineering (BTech)" },
        { value: "Medical (MBBS)", label: "Medical (MBBS)" },
        { value: "Medical (BDS)", label: "Medical (BDS)" },
        { value: "Pharmacy (BPharm)", label: "Pharmacy (BPharm)" },
        { value: "Nursing (BSc)", label: "Nursing (BSc)" },
        { value: "Architecture (BArch)", label: "Architecture (BArch)" },
        { value: "Law (LLB)", label: "Law (LLB)" },
        { value: "Management (BBA/MBA)", label: "Management (BBA/MBA)" },
        { value: "Science (BSc)", label: "Science (BSc)" },
        { value: "School", label: "School" },
        { value: "Commerce (BCom)", label: "Commerce (BCom)" },
        { value: "Arts", label: "Arts" },
        { value: "PG", label: "PG" },
        { value: "Diploma", label: "Diploma" },
        { value: "ITI", label: "ITI" },
        { value: "BCA", label: "BCA" },
        { value: "Any", label: "Any" },
      ],
    },
    {
      name: "gender",
      label: "Select Gender",
      options: [
        { value: "Any", label: "Any" }, // New option added
        { value: "Others", label: "Others" },
        { value: "Both", label: "Male Only" }, // This is for handling the case when the scholarship is open for both.
        { value: "Female", label: "Female Only" },
      ],
    },
    {
      name: "familyIncome",
      label: "Enter your annual family income in lakhs",
      helperText: [
        "Scholarships might have specific eligibility within the range check requirements",
      ],
      options: [
        { value: "3", label: "Up to 3 lakhs per annum" },
        { value: "4", label: "Up to 4 lakhs per annum" },
        { value: "6", label: "Up to 6 lakhs per annum" },
        { value: "8", label: "Up to 8 lakhs per annum" },
        { value: "above", label: "More than 8 lakhs per annum" },
        { value: "Any", label: "Any" },
      ],
    },
    // {
    //   name: "category",
    //   label: "Select Category",
    //   options: [
    //     { value: "OPEN", label: "OPEN" },
    //     { value: "SC", label: "SC" },
    //     { value: "ST", label: "ST" },
    //     { value: "Minority", label: "Minority" },
    //     { value: "General", label: "General" },
    //   ],
    // },
    {
      name: "state",
      label: "Select Your Home State",
      options: statesList,
    },
  ],
};

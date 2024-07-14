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
        { value: "11", label: "Class 11" },
        { value: "12", label: "Class 12" },
        { value: "12th pass", label: "12th Passed" },
        { value: "2nd/3rd year", label: "UG" },
        { value: "PG", label: "PG" },
        { value: "Diploma/ITI", label: "Diploma/ITI" },
      ],
    },
    {
      name: "stream",
      label: "Enter Stream:",
      options: [
        { value: "Engineering", label: "Engineering" },
        { value: "Medical", label: "Medical" },
        { value: "LLB", label: "LLB" },
        { value: "STEM", label: "STEM" },
        { value: "School", label: "School" },
        { value: "PG", label: "PG" },
        { value: "Diploma", label: "Diploma" },
        { value: "Others", label: "Others" },
      ],
    },
    {
      name: "gender",
      label: "Select Gender",
      options: [
        { value: "Both", label: "Show Both" },
        { value: "Both", label: "Male Only" }, // This is for handling the case when the scholarship is open for both.
        { value: "Only Girls", label: "Only Girls" },
      ],
    },
    {
      name: "familyIncome",
      label: "Enter your annual family income in lakhs",
      helperText: [
        "For example, Rs. 1,20,000 to be entered as 1.2",
        "Scholarships might have specific eligibility within the range check requirements",
      ],
      options: [
        { value: "2", label: "Up to 2 Lakh" },
        { value: "4", label: "Up to 4 Lakh" },
        { value: "6", label: "Up to 6 Lakh" },
        { value: "8", label: "Up to 8 Lakh" },
        { value: "10", label: "Up to 10 Lakh" },
        { value: "above", label: "Above 10 Lakh" },
      ],
    },
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "open", label: "OPEN" },
        { value: "sc", label: "SC" },
        { value: "st", label: "ST" },
        { value: "Minority", label: "Minority" },
        { value: "General", label: "General" },
      ],
    },
  ],
};

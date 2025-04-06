import axios from "axios";

export default async function handler(req, res) {
  const {
    status,
    grade,
    stream,
    gender,
    // category,
    familyIncome,
    state: homeState,
  } = req.query;

  // Parse array inputs
  const streams = stream ? stream.split(',') : [];
  const states = homeState ? homeState.split(',') : [];

  try {
    const s3Url = `https://avantifellows-assets.s3.ap-south-1.amazonaws.com/futures/scholarship_data.json`;
    const response = await axios.get(s3Url);
    const scholarships = response.data;
    // Helper function for flexible string matching
    const flexMatch = (value, target) => {
      if (Array.isArray(value)) {
        return value.some((v) => flexMatch(v, target));
      }
      return value?.toString().toLowerCase().includes(target.toLowerCase());
    };

    // List of filtering criteria
    const filters = [
      (scholarship) => {
        const result =
          !status || scholarship.Status === status || status === "show_both";
        return result;
      },
      (scholarship) => {
        const scholarshipGrades = Array.isArray(scholarship.Grade)
          ? scholarship.Grade
          : [scholarship.Grade];

        const result =
          !grade ||
          scholarshipGrades.some(
            (g) => flexMatch(g, grade)
            // (grade === "12" && flexMatch(g, "12th pass")) ||
            // (grade === "12" && flexMatch(g, "2nd/3rd year"))
          );
        return result;
      },
      (scholarship) => {
        if (!stream || stream === "Any") return true;
        return streams.some(s => flexMatch(scholarship["Stream"], s)) || scholarship.Stream == null;
      },
      (scholarship) => {
        const result =
          !gender ||
          gender === "Any" || // Added functionality for "Any"
          scholarship.Gender === "Both" ||
          flexMatch(scholarship.Gender, gender) ||
          scholarship.Gender == null;
        return result;
      },
      // (scholarship) => {
      //   const result =
      //     !category ||
      //     flexMatch(scholarship.Category, category) ||
      //     scholarship.Category.length === 0;
      //   return result;
      // },
      (scholarship) => {
        const scholarshipIncome = scholarship["Family Income (in INR)"];
        try {
          if (!familyIncome) return true;
          if (scholarshipIncome === null) return true;
          if (familyIncome === "above") return true;
          
          const parsedScholarshipIncome = parseFloat(scholarshipIncome);
          const parsedFamilyIncome = parseFloat(familyIncome);
          
          if (isNaN(parsedScholarshipIncome) || isNaN(parsedFamilyIncome)) {
            throw new Error("Invalid income format");
          }
          
          return parsedScholarshipIncome >= parsedFamilyIncome;
        } catch (error) {
          console.error("Error processing family income:", error);
          return false;
        }
      },
      (scholarship) => {
        if (!homeState) return true;
        return states.some(s => flexMatch(scholarship.State, s)) ||
               flexMatch(scholarship.State, "All India") ||
               scholarship.State === null;
      },
    ];

    // Filter scholarships using every method
    const filteredScholarships = scholarships.filter((scholarship) => {
      return filters.every((filter) => filter(scholarship));
    });
    if (filteredScholarships.length === 0) {
      return res.status(404).json({ error: "No scholarships found" });
    }
    res.status(200).json(filteredScholarships);
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({
      error: "Unable to retrieve data",
      details: error.message,
    });
  }
}

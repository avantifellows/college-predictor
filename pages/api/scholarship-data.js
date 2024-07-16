// pages/api/scholarship-api.js

import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  const { status, grade, stream, gender, category, familyIncome } = req.query;
  const dataPath = path.join(
    process.cwd(),
    "public",
    "/data/scholarships/scholarship_data.json",
  );

  try {
    const data = await fs.readFile(dataPath, "utf8");
    const scholarships = JSON.parse(data);
    // List of filtering criteria
    const filters = [
      (scholarship) => !status || scholarship.Status === status,
      (scholarship) => !grade || scholarship.grade.includes(grade.toString()),
      (scholarship) =>
        !stream ||
        scholarship["Open for Stream"].includes(stream) ||
        scholarship["Open for Stream"].length === 0,
      (scholarship) =>
        !gender ||
        scholarship.Gender === "Both" ||
        scholarship.Gender === gender,
      (scholarship) =>
        !category ||
        scholarship.Category.includes(category) ||
        scholarship.Category.length === 0,
      (scholarship) =>
        !familyIncome ||
        scholarship["Family Income"] === null ||
        scholarship["Family Income"] <= familyIncome,
    ];

    // Filter scholarships using every method
    const filteredScholarships = scholarships.filter((scholarship) =>
      filters.every((filter) => filter(scholarship)),
    );

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

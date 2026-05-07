import dataRepository from "../../utils/dataRepository";

export default async function handler(req, res) {
  try {
    const scholarships = await dataRepository.getScholarshipData();
    return res.status(200).json(scholarships);
  } catch (error) {
    console.error("Error loading scholarship data:", error);
    return res.status(500).json({
      error: "Unable to retrieve scholarship data",
      details: error.message,
    });
  }
}

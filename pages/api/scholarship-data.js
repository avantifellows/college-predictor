import fs from "fs/promises";
import path from "path";

let cachedScholarships = null;

export default async function handler(req, res) {
  try {
    if (!cachedScholarships) {
      const dataPath = path.join(
        process.cwd(),
        "public",
        "data",
        "scholarships",
        "scholarship_data.json"
      );
      const data = await fs.readFile(dataPath, "utf8");
      cachedScholarships = JSON.parse(data);
    }
    return res.status(200).json(cachedScholarships);
  } catch (error) {
    console.error("Error loading scholarship data:", error);
    cachedScholarships = null; // reset cache on error so next request retries
    return res.status(500).json({
      error: "Unable to retrieve scholarship data. Please try again later.",
    });
  }
}
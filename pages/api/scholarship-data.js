import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  try {
    const dataPath = path.join(
      process.cwd(),
      "public",
      "data",
      "scholarships",
      "scholarship_data.json"
    );
    const data = await fs.readFile(dataPath, "utf8");
    const scholarships = JSON.parse(data);

    if (!Array.isArray(scholarships)) {
      console.error("Data format error: expected array in scholarship_data.json");
      return res.status(500).json({ error: "Data format error. Please try again later." });
    }

    return res.status(200).json(scholarships);
  } catch (error) {
    console.error("Error loading scholarship data:", error);
    return res.status(500).json({
      error: "Unable to retrieve scholarship data. Please try again later.",
    });
  }
}

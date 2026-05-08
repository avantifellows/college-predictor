import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    return res.status(200).json(scholarships);
  } catch (error) {
    console.error("Error loading scholarship data:", error);
    return res.status(500).json({
      error: "Unable to retrieve scholarship data",
      details: error.message,
    });
  }
}

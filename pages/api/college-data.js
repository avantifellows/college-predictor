// pages/api/college-data.js

import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  const { exam, counselling, category } = req.query;

  const examMap = {
    "JEE Main": "JEE",
    "JEE Advanced": "JEE",
    "MHT CET": "MHTCET",
    KCET: "KCET",
    NEET: "NEET",
  };

  const examFolder = examMap[exam] || "NEET";
  const dataPath =
    examFolder === "MHTCET"
      ? path.join(
          process.cwd(),
          "public",
          "data",
          examFolder,
          "mhtcet_data.json"
        )
      : examFolder === "KCET"
      ? path.join(process.cwd(), "public", "data", examFolder, "kcet_data.json")
      : counselling === "JAC"
      ? path.join(process.cwd(), "public", "data", examFolder, "jac_data.json")
      : path.join(
          process.cwd(),
          "public",
          "data",
          examFolder,
          `${category}.json`
        );

  try {
    const data = await fs.readFile(dataPath, "utf8");
    res.status(200).json(JSON.parse(data));
  } catch (error) {
    console.error("Error reading file:", error);
    res
      .status(500)
      .json({ error: "Unable to retrieve data", details: error.message });
  }
}

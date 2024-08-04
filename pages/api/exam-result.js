import fs from "fs/promises";
import examConfigs from "../../examConfig";

/**
 * Handles the API request for exam results.
 * Example URL with query parameters for JEE Main-JOSAA
 *  http://futures.avantifellow.com/api/exam-result?exam=JEE%20Main&roundNumber=2&gender=Female-only%20(including%20Supernumerary)&homeState=Karnataka&category=obc_ncl
 */
export default async function handler(req, res) {
  const { exam, rank } = req.query;

  if (!exam || !examConfigs[exam]) {
    return res.status(400).json({ error: "Invalid or missing exam parameter" });
  }

  const config = examConfigs[exam];

  // Check for required parameters
  for (const field of config.fields) {
    if (!req.query[field.name]) {
      return res
        .status(400)
        .json({ error: `Missing required parameter: ${field.name}` });
    }
  }

  try {
    const dataPath = config.getDataPath(req.query.category);
    const data = await fs.readFile(dataPath, "utf8");
    const fullData = JSON.parse(data);

    // Get filters based on the exam config and query parameters
    const filters = config.getFilters(req.query);

    // Common rank filter
    const rankFilter = (item) =>
      parseInt(item["Closing Rank"], 10) > 0.9 * parseInt(rank, 10);

    const filteredData = fullData
      .filter((item) => {
        const filterResults = filters.map((filter) => filter(item));

        return filterResults.every((result) => result) && rankFilter(item);
      })
      .sort((a, b) => a["Closing Rank"] - b["Closing Rank"]);

    return res.status(200).json(filteredData);
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({
      error: "Unable to retrieve data",
      details: error.message,
    });
  }
}

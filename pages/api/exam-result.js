import fs from "fs/promises";
import examConfigs from "../../examConfig";
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests. Please try again later.",
    });
  },
});

export default async function handler(req, res) {
  await limiter(req, res, () => {});

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
    const rankFilter = (item) => {
      if (exam == "TNEA") {
        return parseFloat(item["Cutoff Marks"]) <= parseFloat(rank);
      } else {
        return parseInt(item["Closing Rank"], 10) > 0.9 * parseInt(rank, 10);
      }
    };

    const filteredData = fullData
      .filter((item) => {
        const filterResults = filters.map((filter) => filter(item));

        return filterResults.every((result) => result) && rankFilter(item);
      })
      .sort((a, b) => {
        const sortingKey = exam == "TNEA" ? "Cutoff Marks" : "Closing Rank";
        if (exam == "TNEA") {
          return b[sortingKey] - a[sortingKey];
        } else return a[sortingKey] - b[sortingKey];
      });

    return res.status(200).json(filteredData);
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({
      error: "Unable to retrieve data",
      details: error.message,
    });
  }
}

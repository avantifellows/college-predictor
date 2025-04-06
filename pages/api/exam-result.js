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
    console.log("Reading data from:", dataPath);
    console.log("Query parameters:", req.query);
    console.log("Config:", config);
    
    const data = await fs.readFile(dataPath, "utf8");
    console.log("Raw data length:", data.length);
    
    const fullData = JSON.parse(data);
    console.log("Total data items:", fullData.length);

    // Get filters based on the exam config and query parameters
    const filters = config.getFilters(req.query);
    console.log("Applied filters:", filters.length);
    console.log("Filter functions:", filters);

    // Common rank filter
    const rankFilter = (item) => {
      if (exam == "TNEA") {
        return parseFloat(item["Cutoff Marks"]) <= parseFloat(rank);
      } else {
        const closingRank = parseInt(item["Closing Rank"], 10);
        const userRank = parseInt(rank, 10);
        console.log("Comparing ranks - Closing:", closingRank, "User:", userRank);
        return closingRank > 0.9 * userRank;
      }
    };

    const filteredData = fullData
      .filter((item) => {
        const filterResults = filters.map((filter) => {
          try {
            return filter(item);
          } catch (error) {
            console.error("Error in filter:", error);
            console.error("Item:", item);
            return false;
          }
        });
        const rankResult = rankFilter(item);
        console.log("Filter results:", filterResults, "Rank result:", rankResult);
        return filterResults.every((result) => result) && rankResult;
      })
      .sort((a, b) => {
        const sortingKey = exam == "TNEA" ? "Cutoff Marks" : "Closing Rank";
        if (exam == "TNEA") {
          return b[sortingKey] - a[sortingKey];
        } else return a[sortingKey] - b[sortingKey];
      });

    console.log("Final filtered data length:", filteredData.length);
    return res.status(200).json(filteredData);
  } catch (error) {
    console.error("Error in exam-result API:", error);
    console.error("Error stack:", error.stack);
    console.error("Request query:", req.query);
    res.status(500).json({
      error: "Unable to retrieve data",
      details: error.message,
      stack: error.stack
    });
  }
}

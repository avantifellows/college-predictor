import fs from "fs/promises";
import examConfigs from "../../examConfig";
import rateLimit from "express-rate-limit";

// Helper function to get client IP address
const getIp = (req) => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string") {
    return xForwardedFor.split(",")[0].trim();
  }
  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return xForwardedFor[0].trim();
  }
  // Fallback to socket remoteAddress or connection remoteAddress
  return req.socket?.remoteAddress || req.connection?.remoteAddress;
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // trustProxy: true, // Removed as we are using a custom keyGenerator
  keyGenerator: (req, res) => {
    const ip = getIp(req);
    if (!ip) {
      // This is a fallback, but ideally, an IP should always be found.
      // If IP is consistently not found, the getIp logic might need adjustment
      // for your specific environment/proxy setup.
      console.warn(
        "Rate limiter: IP address could not be determined. Using a default key for rate limiting. This might group multiple users."
      );
      return "default-fallback-key";
    }
    return ip;
  },
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
      } else if (exam === "JoSAA") {
        // For JoSAA, handle both JEE Main and JEE Advanced ranks
        if (item["Exam"] === "JEE Advanced" && req.query.advRank) {
          // Use advRank for JEE Advanced colleges when available
          return parseInt(item["Closing Rank"], 10) >= 0.9 * parseInt(req.query.advRank, 10);
        } else if (req.query.mainRank) {
          // Use mainRank for JEE Main colleges
          return parseInt(item["Closing Rank"], 10) >= 0.9 * parseInt(req.query.mainRank, 10);
        }
        // No fallback to rank - if neither mainRank nor advRank is provided, don't include the item
        return false;
      } else if (item["Exam"] === "JEE Advanced" && req.query.advRank) {
        // For other exams, use advRank for JEE Advanced colleges when available
        return parseInt(item["Closing Rank"], 10) >= 0.9 * parseInt(req.query.advRank, 10);
      } else {
        return parseInt(item["Closing Rank"], 10) >= 0.9 * parseInt(rank, 10);
      }
    };

    const filteredData = fullData
      .filter((item) => {
        const filterResults = filters.map((filter) => filter(item));

        return filterResults.every((result) => result) && rankFilter(item);
      })
      .sort((a, b) => {
        // Exams that should not be sorted by Closing Rank or any specific key
        const noSortExams = ["JEE Main-JOSAA", "JEE Advanced", "JEE Main"];
        if (noSortExams.includes(exam)) {
          return 0; // Maintain original order from JSON
        }

        const sortingKey = exam === "TNEA" ? "Cutoff Marks" : "Closing Rank";
        if (exam === "TNEA") {
          // TNEA sorts by Cutoff Marks (descending - higher is better)
          return parseFloat(b[sortingKey]) - parseFloat(a[sortingKey]);
        } else {
          // Other exams sort by Closing Rank (ascending - lower is better)
          return parseInt(a[sortingKey], 10) - parseInt(b[sortingKey], 10);
        }
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

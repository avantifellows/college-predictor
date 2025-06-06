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

    // Helper function to parse rank (handles 'P' suffix)
    const parseRank = (rankStr) => {
      if (!rankStr) return null;
      const numStr = rankStr.toString().replace(/[^0-9]/g, '');
      return numStr ? parseInt(numStr, 10) : null;
    };

    const hasPSuffix = (rankStr) => {
      if (!rankStr) return false;
      return rankStr.toString().trim().toUpperCase().endsWith('P');
    };

    const rankFilter = (item) => {
      if (exam === "TNEA") {
        return parseFloat(item["Cutoff Marks"]) <= parseFloat(rank);
      }

      const itemRankStr = item["Closing Rank"]?.toString().trim() || '';
      const itemRank = parseRank(itemRankStr);
      const itemHasPSuffix = hasPSuffix(itemRankStr);

      if (exam === "JoSAA") {
        if (item["Exam"] === "JEE Advanced") {
          if (req.query.qualifiedJeeAdv !== "Yes" || !req.query.advRank) return false;
          
          const userRankStr = req.query.advRank?.toString().trim() || '';
          const userRank = parseRank(userRankStr);
          const userHasPSuffix = hasPSuffix(userRankStr);
          
          // If one has 'P' suffix and the other doesn't, they don't match
          if (itemHasPSuffix !== userHasPSuffix) return false;
          
          return userRank && itemRank >= 0.9 * userRank;
        } else {
          if (!req.query.mainRank) return false;
          
          const userRankStr = req.query.mainRank?.toString().trim() || '';
          const userRank = parseRank(userRankStr);
          const userHasPSuffix = hasPSuffix(userRankStr);
          
          // If one has 'P' suffix and the other doesn't, they don't match
          if (itemHasPSuffix !== userHasPSuffix) return false;
          
          return userRank && itemRank >= 0.9 * userRank;
        }
      } else if (exam === "JEE Advanced") {
        if (item["Exam"] !== "JEE Advanced") return false;
        if (!req.query.advRank) return false;
        
        const userRankStr = req.query.advRank?.toString().trim() || '';
        const userRank = parseRank(userRankStr);
        const userHasPSuffix = hasPSuffix(userRankStr);
        
        // If one has 'P' suffix and the other doesn't, they don't match
        if (itemHasPSuffix !== userHasPSuffix) return false;
        
        return userRank && itemRank >= 0.9 * userRank;
      } else if (exam === "JEE Main") {
        if (item["Exam"] === "JEE Advanced") return false;
        if (!req.query.mainRank) return false;
        
        const userRankStr = req.query.mainRank?.toString().trim() || '';
        const userRank = parseRank(userRankStr);
        const userHasPSuffix = hasPSuffix(userRankStr);
        
        // If one has 'P' suffix and the other doesn't, they don't match
        if (itemHasPSuffix !== userHasPSuffix) return false;
        
        return userRank && itemRank >= 0.9 * userRank;
      } else {
        return true;
      }
    };

    const filteredData = fullData
      .filter((item) => {
        const filterResults = filters.map((filter) => filter(item));
        return filterResults.every((result) => result) && rankFilter(item);
      })
      .sort((a, b) => {
        // Exams that should not be sorted
        const noSortExams = ["JEE Main-JOSAA", "JEE Advanced", "JEE Main"];
        if (noSortExams.includes(exam)) {
          return 0; // Maintain original order from JSON
        }

        // Sort by AF Hierarchy (ascending - lower is better)
        return parseFloat(a["AF Hierarchy"]) - parseFloat(b["AF Hierarchy"]);
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

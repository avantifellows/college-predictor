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
    if (exam === "JoSAA" && field.name === "preferHomeState") {
      continue;
    }
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
      const numStr = rankStr.toString().replace(/[^0-9]/g, "");
      return numStr ? parseInt(numStr, 10) : null;
    };

    const hasPSuffix = (rankStr) => {
      if (!rankStr) return false;
      return rankStr.toString().trim().toUpperCase().endsWith("P");
    };

    const rankFilter = (item) => {
      if (exam === "GUJCET") {
        // For GUJCET, filter based on closing_marks
        const cutoffMarks = parseFloat(item.closing_marks) || 0;
        const userMarks = parseFloat(rank) || 0;
        return userMarks >= cutoffMarks * 0.9; // Show if user marks are >= 90% of cutoff
      } else if (exam === "NEET") {
        // For NEET, filter based on closing rank with 0.9 coefficient
        const closingRank = parseFloat(item["Closing Rank"]) || 0;
        const userRank = parseFloat(rank) || 0;
        return closingRank >= 0.9 * userRank; // Show colleges where closing rank is >= 90% of user's rank
      } else if (exam === "TNEA") {
        return parseFloat(item["Cutoff Marks"]) <= parseFloat(rank);
      }

      const itemRankStr = item["Closing Rank"]?.toString().trim() || "";
      const itemRank = parseRank(itemRankStr);
      const itemHasPSuffix = hasPSuffix(itemRankStr);

      if (exam === "JoSAA") {
        if (item["Exam"] === "JEE Advanced") {
          if (req.query.qualifiedJeeAdv !== "Yes" || !req.query.advRank)
            return false;

          const userRankStr = req.query.advRank?.toString().trim() || "";
          const userRank = parseRank(userRankStr);
          const userHasPSuffix = hasPSuffix(userRankStr);

          // If one has 'P' suffix and the other doesn't, they don't match
          if (itemHasPSuffix !== userHasPSuffix) return false;

          return userRank && itemRank >= 0.9 * userRank;
        } else {
          if (!req.query.mainRank) return false;

          const userRankStr = req.query.mainRank?.toString().trim() || "";
          const userRank = parseRank(userRankStr);
          const userHasPSuffix = hasPSuffix(userRankStr);

          // If one has 'P' suffix and the other doesn't, they don't match
          if (itemHasPSuffix !== userHasPSuffix) return false;

          return userRank && itemRank >= 0.9 * userRank;
        }
      } else if (exam === "JEE Advanced") {
        if (item["Exam"] !== "JEE Advanced") return false;
        if (!req.query.advRank) return false;

        const userRankStr = req.query.advRank?.toString().trim() || "";
        const userRank = parseRank(userRankStr);
        const userHasPSuffix = hasPSuffix(userRankStr);

        // If one has 'P' suffix and the other doesn't, they don't match
        if (itemHasPSuffix !== userHasPSuffix) return false;

        return userRank && itemRank >= 0.9 * userRank;
      } else if (exam === "JEE Main") {
        if (item["Exam"] === "JEE Advanced") return false;
        if (!req.query.mainRank) return false;

        const userRankStr = req.query.mainRank?.toString().trim() || "";
        const userRank = parseRank(userRankStr);
        const userHasPSuffix = hasPSuffix(userRankStr);

        // If one has 'P' suffix and the other doesn't, they don't match
        if (itemHasPSuffix !== userHasPSuffix) return false;

        return userRank && itemRank >= 0.9 * userRank;
      } else {
        return true;
      }
    };

    let filteredData = fullData;

    // Apply filters if they exist
    if (Array.isArray(filters)) {
      filteredData = filteredData.filter((item) => {
        return filters.every((filterFn) => filterFn(item));
      });
    }

    // Apply rank filter if it exists
    if (rankFilter) {
      filteredData = filteredData.filter(rankFilter);
    }

    // Apply sorting based on exam type
    if (config.getSort) {
      const sortConfig = config.getSort();
      if (sortConfig && sortConfig.length > 0) {
        const [sortKey, sortOrder] = sortConfig[0];
        filteredData.sort((a, b) => {
          let valA = a[sortKey];
          let valB = b[sortKey];

          // Convert to numbers if possible for proper numeric comparison
          if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
          }

          if (sortOrder === "DESC") {
            return valB - valA;
          }
          return valA - valB;
        });
      }
    } else if (exam === "TGEAPCET") {
      // For TGEAPCET, sort by closing_rank in ascending order
      filteredData.sort((a, b) => {
        const rankA = parseInt(a.closing_rank, 10) || 0;
        const rankB = parseInt(b.closing_rank, 10) || 0;
        return rankA - rankB; // Ascending order (lower ranks first)
      });
    } else if (exam === "TNEA") {
      // For TNEA, sort by cutoff marks in descending order
      filteredData.sort((collegeA, collegeB) => {
        const collegeAMarks = parseFloat(collegeA["Cutoff Marks"]) || 0;
        const collegeBMarks = parseFloat(collegeB["Cutoff Marks"]) || 0;
        return collegeBMarks - collegeAMarks; // Descending order (higher cutoff first)
      });
    } else if (
      exam === "JEE Main" ||
      exam === "JEE Advanced" ||
      exam === "JoSAA"
    ) {
      // For JEE Main, JEE Advanced, and JoSAA, sort by Closing Rank ascending
      filteredData.sort((collegeA, collegeB) => {
        const rankA = parseFloat(collegeA["Closing Rank"]) || 0;
        const rankB = parseFloat(collegeB["Closing Rank"]) || 0;
        return rankA - rankB;
      });
    }

    return res.status(200).json(filteredData);
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({
      error: "Unable to retrieve data",
      details: error.message,
    });
  }
}

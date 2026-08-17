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
  const category = Array.isArray(req.query.category)
    ? req.query.category[0]
    : req.query.category;

  if (category) {
    const categoryField = config.fields?.find(
      (field) => field.name === "category"
    );

    if (categoryField) {
      const isValidCategory = categoryField.options.some((option) => {
        const value = typeof option === "string" ? option : option.value;
        const label = typeof option === "string" ? undefined : option.label;

        const normalizedCategory = String(category).trim().toLowerCase();
        const matchesValue =
          String(value).trim().toLowerCase() === normalizedCategory;
        const matchesLabel =
          label && String(label).trim().toLowerCase() === normalizedCategory;

        return matchesValue || matchesLabel;
      });

      if (!isValidCategory) {
        return res.status(400).json({
          error: "Invalid category",
        });
      }
    }
  }

  // Apply the same `refinePrimaryInput` hook the form uses, so the accepted range
  // is defined once. GUJCET's Medical rows are raw NEET marks (up to 690 of 720)
  // while Engineering/Pharmacy are a 0-100 percentile; without this the server
  // would keep enforcing 0-100 and reject the very values the form now invites.
  const primaryInputConfig =
    config.primaryInput && config.refinePrimaryInput
      ? config.refinePrimaryInput(config.primaryInput, req.query) ||
        config.primaryInput
      : config.primaryInput;
  const queryValue =
    exam === "JoSAA" ? req.query.mainRank || req.query.rank : req.query.rank;

  if (
    primaryInputConfig &&
    queryValue !== undefined &&
    queryValue !== null &&
    queryValue !== ""
  ) {
    const numericValue = Number(queryValue);
    if (Number.isNaN(numericValue)) {
      return res
        .status(400)
        .json({ error: `Invalid value for ${exam} input parameter.` });
    }

    if (
      primaryInputConfig.min !== undefined &&
      numericValue < Number(primaryInputConfig.min)
    ) {
      return res.status(400).json({
        error:
          primaryInputConfig.max !== undefined
            ? `Please enter a value between ${primaryInputConfig.min} and ${primaryInputConfig.max}.`
            : primaryInputConfig.label.toLowerCase().includes("rank") &&
              primaryInputConfig.min === "1"
            ? "Please enter a rank greater than 0."
            : `Please enter a value greater than or equal to ${primaryInputConfig.min}.`,
      });
    }

    if (
      primaryInputConfig.max !== undefined &&
      numericValue > Number(primaryInputConfig.max)
    ) {
      return res.status(400).json({
        error: `Please enter a value between ${primaryInputConfig.min} and ${primaryInputConfig.max}.`,
      });
    }
  }

  // Check for required parameters
  for (const field of config.fields) {
    if (exam === "JoSAA" && field.name === "preferHomeState") {
      continue;
    }
    if (field.optional) {
      continue; // e.g. NEET home-state category — filters only if provided
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

    if (!Array.isArray(fullData)) {
      return res.status(500).json({ error: "Data format invalid" });
    }

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
        // Two different quantities, so two different comparisons.
        //
        // Engineering/Pharmacy: the student enters their ACPC merit RANK, and a
        // seat is reachable when its closing rank is at or beyond that rank
        // (lower rank = harder). This replaced a comparison against
        // closing_marks that assumed the student had already computed ACPC's
        // 50:50 composite themselves.
        //
        // Medical: no rank exists in that source at all, only raw NEET scores,
        // so it stays a score comparison.
        if (req.query.program === "Medical") {
          const cutoffMarks = parseFloat(item.closing_marks);
          const userMarks = parseFloat(rank);
          if (!Number.isFinite(cutoffMarks) || !Number.isFinite(userMarks)) return false;
          return userMarks >= cutoffMarks;
        }
        const closingRank = parseFloat(item.closing_rank);
        const userRank = parseFloat(rank);
        if (!Number.isFinite(closingRank) || !Number.isFinite(userRank)) return false;
        return closingRank >= userRank;
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
        if (!req.query.rank) return false;

        const userRankStr = req.query.rank?.toString().trim() || "";
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
        // Multi-key, null-safe. Previously this read only sortConfig[0] and
        // compared raw values: parseFloat(null) is NaN, so the numeric-coercion
        // guard was skipped and `null - 5` (-5) made a null row sort as though
        // it were GREATER than every real value under DESC. GUJCET's 8 pharmacy
        // ESM rows have a null closing_marks by design, so they were dragged to
        // the top of the list and the rows around them lost their order
        // entirely. Nulls now always sort LAST regardless of direction — "no
        // cutoff recorded" is never the most competitive seat — and later keys
        // in sortConfig break ties, so a stream sorted on a column that is
        // uniformly null still gets a meaningful order from its fallback.
        const toNumber = (value) => {
          if (value === null || value === undefined || value === "") return null;
          const n = parseFloat(value);
          return Number.isFinite(n) ? n : null;
        };

        filteredData.sort((a, b) => {
          for (const [sortKey, sortOrder] of sortConfig) {
            const valA = toNumber(a[sortKey]);
            const valB = toNumber(b[sortKey]);

            if (valA === null && valB === null) continue; // undecided -> next key
            if (valA === null) return 1;
            if (valB === null) return -1;
            if (valA === valB) continue;

            return sortOrder === "DESC" ? valB - valA : valA - valB;
          }
          return 0;
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
      error: "Unable to retrieve data. Please try again later.",
    });
  }
}

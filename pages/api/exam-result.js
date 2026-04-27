import examConfigs from "../../examConfig";
import rateLimit from "express-rate-limit";
import {
  loadCollegeData,
  createRankFilter,
  applyFilters,
  sortColleges,
} from "../../utils/collegeDataLoader";

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
  const primaryInputConfig = config.primaryInput;
  const queryValue =
    exam === "JoSAA"
      ? req.query.mainRank || req.query.rank
      : req.query.rank;

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
    if (!req.query[field.name]) {
      return res
        .status(400)
        .json({ error: `Missing required parameter: ${field.name}` });
    }
  }

  try {
    const dataPath = config.getDataPath(req.query.category);
    const fullData = await loadCollegeData(dataPath);

    const filters = config.getFilters(req.query);
    const rankFilter = createRankFilter(exam, req.query);

    let filteredData = applyFilters(fullData, filters, rankFilter);
    filteredData = sortColleges(filteredData, exam, config);

    return res.status(200).json(filteredData);
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({
      error: "Unable to retrieve data",
      details: error.message,
    });
  }
}

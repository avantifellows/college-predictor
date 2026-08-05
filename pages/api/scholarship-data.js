import fs from "fs/promises";
import path from "path";

// The daily lambda (lambda/update_scholarship_data) writes this object at
// 05:30 IST from the live "Scholarship Finder Data" sheet. Reading it over
// plain HTTPS keeps the app free of AWS credentials -- the futures/ prefix of
// this bucket is already public.
const S3_URL =
  process.env.SCHOLARSHIP_DATA_URL ||
  "https://avantifellows-assets.s3.ap-south-1.amazonaws.com/futures/scholarship_data.json";

// Serve from memory for a few minutes so every page view does not re-fetch a
// ~460KB object that only changes once a day.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = { data: null, fetchedAt: 0, source: null };

const readLocalFallback = async () => {
  const dataPath = path.join(
    process.cwd(),
    "public",
    "data",
    "scholarships",
    "scholarship_data.json"
  );
  return JSON.parse(await fs.readFile(dataPath, "utf8"));
};

const fetchFromS3 = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(S3_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`S3 responded ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

export default async function handler(req, res) {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    res.setHeader("X-Scholarship-Source", `${cache.source}-cached`);
    return res.status(200).json(cache.data);
  }

  let scholarships = null;
  let source = null;

  try {
    scholarships = await fetchFromS3();
    source = "s3";
  } catch (error) {
    // A stale-but-working page beats an error page, so fall back to the copy
    // committed in the repo rather than failing the request.
    console.error(
      "S3 scholarship fetch failed, using local copy:",
      error.message
    );
    try {
      scholarships = await readLocalFallback();
      source = "local";
    } catch (localError) {
      console.error("Local scholarship fallback failed:", localError);
      return res.status(500).json({
        error: "Unable to retrieve scholarship data. Please try again later.",
      });
    }
  }

  if (!Array.isArray(scholarships) || scholarships.length === 0) {
    // An empty array would render as "no scholarships found" and look like a
    // filtering bug; prefer the local copy, and only then give up.
    if (source === "s3") {
      try {
        scholarships = await readLocalFallback();
        source = "local-after-empty-s3";
      } catch (localError) {
        return res.status(500).json({ error: "Data format invalid" });
      }
    }
    if (!Array.isArray(scholarships) || scholarships.length === 0) {
      return res.status(500).json({ error: "Data format invalid" });
    }
  }

  cache = { data: scholarships, fetchedAt: now, source };
  res.setHeader("X-Scholarship-Source", source);
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=600"
  );
  return res.status(200).json(scholarships);
}

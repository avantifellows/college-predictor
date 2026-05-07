import fs from "fs/promises";
import path from "path";
import { withErrorHandler, sendError } from "../../utils/errorHandler";

async function handler(req, res, requestId) {
  try {
    const dataPath = path.join(
      process.cwd(),
      "public",
      "data",
      "scholarships",
      "scholarship_data.json"
    );
    const data = await fs.readFile(dataPath, "utf8");
    const scholarships = JSON.parse(data);
    return res.status(200).json(scholarships);
  } catch (error) {
    console.error(`[${requestId}] Error loading scholarship data:`, error);
    sendError(res, 500, "Unable to retrieve scholarship data", requestId);
  }
}

export default withErrorHandler(handler);

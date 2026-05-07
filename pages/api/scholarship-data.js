import fs from "fs/promises";
import path from "path";
import {
  attachRequestId,
  internalServerError,
  methodNotAllowed,
} from "../../utils/errorHandler";

export default async function handler(req, res) {
  attachRequestId(req, res);

  if (req.method !== "GET") {
    return methodNotAllowed(req, res, ["GET"]);
  }

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
    return internalServerError(
      req,
      res,
      "Unable to retrieve scholarship data. Please try again later.",
      {
        error,
        code: "SCHOLARSHIP_DATA_LOAD_FAILED",
      }
    );
  }
}

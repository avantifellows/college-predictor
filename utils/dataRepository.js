import fs from "fs/promises";
import axios from "axios";
import examConfigs from "../examConfig";

/**
 * DataRepository handles all data fetching for the application.
 * This abstracts the data source (Files, S3, etc.) and prepares
 * the application for the migration to a Postgres database.
 */
class DataRepository {
  /**
   * Fetches exam data based on the exam type and category.
   * @param {string} exam - The exam name (e.g., "JoSAA", "GUJCET").
   * @param {string} category - The student category.
   * @returns {Promise<Array>} - The parsed JSON data.
   */
  async getExamData(exam, category) {
    const config = examConfigs[exam];
    if (!config) {
      throw new Error(`Exam configuration not found for: ${exam}`);
    }

    try {
      const dataPath = config.getDataPath(category);
      const data = await fs.readFile(dataPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading exam data for ${exam}:`, error);
      throw new Error(`Unable to fetch data for exam: ${exam}`);
    }
  }

  /**
   * Fetches scholarship data from the S3 bucket.
   * @returns {Promise<Array>} - The parsed JSON data.
   */
  async getScholarshipData() {
    const s3Url = `https://avantifellows-assets.s3.ap-south-1.amazonaws.com/futures/scholarship_data.json`;
    try {
      const response = await axios.get(s3Url);
      return response.data;
    } catch (error) {
      console.error("Error fetching scholarship data from S3:", error);
      throw new Error("Unable to fetch scholarship data");
    }
  }
}

const dataRepository = new DataRepository();
export default dataRepository;

import fs from "fs/promises";
import path from "path";
import examConfigs from "../examConfig";

const SCHOLARSHIP_DATA_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "scholarships",
  "scholarship_data.json"
);

class JsonFileDataSource {
  constructor({ readFile = fs.readFile } = {}) {
    this.readFile = readFile;
    this.cache = new Map();
  }

  async readJson(filePath) {
    if (!this.cache.has(filePath)) {
      this.cache.set(
        filePath,
        this.readFile(filePath, "utf8").then((contents) => JSON.parse(contents))
      );
    }

    return this.cache.get(filePath);
  }

  clearCache() {
    this.cache.clear();
  }
}

class DataRepository {
  constructor({ configs, dataSource }) {
    this.configs = configs;
    this.dataSource = dataSource;
  }

  async getExamData(examName, category) {
    const config = this.configs[examName];

    if (!config || typeof config.getDataPath !== "function") {
      throw new Error(`Unsupported exam data source: ${examName}`);
    }

    return this.dataSource.readJson(config.getDataPath(category));
  }

  async getScholarshipData() {
    return this.dataSource.readJson(SCHOLARSHIP_DATA_PATH);
  }
}

const dataRepository = new DataRepository({
  configs: examConfigs,
  dataSource: new JsonFileDataSource(),
});

export { DataRepository, JsonFileDataSource, SCHOLARSHIP_DATA_PATH };
export default dataRepository;

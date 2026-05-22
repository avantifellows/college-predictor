import fs from "fs/promises";
import examConfigs from "../../examConfig";

const TOTAL_MARKS = 300;
const TOTAL_TEST_TAKERS = 1500000;
const MAX_RECOMMENDATIONS = 10;

const LFIT = -86.555129;
const UFIT = 98.24994;
const KFIT = 0.153249;
const X0_FIT = 0.624824;

const F1_C1_M = 0.0251;
const F1_C1_B = -19.5;
const F1_C2_M = 0.0276;
const F1_C2_B = -51.9;
const F1_C3_M = 0.0383;
const F1_C3_B = -373;
const F1_C4_M = 0.0429;
const F1_C4_B = -605;
const F1_C5_M = 0.0515;
const F1_C5_B = -1297;
const F1_C6_M = 0.0571;
const F1_C6_B = -1854;
const F1_C7_M = 0.0738;
const F1_C7_B = -4542;
const F1_C8_M = 0.0892;
const F1_C8_B = -9217;
const F1_C9_M = 0.106;
const F1_C9_B = -17937;
const F1_C10_M = 0.118;
const F1_C10_B = -30183;

const F2_C1_M = 0.232;
const F2_C1_B = -131;
const F2_C2_M = 0.313;
const F2_C2_B = -1180;
const F2_C3_M = 0.351;
const F2_C3_B = -2833;
const F2_C4_M = 0.389;
const F2_C4_B = -7865;

const F3_C1_M = 0.129;
const F3_C1_B = -77.2;
const F3_C2_M = 0.145;
const F3_C2_B = -100;
const F3_C3_M = 0.118;
const F3_C3_B = 7517;
const F3_C4_M = 0.098;
const F3_C4_B = 19862;
const F3_C5_M = 0.0788;
const F3_C5_B = 39286;

const F4_C1_M = 0.00725;
const F4_C1_B = -32.2;
const F4_C2_M = 0.0122;
const F4_C2_B = -326;
const F4_C3_M = 0.0165;
const F4_C3_B = -930;
const F4_C4_M_LINEAR = 0.0136;
const F4_C4_M_QUAD = 1.76e-8;
const F4_C4_B = -1146;
const F4_C5_M = 0.0396;
const F4_C5_B = -11081;

const supportedJosaaEstimateCategories = new Set([
  "OPEN",
  "OBC-NCL",
  "SC",
  "ST",
  "EWS",
]);

const requiredJosaaColumns = ["State", "Category", "Gender"];
const derivedOutputColumns = [
  "Percentage Score",
  "Percentile Estimate",
  "AIR Estimate",
  "Category Rank (Estimate)",
];
const recommendationOutputColumns = [];
const outputColumns = [...derivedOutputColumns, ...recommendationOutputColumns];

for (let index = 1; index <= MAX_RECOMMENDATIONS; index += 1) {
  recommendationOutputColumns.push(`College ${index}`, `Course ${index}`);
  outputColumns.push(`College ${index}`, `Course ${index}`);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

const normalizeText = (value) => String(value || "").trim();

const normalizeCategory = (value) => {
  const normalized = normalizeText(value);
  const normalizedUpper = normalized.replace(/\s+/g, " ").toUpperCase();

  const isPwd = /\bPWD\b|\(PWD\)/i.test(normalizedUpper);
  let baseCategory = normalizedUpper
    .replace(/\(PWD\)/g, "")
    .replace(/\bPWD\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (baseCategory === "GENERAL") baseCategory = "OPEN";
  if (baseCategory === "OBC") baseCategory = "OBC-NCL";

  if (!baseCategory) return "";
  return isPwd ? `${baseCategory} (PwD)` : baseCategory;
};

const getCategoryForEstimate = (category) =>
  category.replace(/\s+\(PwD\)$/i, "");

const isPwdCategory = (category) => /\(PwD\)$/i.test(category);

const normalizeGender = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "female" || normalized === "female-only") {
    return "Female-only (including Supernumerary)";
  }
  if (normalized === "male" || normalized === "gender-neutral") {
    return "Gender-Neutral";
  }
  return normalizeText(value);
};

const marksToPercentage = (score) => (score * 100) / TOTAL_MARKS;

const percentageToPercentile = (percentage) => {
  if (percentage <= 25) {
    return LFIT + (UFIT - LFIT) / (1 + Math.exp(-KFIT * (percentage - X0_FIT)));
  }
  if (percentage <= 40) {
    return 65.1 + 8.95 * Math.log(percentage);
  }
  return 100 * (1 - Math.exp(-0.095 * percentage));
};

const percentileToAir = (percentile) =>
  Math.floor(TOTAL_TEST_TAKERS * (1 - percentile / 100));

const calculateFunction1 = (value) => {
  if (value < 10000) return F1_C1_M * value + F1_C1_B;
  if (value <= 30000) return F1_C2_M * value + F1_C2_B;
  if (value <= 50000) return F1_C3_M * value + F1_C3_B;
  if (value <= 75000) return F1_C4_M * value + F1_C4_B;
  if (value <= 100000) return F1_C5_M * value + F1_C5_B;
  if (value <= 150000) return F1_C6_M * value + F1_C6_B;
  if (value <= 300000) return F1_C7_M * value + F1_C7_B;
  if (value <= 500000) return F1_C8_M * value + F1_C8_B;
  if (value <= 1000000) return F1_C9_M * value + F1_C9_B;
  return F1_C10_M * value + F1_C10_B;
};

const calculateFunction2 = (value) => {
  if (value <= 10000) return F2_C1_M * value + F2_C1_B;
  if (value <= 50000) return F2_C2_M * value + F2_C2_B;
  if (value <= 100000) return F2_C3_M * value + F2_C3_B;
  return F2_C4_M * value + F2_C4_B;
};

const calculateFunction3 = (value) => {
  if (value <= 10000) return F3_C1_M * value + F3_C1_B;
  if (value <= 300000) return F3_C2_M * value + F3_C2_B;
  if (value <= 600000) return F3_C3_M * value + F3_C3_B;
  if (value <= 1000000) return F3_C4_M * value + F3_C4_B;
  return F3_C5_M * value + F3_C5_B;
};

const calculateFunction4 = (value) => {
  if (value <= 50000) return F4_C1_M * value + F4_C1_B;
  if (value <= 150000) return F4_C2_M * value + F4_C2_B;
  if (value <= 200000) return F4_C3_M * value + F4_C3_B;
  if (value <= 750000) {
    return F4_C4_M_QUAD * value * value + F4_C4_M_LINEAR * value + F4_C4_B;
  }
  return F4_C5_B + F4_C5_M * value;
};

const airToCat = (category, rank) => {
  let raw;
  if (category === "SC") raw = calculateFunction1(rank);
  else if (category === "OBC-NCL") raw = calculateFunction2(rank);
  else if (category === "EWS") raw = calculateFunction3(rank);
  else if (category === "OPEN") raw = rank;
  else if (category === "ST") raw = calculateFunction4(rank);
  else throw new Error("Invalid category");

  const rounded = Math.round(raw);
  return rounded <= 0 ? 1 : rounded;
};

const estimateJosaaRank = (row, category) => {
  const scoreRaw = normalizeText(row.Score);
  const percentileRaw =
    normalizeText(row["Percentile Estimate"]) || normalizeText(row.Percentile);

  let marks;
  let percentage;
  let percentile;

  if (scoreRaw) {
    marks = Number(scoreRaw);
    if (Number.isNaN(marks) || marks < 0 || marks > TOTAL_MARKS) {
      throw new Error("Score must be between 0 and 300");
    }
    percentage = marksToPercentage(marks);
    percentile = percentageToPercentile(percentage);
  } else if (percentileRaw) {
    percentile = Number(percentileRaw);
    if (Number.isNaN(percentile) || percentile < 0 || percentile > 100) {
      throw new Error("Percentile must be between 0 and 100");
    }
    percentage = 0;
    marks = "";
  } else {
    return null;
  }

  let allIndiaRank = percentileToAir(percentile);
  let categoryRank = airToCat(category, allIndiaRank);

  if (marks >= TOTAL_MARKS || percentile >= 100) {
    percentile = 100;
    allIndiaRank = 1;
    categoryRank = 1;
    marks = TOTAL_MARKS;
    percentage = 100;
  }

  return {
    percentage: percentage ? Number(percentage.toFixed(8)) : "",
    percentile: Number(percentile.toFixed(8)),
    allIndiaRank,
    categoryRank,
  };
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => normalizeText(value) !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => normalizeText(value) !== "")) {
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((header) => normalizeText(header));
  const records = rows.slice(1).map((values) =>
    headers.reduce((record, header, index) => {
      record[header] = values[index] || "";
      return record;
    }, {})
  );

  return { headers, records };
};

const escapeCsvValue = (value) => {
  const stringValue =
    value === undefined || value === null ? "" : String(value);
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const toCsv = (headers, records) =>
  [
    headers.map(escapeCsvValue).join(","),
    ...records.map((record) =>
      headers.map((header) => escapeCsvValue(record[header])).join(",")
    ),
  ].join("\n");

const parseRank = (rankStr) => {
  if (!rankStr) return null;
  const numStr = rankStr.toString().replace(/[^0-9]/g, "");
  return numStr ? parseInt(numStr, 10) : null;
};

const hasPSuffix = (rankStr) =>
  Boolean(rankStr && rankStr.toString().trim().toUpperCase().endsWith("P"));

const applyProgramFilter = (item, program) => {
  const normalizedProgram = String(program || "engineering").toLowerCase();
  const academicProgram = String(
    item["Academic Program Name"] || ""
  ).toLowerCase();

  if (normalizedProgram === "architecture") {
    return academicProgram.includes("architecture");
  }
  if (normalizedProgram === "planning") {
    return academicProgram.includes("planning");
  }
  return (
    !academicProgram.includes("architecture") &&
    !academicProgram.includes("planning")
  );
};

const applyStateFilter = (item, homeState) => {
  if (item.Quota === "AI") return true;
  if (homeState === item.State) return item.Quota === "HS";
  return item.Quota === "OS";
};

const applyRankFilter = (item, query) => {
  const itemRankStr = item["Closing Rank"]?.toString().trim() || "";
  const itemRank = parseRank(itemRankStr);
  const itemHasPSuffix = hasPSuffix(itemRankStr);

  if (item.Exam === "JEE Advanced") {
    if (query.qualifiedJeeAdv !== "Yes" || !query.advRank) return false;
    const userRankStr = query.advRank?.toString().trim() || "";
    const userRank = parseRank(userRankStr);
    if (itemHasPSuffix !== hasPSuffix(userRankStr)) return false;
    return userRank && itemRank >= 0.9 * userRank;
  }

  if (!query.mainRank) return false;
  const userRankStr = query.mainRank?.toString().trim() || "";
  const userRank = parseRank(userRankStr);
  if (itemHasPSuffix !== hasPSuffix(userRankStr)) return false;
  return userRank && itemRank >= 0.9 * userRank;
};

const predictJosaaColleges = async (query) => {
  const josaaConfig = examConfigs.JoSAA;
  const dataPath = josaaConfig.getDataPath(query.category);
  const data = JSON.parse(await fs.readFile(dataPath, "utf8"));

  return data
    .filter((item) => item.Gender === query.gender || item.Gender === "All")
    .filter((item) => applyProgramFilter(item, query.program))
    .filter((item) => applyStateFilter(item, query.homeState))
    .filter((item) => applyRankFilter(item, query))
    .sort((collegeA, collegeB) => {
      const rankA = parseFloat(collegeA["Closing Rank"]) || 0;
      const rankB = parseFloat(collegeB["Closing Rank"]) || 0;
      return rankA - rankB;
    })
    .slice(0, MAX_RECOMMENDATIONS);
};

const getCompletedHeaders = (headers) => {
  const nextHeaders = [...headers];
  outputColumns.forEach((column) => {
    if (!nextHeaders.includes(column)) {
      nextHeaders.push(column);
    }
  });
  if (!nextHeaders.includes("Prediction Status")) {
    nextHeaders.push("Prediction Status");
  }
  return nextHeaders;
};

const clearRecommendationColumns = (row) => {
  recommendationOutputColumns.forEach((column) => {
    row[column] = "";
  });
};

const getExcelColumnWidth = (header) => {
  if (/^Course \d+$/.test(header)) return 62;
  if (/^College \d+$/.test(header)) return 42;
  if (["Student Name", "Prediction Status"].includes(header)) return 28;
  if (["POC", "State", "Category", "Gender"].includes(header)) return 18;
  if (
    ["Student ID", "Percentile Estimate", "Category Rank (Estimate)"].includes(
      header
    )
  ) {
    return 22;
  }
  return 16;
};

const buildStyledWorkbookBuffer = async (headers, records) => {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Avanti Fellows";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Predictions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: getExcelColumnWidth(header),
  }));

  records.forEach((record) => {
    const row = {};
    headers.forEach((header) => {
      row[header] = record[header] ?? "";
    });
    worksheet.addRow(row);
  });

  const headerRow = worksheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFB52326" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF7A2628" } },
      left: { style: "thin", color: { argb: "FF7A2628" } },
      bottom: { style: "thin", color: { argb: "FF7A2628" } },
      right: { style: "thin", color: { argb: "FF7A2628" } },
    };
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const status = String(
      row.getCell(headers.indexOf("Prediction Status") + 1).value || ""
    );
    row.height = 38;
    row.eachCell((cell, columnNumber) => {
      const header = headers[columnNumber - 1];
      const isRecommendation =
        /^College \d+$/.test(header) || /^Course \d+$/.test(header);
      cell.alignment = {
        vertical: "top",
        wrapText: isRecommendation || header === "Prediction Status",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFEADDD8" } },
        left: { style: "thin", color: { argb: "FFEADDD8" } },
        bottom: { style: "thin", color: { argb: "FFEADDD8" } },
        right: { style: "thin", color: { argb: "FFEADDD8" } },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb:
            status === "Predicted"
              ? "FFFFFDFA"
              : status === "No eligible colleges"
                ? "FFFFF7E6"
                : "FFFFEEEE",
        },
      };
    });
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  return workbook.xlsx.writeBuffer();
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  if (body?.exam !== "JoSAA") {
    return res
      .status(400)
      .json({ error: "Only JoSAA batch prediction is supported." });
  }

  if (!body?.csvText || typeof body.csvText !== "string") {
    return res.status(400).json({ error: "Please upload a CSV file." });
  }

  const { headers, records } = parseCsv(body.csvText);
  const missingColumns = requiredJosaaColumns.filter(
    (column) => !headers.includes(column)
  );

  if (missingColumns.length > 0) {
    return res.status(400).json({
      error: `Missing required columns: ${missingColumns.join(", ")}`,
    });
  }

  const completedHeaders = getCompletedHeaders(headers);
  let predictedRows = 0;
  let rowsWithErrors = 0;

  const completedRecords = [];

  for (const originalRow of records) {
    const row = { ...originalRow };
    clearRecommendationColumns(row);

    try {
      const category = normalizeCategory(row.Category);
      const gender = normalizeGender(row.Gender);
      const homeState = normalizeText(row.State);

      if (!homeState) throw new Error("State is required");
      if (!gender) throw new Error("Gender is required");
      if (!category) throw new Error("Category is required");

      const existingMainRank = normalizeText(row["Category Rank (Estimate)"]);
      let mainRank = existingMainRank;
      const categoryForEstimate = getCategoryForEstimate(category);

      if (
        !existingMainRank &&
        isPwdCategory(category) &&
        (normalizeText(row.Score) ||
          normalizeText(row["Percentile Estimate"]) ||
          normalizeText(row.Percentile))
      ) {
        throw new Error("Rank estimation is unavailable for this category");
      }

      if (!supportedJosaaEstimateCategories.has(categoryForEstimate)) {
        throw new Error("Unsupported category");
      }

      const rankEstimate =
        existingMainRank && isPwdCategory(category)
          ? null
          : estimateJosaaRank(row, categoryForEstimate);

      if (rankEstimate) {
        if (!normalizeText(row["Percentage Score"])) {
          row["Percentage Score"] = rankEstimate.percentage;
        }
        if (!normalizeText(row["Percentile Estimate"])) {
          row["Percentile Estimate"] = rankEstimate.percentile;
        }
        if (!normalizeText(row["AIR Estimate"])) {
          row["AIR Estimate"] = rankEstimate.allIndiaRank;
        }
        if (!existingMainRank) {
          row["Category Rank (Estimate)"] = rankEstimate.categoryRank;
          mainRank = String(rankEstimate.categoryRank);
        }
      }

      if (!mainRank) {
        throw new Error(
          "Provide Score, Percentile, or Category Rank (Estimate)"
        );
      }

      const predictions = await predictJosaaColleges({
        category,
        gender,
        homeState,
        program: normalizeText(row.Program) || "engineering",
        qualifiedJeeAdv: normalizeText(row["Qualified JEE Advanced"]) || "No",
        advRank: normalizeText(row["JEE Advanced Rank"]),
        mainRank,
      });

      if (predictions.length === 0) {
        row["College 1"] = "No eligible colleges";
        row["Prediction Status"] = "No eligible colleges";
      } else {
        predictions.forEach((prediction, index) => {
          row[`College ${index + 1}`] = prediction.Institute;
          row[`Course ${index + 1}`] = prediction["Academic Program Name"];
        });
        row["Prediction Status"] = "Predicted";
        predictedRows += 1;
      }
    } catch (error) {
      row["Prediction Status"] = error.message || "Unable to predict";
      rowsWithErrors += 1;
    }

    completedRecords.push(row);
  }

  const responsePayload = {
    summary: {
      totalRows: completedRecords.length,
      predictedRows,
      rowsWithErrors,
      noEligibleRows: completedRecords.length - predictedRows - rowsWithErrors,
    },
    headers: completedHeaders,
    records: completedRecords,
    preview: completedRecords.slice(0, 5),
    csv: toCsv(completedHeaders, completedRecords),
  };

  if (body?.responseType === "xlsx") {
    const workbookBuffer = await buildStyledWorkbookBuffer(
      completedHeaders,
      completedRecords
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="batch-predictions-completed.xlsx"'
    );
    return res.status(200).send(Buffer.from(workbookBuffer));
  }

  return res.status(200).json(responsePayload);
}

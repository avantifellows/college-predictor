import fs from "fs/promises";
import ExcelJS from "exceljs";
import examConfigs, { statesList } from "../../examConfig";

const MAX_RECOMMENDATIONS = 5;
const TEMPLATE_ROW_COUNT = 300;
const requiredJosaaColumns = [
  "State",
  "Category",
  "Gender",
  "JEE Main Category Rank",
  "JEE Advanced Category Rank",
];

const optionalIdentityColumns = ["Student Name", "Student ID", "POC"];
const categoryOptions = [
  "OPEN",
  "OPEN (PwD)",
  "OBC-NCL",
  "OBC-NCL (PwD)",
  "SC",
  "SC (PwD)",
  "ST",
  "ST (PwD)",
  "EWS",
  "EWS (PwD)",
];
const genderOptions = [
  "Gender-Neutral",
  "Female-only (including Supernumerary)",
];

const mainOutputColumns = [];
const advancedOutputColumns = [];
for (let index = 1; index <= MAX_RECOMMENDATIONS; index += 1) {
  mainOutputColumns.push(
    `JEE Main College ${index}`,
    `JEE Main Course ${index}`
  );
  advancedOutputColumns.push(
    `JEE Advanced College ${index}`,
    `JEE Advanced Course ${index}`
  );
}

const statusColumns = [
  "JEE Main Prediction Status",
  "JEE Advanced Prediction Status",
  "Prediction Status",
];
const outputColumns = [
  ...mainOutputColumns,
  ...advancedOutputColumns,
  ...statusColumns,
];

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
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

  if (baseCategory === "GEN" || baseCategory === "GENERAL") {
    baseCategory = "OPEN";
  }
  if (baseCategory === "OBC") {
    baseCategory = "OBC-NCL";
  }

  if (!baseCategory) return "";
  return isPwd ? `${baseCategory} (PwD)` : baseCategory;
};

const normalizeGender = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (["female", "female-only", "girl"].includes(normalized)) {
    return "Female-only (including Supernumerary)";
  }
  if (["male", "boy", "gender-neutral"].includes(normalized)) {
    return "Gender-Neutral";
  }
  return normalizeText(value);
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

const parseXlsx = async (base64) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(base64, "base64"));
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { headers: [], records: [] };

  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    headers[columnNumber - 1] = normalizeText(cell.text || cell.value);
  });

  const records = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      const value = normalizeText(cell.text || cell.value);
      record[header] = value;
      if (value) hasValue = true;
    });
    if (hasValue) records.push(record);
  });

  return { headers: headers.filter(Boolean), records };
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

const applyProgramFilter = (item) => {
  const academicProgram = String(
    item["Academic Program Name"] || ""
  ).toLowerCase();
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

const applyRankFilter = (item, rank) => {
  const itemRankStr = item["Closing Rank"]?.toString().trim() || "";
  const itemRank = parseRank(itemRankStr);
  const userRank = parseRank(rank);
  if (!itemRank || !userRank) return false;
  if (hasPSuffix(itemRankStr) !== hasPSuffix(rank)) return false;
  return itemRank >= 0.9 * userRank;
};

const predictJosaaColleges = async ({
  category,
  gender,
  homeState,
  rank,
  exam,
}) => {
  if (!rank) return [];
  const josaaConfig = examConfigs.JoSAA;
  const dataPath = josaaConfig.getDataPath(category);
  const data = JSON.parse(await fs.readFile(dataPath, "utf8"));

  return data
    .filter((item) =>
      exam === "JEE Advanced"
        ? item.Exam === "JEE Advanced"
        : item.Exam !== "JEE Advanced"
    )
    .filter((item) => item.Gender === gender || item.Gender === "All")
    .filter((item) => applyProgramFilter(item))
    .filter((item) => applyStateFilter(item, homeState))
    .filter((item) => applyRankFilter(item, rank))
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
  return nextHeaders;
};

const clearOutputColumns = (row) => {
  outputColumns.forEach((column) => {
    row[column] = "";
  });
};

const fillPredictions = (row, predictions, prefix) => {
  if (predictions.length === 0) return;
  predictions.forEach((prediction, index) => {
    row[`${prefix} College ${index + 1}`] = prediction.Institute;
    row[`${prefix} Course ${index + 1}`] = prediction["Academic Program Name"];
  });
};

const getMissingColumns = (headers) =>
  requiredJosaaColumns.filter((column) => !headers.includes(column));

const processRecords = async (headers, records) => {
  const completedHeaders = getCompletedHeaders(headers);
  let mainPredictedRows = 0;
  let advancedPredictedRows = 0;
  let rowsWithErrors = 0;
  let rowsWithAnyPrediction = 0;
  const completedRecords = [];

  for (const originalRow of records) {
    const row = { ...originalRow };
    clearOutputColumns(row);

    try {
      const category = normalizeCategory(row.Category);
      const gender = normalizeGender(row.Gender);
      const homeState = normalizeText(row.State);
      const mainRank = normalizeText(row["JEE Main Category Rank"]);
      const advancedRank = normalizeText(row["JEE Advanced Category Rank"]);

      if (!homeState) throw new Error("State is required");
      if (!statesList.includes(homeState)) throw new Error("Invalid State");
      if (!category) throw new Error("Category is required");
      if (!categoryOptions.includes(category))
        throw new Error("Invalid Category");
      if (!gender) throw new Error("Gender is required");
      if (!genderOptions.includes(gender)) throw new Error("Invalid Gender");
      if (!mainRank && !advancedRank) {
        throw new Error(
          "Provide JEE Main Category Rank or JEE Advanced Category Rank"
        );
      }

      const mainPredictions = mainRank
        ? await predictJosaaColleges({
            category,
            gender,
            homeState,
            rank: mainRank,
            exam: "JEE Main",
          })
        : [];
      const advancedPredictions = advancedRank
        ? await predictJosaaColleges({
            category,
            gender,
            homeState,
            rank: advancedRank,
            exam: "JEE Advanced",
          })
        : [];

      fillPredictions(row, mainPredictions, "JEE Main");
      fillPredictions(row, advancedPredictions, "JEE Advanced");

      if (!mainRank) {
        row["JEE Main Prediction Status"] = "No JEE Main rank provided";
      } else if (mainPredictions.length === 0) {
        row["JEE Main Prediction Status"] = "No eligible colleges";
      } else {
        row["JEE Main Prediction Status"] = "Predicted";
        mainPredictedRows += 1;
      }

      if (!advancedRank) {
        row["JEE Advanced Prediction Status"] = "No JEE Advanced rank provided";
      } else if (advancedPredictions.length === 0) {
        row["JEE Advanced Prediction Status"] = "No eligible colleges";
      } else {
        row["JEE Advanced Prediction Status"] = "Predicted";
        advancedPredictedRows += 1;
      }

      if (mainPredictions.length > 0 || advancedPredictions.length > 0) {
        row["Prediction Status"] = "Predicted";
        rowsWithAnyPrediction += 1;
      } else {
        row["Prediction Status"] = "No eligible colleges";
      }
    } catch (error) {
      row["Prediction Status"] = error.message || "Unable to predict";
      row["JEE Main Prediction Status"] = "";
      row["JEE Advanced Prediction Status"] = "";
      rowsWithErrors += 1;
    }

    completedRecords.push(row);
  }

  return {
    completedHeaders,
    completedRecords,
    summary: {
      totalRows: completedRecords.length,
      mainPredictedRows,
      advancedPredictedRows,
      rowsWithAnyPrediction,
      rowsWithErrors,
      noEligibleRows:
        completedRecords.length - rowsWithAnyPrediction - rowsWithErrors,
    },
  };
};

const getExcelColumnWidth = (header) => {
  if (/^JEE (Main|Advanced) Course \d+$/.test(header)) return 62;
  if (/^JEE (Main|Advanced) College \d+$/.test(header)) return 42;
  if (header === "Prediction Status") return 28;
  if (header.includes("Prediction Status")) return 32;
  if (header.includes("Category Rank")) return 24;
  if (["State", "Category", "Gender"].includes(header)) return 24;
  if (["Student Name", "Student ID", "POC"].includes(header)) return 24;
  return 16;
};

const styleCellBorder = {
  top: { style: "thin", color: { argb: "FFEADDD8" } },
  left: { style: "thin", color: { argb: "FFEADDD8" } },
  bottom: { style: "thin", color: { argb: "FFEADDD8" } },
  right: { style: "thin", color: { argb: "FFEADDD8" } },
};

const styleHeaderCell = (cell, fillColor = "FFB52326") => {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fillColor },
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
};

const addOptionsSheet = (workbook) => {
  const optionsSheet = workbook.addWorksheet("Options");
  optionsSheet.state = "veryHidden";
  const optionColumns = [
    ["States", statesList],
    ["Categories", categoryOptions],
    ["Genders", genderOptions],
  ];

  optionColumns.forEach(([label, values], columnIndex) => {
    const columnNumber = columnIndex + 1;
    optionsSheet.getCell(1, columnNumber).value = label;
    values.forEach((value, valueIndex) => {
      optionsSheet.getCell(valueIndex + 2, columnNumber).value = value;
    });
  });
};

const applyTemplateValidations = (worksheet) => {
  for (let rowNumber = 2; rowNumber <= TEMPLATE_ROW_COUNT + 1; rowNumber += 1) {
    worksheet.getCell(`A${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`Options!$A$2:$A$${statesList.length + 1}`],
      showErrorMessage: true,
      errorTitle: "Invalid state",
      error: "Choose a state from the dropdown.",
    };
    worksheet.getCell(`B${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`Options!$B$2:$B$${categoryOptions.length + 1}`],
      showErrorMessage: true,
      errorTitle: "Invalid category",
      error: "Choose a category from the dropdown.",
    };
    worksheet.getCell(`C${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`Options!$C$2:$C$${genderOptions.length + 1}`],
      showErrorMessage: true,
      errorTitle: "Invalid gender",
      error: "Choose a gender from the dropdown.",
    };
  }
};

const buildTemplateWorkbookBuffer = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Avanti Fellows";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("JoSAA Template", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  worksheet.columns = requiredJosaaColumns.map((header) => ({
    header,
    key: header,
    width: getExcelColumnWidth(header),
  }));
  worksheet.getRow(1).height = 28;
  worksheet.getRow(1).eachCell((cell) => styleHeaderCell(cell));
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: requiredJosaaColumns.length },
  };
  applyTemplateValidations(worksheet);
  addOptionsSheet(workbook);

  return workbook.xlsx.writeBuffer();
};

const getSectionForHeader = (header, inputHeaderCount) => {
  if (
    requiredJosaaColumns.includes(header) ||
    optionalIdentityColumns.includes(header)
  ) {
    return "Student details and ranks";
  }
  if (mainOutputColumns.includes(header)) return "Top 5 through JEE Main";
  if (advancedOutputColumns.includes(header))
    return "Top 5 through JEE Advanced";
  if (statusColumns.includes(header)) return "Status";
  return inputHeaderCount > 0 ? "Student details and ranks" : "";
};

const buildStyledWorkbookBuffer = async (headers, records) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Avanti Fellows";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Predictions", {
    views: [{ state: "frozen", ySplit: 2 }],
  });
  worksheet.columns = headers.map((header) => ({
    key: header,
    width: getExcelColumnWidth(header),
  }));

  const sectionRow = worksheet.getRow(1);
  const headerRow = worksheet.getRow(2);
  const inputHeaderCount = headers.length - outputColumns.length;
  headers.forEach((header, index) => {
    const columnNumber = index + 1;
    sectionRow.getCell(columnNumber).value = getSectionForHeader(
      header,
      inputHeaderCount
    );
    headerRow.getCell(columnNumber).value = header;
  });

  const mergeSameSection = (label) => {
    const indexes = headers
      .map((header, index) =>
        getSectionForHeader(header, inputHeaderCount) === label
          ? index + 1
          : null
      )
      .filter(Boolean);
    if (indexes.length > 1) {
      worksheet.mergeCells(1, indexes[0], 1, indexes[indexes.length - 1]);
    }
  };
  [
    "Student details and ranks",
    "Top 5 through JEE Main",
    "Top 5 through JEE Advanced",
    "Status",
  ].forEach(mergeSameSection);

  sectionRow.height = 26;
  headerRow.height = 34;
  sectionRow.eachCell((cell) => styleHeaderCell(cell, "FF7A2628"));
  headerRow.eachCell((cell) => styleHeaderCell(cell));

  records.forEach((record) => {
    worksheet.addRow(headers.map((header) => record[header] ?? ""));
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;
    const status = String(
      row.getCell(headers.indexOf("Prediction Status") + 1).value || ""
    );
    row.height = 42;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const header = headers[columnNumber - 1];
      const isRecommendation =
        /^JEE (Main|Advanced) (College|Course) \d+$/.test(header);
      cell.alignment = {
        vertical: "top",
        wrapText: isRecommendation || header.includes("Prediction Status"),
      };
      cell.border = styleCellBorder;
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
    from: { row: 2, column: 1 },
    to: { row: 2, column: headers.length },
  };

  return workbook.xlsx.writeBuffer();
};

const parseUploadedRows = async (body) => {
  if (body?.csvText && typeof body.csvText === "string") {
    return parseCsv(body.csvText);
  }
  if (body?.xlsxBase64 && typeof body.xlsxBase64 === "string") {
    return parseXlsx(body.xlsxBase64);
  }
  return null;
};

const sendWorkbook = (res, workbookBuffer, filename) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(Buffer.from(workbookBuffer));
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

  if (body?.responseType === "template") {
    return sendWorkbook(
      res,
      await buildTemplateWorkbookBuffer(),
      "josaa-batch-prediction-template.xlsx"
    );
  }

  const parsedRows = await parseUploadedRows(body);
  if (!parsedRows) {
    return res.status(400).json({ error: "Please upload a CSV or XLSX file." });
  }

  const { headers, records } = parsedRows;
  const missingColumns = getMissingColumns(headers);
  if (missingColumns.length > 0) {
    return res.status(400).json({
      error: `Missing required columns: ${missingColumns.join(", ")}`,
    });
  }

  const { completedHeaders, completedRecords, summary } = await processRecords(
    headers,
    records
  );

  if (body?.responseType === "xlsx") {
    return sendWorkbook(
      res,
      await buildStyledWorkbookBuffer(completedHeaders, completedRecords),
      "batch-predictions-completed.xlsx"
    );
  }

  return res.status(200).json({
    summary,
    headers: completedHeaders,
    records: completedRecords,
    preview: completedRecords.slice(0, 5),
    csv: toCsv(completedHeaders, completedRecords),
  });
}

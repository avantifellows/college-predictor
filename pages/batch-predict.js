import SeoHead from "../components/SeoHead";
import React, { useMemo, useState } from "react";
import { AlertCircle, Download, FileSpreadsheet, Upload } from "lucide-react";

const sampleColumns = ["State", "Category", "Gender", "Score"];

const previewColumns = [
  "Student Name",
  "State",
  "Category",
  "Gender",
  "Score",
  "Category Rank (Estimate)",
  "College 1",
  "Course 1",
  "Prediction Status",
];

const requiredColumns = ["State", "Category", "Gender"];

const countCsvRows = (text) =>
  text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean).length - 1;

const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getCsvOutputFilename = (filename) => {
  const baseName = filename.replace(/\.csv$/i, "") || "batch-predictions";
  return `${baseName} - completed.csv`;
};

const getExcelOutputFilename = (filename) => {
  const baseName = filename.replace(/\.csv$/i, "") || "batch-predictions";
  return `${baseName} - completed.xlsx`;
};

const BatchPredict = () => {
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const canSubmit = Boolean(csvText) && !isProcessing;

  const statusCards = useMemo(() => {
    if (!result?.summary) return [];
    return [
      { label: "Rows", value: result.summary.totalRows },
      { label: "Predicted", value: result.summary.predictedRows },
      { label: "No eligible", value: result.summary.noEligibleRows },
      { label: "Needs review", value: result.summary.rowsWithErrors },
    ];
  }, [result]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    setResult(null);
    setError("");

    if (!file) {
      setFileName("");
      setCsvText("");
      setRowCount(0);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a CSV file.");
      setFileName("");
      setCsvText("");
      setRowCount(0);
      return;
    }

    const text = await file.text();
    setFileName(file.name);
    setCsvText(text);
    setRowCount(Math.max(countCsvRows(text), 0));
  };

  const handlePredict = async () => {
    setIsProcessing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/batch-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam: "JoSAA",
          csvText,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to process this file.");
        return;
      }

      setResult(data);
    } catch (apiError) {
      setError("Unable to process this file right now.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!result?.csv) return;
    downloadFile(
      result.csv,
      getCsvOutputFilename(fileName),
      "text/csv;charset=utf-8"
    );
  };

  const handleDownloadExcel = async () => {
    if (!result?.csv || !csvText) return;
    setIsDownloadingExcel(true);
    setError("");

    try {
      const response = await fetch("/api/batch-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam: "JoSAA",
          csvText,
          responseType: "xlsx",
        }),
      });

      if (!response.ok) {
        let errorMessage = "Unable to generate Excel file.";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (parseError) {}
        setError(errorMessage);
        return;
      }

      const workbookBlob = await response.blob();
      downloadFile(
        workbookBlob,
        getExcelOutputFilename(fileName),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    } catch (apiError) {
      setError("Unable to generate Excel file right now.");
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  return (
    <>
      <SeoHead 
        title="Batch Predictor | Avanti Fellows" 
        description="Upload a CSV to generate batch college predictions for multiple students."
      />
      <div className="flex min-h-[calc(100vh-120px)] flex-col">
        <div className="mt-6 flex w-full flex-col items-center justify-start px-4 pb-10 sm:mt-8">
          <div className="mt-4 flex w-full max-w-3xl flex-col rounded-2xl border border-[#eaded8] bg-white p-5 shadow-sm sm:mt-6 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-[#eaded8] pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#B52326]">
                  JoSAA
                </p>
                <h1 className="mt-1 text-2xl font-bold text-[#2f2320] md:text-3xl">
                  Batch Predictor
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d5550]">
                  Upload one student CSV and download the same sheet with rank
                  estimates and top college-course predictions filled in.
                </p>
              </div>
              <div className="rounded-xl border border-[#eaded8] bg-[#fffdfa] p-4 text-sm text-[#4a3935]">
                <p className="font-semibold text-[#2f2320]">Required columns</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {requiredColumns.map((column) => (
                    <span
                      key={column}
                      className="rounded-full bg-[#f8efec] px-3 py-1 text-xs font-semibold text-[#5b1f20]"
                    >
                      {column}
                    </span>
                  ))}
                </div>
                <p className="mt-3 font-semibold text-[#2f2320]">
                  Also include one of these:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Score", "Percentile", "Category Rank (Estimate)"].map(
                    (column) => (
                      <span
                        key={column}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#5b1f20] ring-1 ring-[#eaded8]"
                      >
                        {column}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 py-5">
              <div className="rounded-xl border border-[#eaded8] bg-[#fffdfa] p-4">
                <label className="mb-3 block text-sm font-semibold text-[#4a3935]">
                  Upload student CSV
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#B52326] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#9E1F22]">
                    <Upload size={18} aria-hidden="true" />
                    Choose CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <div className="min-w-0 text-sm text-[#4a3935]">
                    {fileName ? (
                      <>
                        <p className="truncate font-semibold">{fileName}</p>
                        <p className="text-xs text-[#6d5550]">
                          {rowCount} student rows detected
                        </p>
                      </>
                    ) : (
                      <p>No file selected</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-[#eaded8] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7a2628]">
                    Simple template
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sampleColumns.map((column) => (
                      <span
                        key={column}
                        className="rounded-full bg-[#f8efec] px-3 py-1 text-xs font-semibold text-[#5b1f20]"
                      >
                        {column}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#eaded8] bg-[#fffdfa] p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f8efec] text-[#B52326]">
                    <FileSpreadsheet size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[#2f2320]">
                      Output columns
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#6d5550]">
                      The completed file keeps original columns and fills
                      percentile, AIR, category rank, and College/Course 1-10.
                      Download Excel for cleaner column widths.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePredict}
                  disabled={!canSubmit}
                  className="mt-5 w-full rounded-lg bg-[#B52326] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#9E1F22] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                >
                  {isProcessing
                    ? "Generating predictions..."
                    : "Generate Predictions"}
                </button>
                {result?.csv && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleDownloadExcel}
                      disabled={isDownloadingExcel}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#B52326] bg-white px-5 py-3 text-sm font-semibold text-[#7a2628] transition hover:bg-[#f8efec] disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-500"
                    >
                      <Download size={18} aria-hidden="true" />
                      {isDownloadingExcel
                        ? "Preparing Excel..."
                        : "Download Excel file"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#d8c7c1] bg-white px-5 py-3 text-sm font-semibold text-[#7a2628] transition hover:bg-[#f8efec]"
                    >
                      Download CSV
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle size={18} aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}

            {statusCards.length > 0 && (
              <div className="grid gap-3 border-t border-[#eaded8] pt-5 sm:grid-cols-2">
                {statusCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-[#eaded8] bg-[#fffdfa] p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#7a2628]">
                      {card.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#2f2320]">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {result?.preview?.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-xl border border-[#eaded8]">
                <div className="border-b border-[#eaded8] bg-[#fffdfa] px-4 py-3">
                  <h2 className="text-base font-bold text-[#2f2320]">
                    Preview
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="bg-[#f8efec] text-xs font-semibold uppercase tracking-wide text-[#5b1f20]">
                      <tr>
                        {previewColumns.map((column) => (
                          <th key={column} className="px-3 py-3">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.preview.map((row, rowIndex) => (
                        <tr
                          key={`${row["Student ID"] || rowIndex}-${rowIndex}`}
                          className="border-t border-[#eaded8] bg-white"
                        >
                          {previewColumns.map((column) => (
                            <td
                              key={column}
                              className="max-w-[260px] truncate px-3 py-3 text-xs text-[#4a3935]"
                              title={row[column] || ""}
                            >
                              {row[column] || ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BatchPredict;

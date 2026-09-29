#!/usr/bin/env node
// Renders every college, exam and career page view against the real data in
// public/data, and fails if any of them throws. A page that crashes for one
// record (a missing import, a field some rows lack) shows students
// "Application error"; this catches it before a deploy does.
//
//   npm run check:pages
//
// JSX is compiled with the automatic runtime, the same way Next does, so a
// file that uses JSX without importing React passes here as it does in the
// app, while an explicit React.Fragment without the import fails in both.
const fs = require("fs");
const path = require("path");
const { addHook } = require("sucrase/dist/register");

addHook(".js", {
  transforms: ["imports", "jsx"],
  jsxRuntime: "automatic",
  production: true,
});

const ROOT = path.join(__dirname, "..");
const React = require("react");
const { renderToString } = require("react-dom/server");

const readJson = (rel) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const failures = [];

function renderAll(label, rows, idOf, element) {
  let ok = 0;
  for (const row of rows) {
    try {
      renderToString(element(row));
      ok += 1;
    } catch (err) {
      failures.push(`${label} ${idOf(row)}: ${err.message.split("\n")[0]}`);
    }
  }
  console.log(`${label.padEnd(8)} ${ok}/${rows.length} render`);
}

// 1. every record through its page view
const CollegeView = require(path.join(
  ROOT,
  "components/CollegeView.js"
)).default;
const ExamView = require(path.join(ROOT, "components/ExamView.js")).default;
const { CareerDetail } = require(path.join(ROOT, "components/careerShared.js"));

renderAll(
  "college",
  readJson("public/data/colleges/colleges.json"),
  (c) => c.college_id,
  (c) => React.createElement(CollegeView, { c })
);
renderAll(
  "exam",
  readJson("public/data/exams/exams.json"),
  (e) => e.exam_id,
  (e) => React.createElement(ExamView, { e })
);
renderAll(
  "career",
  readJson("public/data/careers/careers.json"),
  (c) => c.career_id,
  (c) => React.createElement(CareerDetail, { c })
);

// 2. `React.` used in a file that never imports React: a crash waiting for
// whichever record reaches that line
const sources = ["pages", "components", "utils"].flatMap((dir) =>
  fs
    .readdirSync(path.join(ROOT, dir), { recursive: true })
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(dir, f))
);
for (const rel of sources) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (/\bReact\./.test(src) && !/import\s+(\*\s+as\s+)?React\b/.test(src)) {
    failures.push(`${rel}: uses React. without importing React`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures.slice(0, 50)) console.error(`  ${f}`);
  if (failures.length > 50)
    console.error(`  … and ${failures.length - 50} more`);
  process.exit(1);
}
console.log("\nall pages render");

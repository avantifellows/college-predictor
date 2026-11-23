#!/usr/bin/env node
// Every college name the predictor prints, tagged with its Colleges-tab card
// and that card's AISHE code: data-sources/predictor_college_crosswalk.csv.
//
//   node scripts/build_predictor_college_crosswalk.js            # all exams
//   node scripts/build_predictor_college_crosswalk.js NEETUG     # one exam
//   node scripts/build_predictor_college_crosswalk.js --check    # fails if stale
//
// One row per (exam, state, name as the counselling prints it). `method`
// says how the card was found: "college id" (the row carries it), "exact
// name", "name match" (scripts/build_college_name_links.js's matcher),
// "reviewed" (a decision in college_name_links_review.json) or "none" (no
// card: a gap between the predictor and the Colleges tab). Re-run after
// colleges.json, name_links.json or predictor data change; CI runs --check.
const fs = require("fs");
const path = require("path");
const { addHook } = require("sucrase/dist/register");

addHook(".js", { transforms: ["imports", "jsx"], jsxRuntime: "automatic" });

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data-sources/predictor_college_crosswalk.csv");
const examConfigs = require(path.join(ROOT, "examConfig.js")).default;
const { PREDICTOR_EXAMS } = require(path.join(
  ROOT,
  "utils/predictorRoutes.js"
));
const { cardFor, linkKeyOf } = require(path.join(
  ROOT,
  "utils/collegeFacts.js"
));
const review = JSON.parse(
  fs.readFileSync(path.join(__dirname, "college_name_links_review.json"))
).decisions;

const check = process.argv.includes("--check");
const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
const nameOf = (r, exam) => {
  const raw =
    r["Institute"] ||
    r["College Name"] ||
    r.institute_name ||
    r.institute ||
    "";
  return exam === "KCET" ? String(raw).replace(/^[A-Z]\d{3}\s+/, "") : raw;
};
const csv = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const out = [
  [
    "exam",
    "state",
    "predictor_name",
    "college_id",
    "aishe_code",
    "card_name",
    "method",
  ],
];
const counts = {};
for (const key of new Set(
  PREDICTOR_EXAMS.flatMap((e) => e.counsellings.map((c) => c.key))
)) {
  if (only && key !== only) continue;
  const cfg = examConfigs[key];
  if (!cfg?.getDataPath) continue;
  const cats = (cfg.fields || []).find((f) => f.name === "category")?.options;
  const files = new Set();
  for (const o of cats?.length ? cats : [undefined]) {
    try {
      files.add(cfg.getDataPath(o && typeof o === "object" ? o.value : o));
    } catch {
      /* a category with no file */
    }
  }
  const seen = new Set();
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const rows = JSON.parse(fs.readFileSync(f, "utf8"));
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      const name = nameOf(r, key);
      const state = r.State || r.state || "";
      const k = `${state}|${name}`;
      if (!name || seen.has(k)) continue;
      seen.add(k);
      const exact = cardFor(r, key, { links: false });
      const card = exact || cardFor(r, key);
      const method = !card
        ? "none"
        : exact
        ? r["College ID"] && exact.college_id === r["College ID"]
          ? "college id"
          : "exact name"
        : linkKeyOf(name, state) in review
        ? "reviewed"
        : "name match";
      counts[key] = counts[key] || {};
      counts[key][method] = (counts[key][method] || 0) + 1;
      out.push([
        key,
        state,
        name,
        card?.college_id,
        card?.aishe_code,
        card?.display_name,
        method,
      ]);
    }
  }
}
const body = out.map((r) => r.map(csv).join(",")).join("\n") + "\n";
if (check) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== body) {
    console.error(
      `${path.relative(
        ROOT,
        OUT
      )} is stale: run node scripts/build_predictor_college_crosswalk.js`
    );
    process.exit(1);
  }
  console.log(`crosswalk up to date (${out.length - 1} names)`);
  process.exit(0);
}
fs.writeFileSync(OUT, body);
for (const [k, c] of Object.entries(counts))
  console.log(
    k.padEnd(16),
    Object.entries(c)
      .map(([m, n]) => `${m} ${n}`)
      .join(", ")
  );
console.log(`${out.length - 1} names -> ${path.relative(ROOT, OUT)}`);

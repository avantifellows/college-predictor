#!/usr/bin/env node
// Writes public/sitemap.xml so Google finds every college, career and exam
// page, not only the ones it happens to reach through links. Runs before
// every `next build` (package.json), so the list always matches the data
// that build ships; the file itself is not in git.
const fs = require("fs");
const path = require("path");
const { addHook } = require("sucrase/dist/register");

addHook(".js", { transforms: ["imports"] });

const ROOT = path.join(__dirname, "..");
const SITE = "https://futures.avantifellows.org";
// the same slugs the college pages use
const { slugMap } = require(path.join(ROOT, "utils/collegesData.js"));

const readJson = (rel) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

// Pages a student would search for. Left out: results and sign-in pages,
// the signed-in Student Corner, and old addresses that only redirect.
const PAGES = [
  "/",
  "/get-started",
  "/predictor",
  "/careers",
  "/career-quiz",
  "/colleges",
  "/compare",
  "/exams",
  "/josaa",
  "/mhtcet",
  "/mock-allotment",
  "/scholarships",
  "/datasets",
  "/sections/careers",
  "/sections/colleges",
  "/sections/exams",
];

const colleges = readJson("public/data/colleges/colleges.json");
const slugs = slugMap(colleges);
const urls = [
  ...PAGES,
  ...colleges.map((c) => `/colleges/${slugs[c.college_id]}`),
  ...readJson("public/data/careers/careers.json").map(
    (c) => `/careers/${c.career_id}`
  ),
  ...readJson("public/data/exams/exams.json").map((e) => `/exams/${e.exam_id}`),
];

// Two colleges with the same name in the same state get the same slug, and
// the page opens the first; say so rather than fail the build
const unique = [...new Set(urls)];
if (unique.length !== urls.length) {
  console.warn(
    `sitemap: ${urls.length - unique.length} pages share an address`
  );
}

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  unique.map((u) => `  <url><loc>${esc(SITE + u)}</loc></url>\n`).join("") +
  "</urlset>\n";

fs.writeFileSync(path.join(ROOT, "public/sitemap.xml"), xml);
console.log(`sitemap.xml: ${unique.length} pages`);

// NIRF rank, median salary and placed %, taken from the college cards
// (public/data/colleges/colleges.json, which scripts/build_colleges_data.py
// builds from nirf_fact_rankings and nirf_fact_dcs_placements). The predictor,
// the Colleges tab and Compare all read these numbers from the same card, so a
// college shows one salary everywhere. Server-only: it reads the file.
import fs from "fs";
import path from "path";

let index = null;

const JOSAA_EXAMS = new Set(["JoSAA", "JEE Main-JOSAA", "JEE Advanced"]);

// the slug Compare and the predictor's name links use for a college
export const slugOf = (x) =>
  String(x || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const loadIndex = () => {
  if (index) return index;
  const file = path.join(
    process.cwd(),
    "public",
    "data",
    "colleges",
    "colleges.json"
  );
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const cards = Array.isArray(raw) ? raw : raw.colleges || [];
  const byId = new Map();
  const bySlug = new Map();
  for (const c of cards) {
    byId.set(c.college_id, c);
    for (const name of [c.display_name, c.name, ...(c.aka || [])]) {
      const s = slugOf(name);
      // a name two cards share points at neither
      if (!s) continue;
      bySlug.set(s, bySlug.has(s) && bySlug.get(s) !== c ? null : c);
    }
  }
  index = { byId, bySlug };
  return index;
};

// KEA prefixes each college with its code ("E001 University ...")
const nameOf = (row, exam) => {
  const raw =
    row["Institute"] ||
    row["College Name"] ||
    row.institute_name ||
    row.institute ||
    "";
  return exam === "KCET" ? String(raw).replace(/^[A-Z]\d{3}\s+/, "") : raw;
};

export const cardFor = (row, exam) => {
  const { byId, bySlug } = loadIndex();
  return (
    byId.get(row["College ID"]) || bySlug.get(slugOf(nameOf(row, exam))) || null
  );
};

// Adds "NIRF Rank", "NIRF List", "Median Salary", "Placed %" and "Students
// Placed" (the size behind the median) from the row's card. A row with a card always takes the card's values (null where
// NIRF has none); JoSAA's spreadsheet "Expected Salary" is dropped either way.
// A satellite campus shares its parent's College ID (BIT Patna and Deoghar
// off-campuses under BIT Mesra, IIT Delhi's Abu Dhabi programmes, IIIT
// Vadodara's Diu campus) but not its NIRF return: no rank or salary for it.
const isSatelliteCampus = (row) =>
  /off[- ]campus|international campus/i.test(String(row["Institute"] || "")) ||
  /^abu dhabi campus/i.test(String(row["Academic Program Name"] || ""));

export const withCollegeFacts = (rows, exam) =>
  rows.map((row) => {
    const card = isSatelliteCampus(row) ? null : cardFor(row, exam);
    const out = { ...row };
    delete out["Expected Salary"];
    delete out["Salary Tier"];
    // which college's figures these are, for anything grouping rows by
    // college (a satellite campus is its own group, not its parent's)
    out["Facts Key"] = card
      ? card.college_id
      : `campus:${row["Institute"]}:${
          String(row["Academic Program Name"] || "").match(/^abu dhabi campus/i)
            ? "abu-dhabi"
            : ""
        }`;
    if (card) {
      // JoSAA's rank column reads as an engineering rank: a college NIRF
      // ranks only on its University list (JNU, Assam University) shows none.
      // Architecture-list ranks stay, for the SPAs' B.Arch and B.Plan.
      const offList =
        JOSAA_EXAMS.has(exam) && card.nirf?.category === "University";
      out["NIRF Rank"] = offList ? null : card.nirf?.rank ?? null;
      out["NIRF List"] = card.nirf?.category ?? null;
      out["Median Salary"] = card.placement?.median_salary ?? null;
      out["Placed %"] = card.placement?.percentage_with_outcome ?? null;
      out["Students Placed"] = card.placement?.students_placed ?? null;
    } else if ("NIRF Rank" in row) {
      // no card: nothing NIRF-built to show, rather than a second source
      out["NIRF Rank"] = null;
    }
    return out;
  });

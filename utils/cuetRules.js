// CUET (UG) course rules for DU and BHU, from their 2025 bulletins.
//
// Neither university admits on one CUET total: each course adds up its own
// papers, so a student's score is different for every course (DU B.Sc.
// Physics counts Physics + Chemistry + Maths; BHU B.A. counts English or Hindi
// + GAT). Students know their per-paper normalized scores (out of 250, on the
// NTA scorecard), so we take those and work out each course's score here.
//
// scripts/build_cuet_2025.py tags every cutoff row with a rule id and writes
// the rules (public/data/CUET/cuet_rules.json) from the warehouse tables.

import RULES from "../public/data/CUET/cuet_rules.json";

export const MAX_PAPER_SCORE = 250;
export const MAX_PAPERS = 5; // CUET 2025: up to 5 papers

// DU List A (languages) and List B (domain subjects), plus GAT
export const LANGUAGES = [
  ["english", "English"],
  ["hindi", "Hindi"],
  ["assamese", "Assamese"],
  ["bengali", "Bengali"],
  ["gujarati", "Gujarati"],
  ["kannada", "Kannada"],
  ["malayalam", "Malayalam"],
  ["marathi", "Marathi"],
  ["odia", "Odia"],
  ["punjabi", "Punjabi"],
  ["sanskrit", "Sanskrit"],
  ["tamil", "Tamil"],
  ["telugu", "Telugu"],
  ["urdu", "Urdu"],
];
export const SUBJECTS = [
  ["accountancy", "Accountancy"],
  ["agriculture", "Agriculture"],
  ["anthropology", "Anthropology"],
  ["biology", "Biology"],
  ["business", "Business Studies"],
  ["chemistry", "Chemistry"],
  ["cs", "Computer Science"],
  ["economics", "Economics"],
  ["envsci", "Environmental Science"],
  ["finearts", "Fine Arts"],
  ["geography", "Geography"],
  ["history", "History"],
  ["homesci", "Home Science"],
  ["ktpi", "Knowledge Tradition (KTPI)"],
  ["massmedia", "Mass Media"],
  ["maths", "Mathematics"],
  ["perfarts", "Performing Arts"],
  ["phyed", "Physical Education"],
  ["physics", "Physics"],
  ["polsci", "Political Science"],
  ["psychology", "Psychology"],
  ["sociology", "Sociology"],
];
export const GAT = ["gat", "General Aptitude Test (GAT)"];

export const PAPERS = [...LANGUAGES, ...SUBJECTS, GAT];
export const PAPER_LABEL = Object.fromEntries(PAPERS);
const LANG_IDS = LANGUAGES.map(([id]) => id);
const SUBJECT_IDS = SUBJECTS.map(([id]) => id);

// The rules come from the warehouse (external_data_sources/cuet, read from
// the DU / BHU bulletins), written by scripts/build_cuet_2025.py. A rule's
// combos are alternatives; slots are "L" any language, "B" any domain
// subject, "G" GAT, or a list of the papers that slot accepts. When a
// course's combos differ in size (rule.prorated) the smaller is scaled up to
// the larger's scale: our reading of DU's "appropriate proration".
const SLOT = { L: LANG_IDS, B: SUBJECT_IDS, G: ["gat"] };
export const CUET_RULES = Object.fromEntries(
  Object.entries(RULES).map(([id, r]) => [
    id,
    {
      ...r,
      combos: r.combos.map((c) => c.map((slot) => SLOT[slot] || slot)),
    },
  ])
);

// best sum filling `slots` with distinct papers from `scores`, or null.
// zeroIfMissing: a slot no paper fills counts 0 instead (Allahabad scores a
// paper the student didn't take as 0)
const bestFill = (slots, scores, zeroIfMissing = false, used = new Set()) => {
  if (!slots.length) return 0;
  const [slot, ...rest] = slots;
  let best = zeroIfMissing ? bestFill(rest, scores, true, used) : null;
  for (const id of slot) {
    if (used.has(id) || scores[id] === undefined) continue;
    used.add(id);
    const tail = bestFill(rest, scores, zeroIfMissing, used);
    used.delete(id);
    if (tail !== null && (best === null || scores[id] + tail > best)) {
      best = scores[id] + tail;
    }
  }
  return best;
};

/** The most a course's score can be: 250 per paper it counts (750, 1000) */
export const courseMax = (ruleId) => CUET_RULES[ruleId]?.max ?? null;

/**
 * The papers a course counts, short enough for a table line:
 * "Language + Maths + 2 subjects", "Physics + Chemistry + Maths",
 * "Sanskrit". Combinations are joined with "or".
 */
export const coursePapers = (ruleId) => CUET_RULES[ruleId]?.papers ?? null;

/**
 * The student's score for a course under `ruleId`, or null when their papers
 * don't make up any of its combinations. `scores` is { paperId: number }.
 */
export function courseScore(ruleId, scores) {
  const rule = CUET_RULES[ruleId];
  if (!rule) return null;
  if (rule.needsLanguage && !LANG_IDS.some((id) => scores[id] !== undefined)) {
    return null;
  }
  const size = Math.max(...rule.combos.map((c) => c.length));
  let best = null;
  for (const combo of rule.combos) {
    const sum = bestFill(combo, scores, rule.zeroIfMissing);
    if (sum === null) continue;
    const scaled = (sum * size) / combo.length;
    if (best === null || scaled > best) best = scaled;
  }
  if (best === null) return null;
  // the university may print the paper total rescaled (JNU: of 500 -> of 100)
  const scaled = rule.papersMax ? (best * rule.max) / rule.papersMax : best;
  return Math.round(scaled * 100) / 100;
}

/** "english-212,maths-165" <-> { english: 212, maths: 165 } (the URL form) */
export function parseScores(text) {
  const scores = {};
  for (const part of String(text || "").split(",")) {
    const [id, value] = part.split("-");
    const n = Number(value);
    if (!PAPER_LABEL[id] || value === undefined || value === "") continue;
    if (!Number.isFinite(n) || n < 0 || n > MAX_PAPER_SCORE) continue;
    scores[id] = n;
  }
  return scores;
}

export const formatScores = (scores) =>
  Object.entries(scores)
    .map(([id, n]) => `${id}-${n}`)
    .join(",");

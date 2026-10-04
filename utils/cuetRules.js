// CUET (UG) course rules for DU and BHU, from their 2025 bulletins.
//
// Neither university admits on one CUET total: each course adds up its own
// papers, so a student's score is different for every course (DU B.Sc.
// Physics counts Physics + Chemistry + Maths; BHU B.A. counts English or Hindi
// + GAT). Students know their per-paper normalized scores (out of 250, on the
// NTA scorecard), so we take those and work out each course's score here.
//
// scripts/build_cuet_2025.py tags every cutoff row with one of these rule ids.

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

// slots: L = any language, B = any domain subject, G = GAT, or a list of
// the papers that slot accepts
const L = LANG_IDS;
const B = SUBJECT_IDS;
const G = ["gat"];
const P = ["physics"];
const C = ["chemistry"];
const M = ["maths"];
const BIO = ["biology"];
const EN_HI = ["english", "hindi"];

const DU_L3_COMBOS = [
  [L, B, B, B],
  [L, L, B, B],
];
const langHons = (lang, generic = false) => [
  [[lang], B, B, B],
  [[lang], L, B, B],
  ...(generic ? DU_L3_COMBOS : []),
];

// combos: the course takes the best of these. When they hold different
// numbers of papers DU prorates ("appropriate proration will be done"), so a
// 3-paper combo is scaled up to the 4-paper scale. needsLanguage: the course
// counts only science papers but asks for a language paper too.
export const CUET_RULES = {
  DU_L3: { combos: DU_L3_COMBOS },
  DU_BA_PROG: { combos: [...DU_L3_COMBOS, [L, B, G]] },
  DU_VOC_SOFTWARE: {
    combos: [
      [L, M, B, B],
      [L, L, M, B],
      [L, M, G],
    ],
  },
  DU_LANG_ENGLISH: { combos: langHons("english") },
  DU_LANG_HINDI: { combos: langHons("hindi") },
  DU_LANG_URDU: { combos: langHons("urdu") },
  DU_LANG_BENGALI: { combos: langHons("bengali", true) },
  DU_LANG_PUNJABI: { combos: langHons("punjabi", true) },
  DU_LANG_SANSKRIT: {
    combos: [
      [L, ["sanskrit"], B, B],
      [["sanskrit"], B, B, B],
    ],
  },
  DU_ECONOMICS: { combos: [[L, M, B, B]] },
  DU_HINDI_PATRAKARITA: {
    combos: [
      [["hindi"], B, B, B],
      [["hindi"], G],
    ],
  },
  DU_JOURNALISM: {
    combos: [
      [["english"], B, B, B],
      [["english"], G],
    ],
  },
  DU_JOURNALISM_5YR: {
    combos: [
      [L, ["massmedia"], G],
      [L, G],
    ],
  },
  DU_MULTIMEDIA: { combos: [[L, B, G]] },
  DU_L_MATH_GAT: { combos: [[L, M, G]] },
  DU_L_MATH_2: {
    combos: [
      [L, M, B, B],
      [L, L, M, B],
    ],
  },
  DU_BCOM_HONS: {
    combos: [
      [L, M, B, B],
      [L, ["accountancy"], B, B],
    ],
  },
  DU_BCOM: {
    combos: [
      [L, B, B, B],
      [L, B, G],
    ],
  },
  DU_PCB: { combos: [[P, C, BIO]], needsLanguage: true },
  DU_PCM: { combos: [[P, C, M]], needsLanguage: true },
  DU_BIOCHEM: {
    combos: [
      [C, BIO, P],
      [C, BIO, M],
    ],
    needsLanguage: true,
  },
  DU_PM_C_OR_CS: {
    combos: [
      [P, M, C],
      [P, M, ["cs"]],
    ],
    needsLanguage: true,
  },
  DU_PC_B_OR_M: {
    combos: [
      [P, C, BIO],
      [P, C, M],
    ],
    needsLanguage: true,
  },
  DU_GEOLOGY: {
    combos: [
      [P, C, M],
      [P, C, ["geography"]],
      [P, C, BIO],
    ],
    needsLanguage: true,
  },
  DU_HOME_SCIENCE: {
    combos: [
      [BIO, P, B],
      [BIO, C, B],
    ],
    needsLanguage: true,
  },

  BHU_L_GAT: { combos: [[EN_HI, G]] },
  BHU_L_BIO: { combos: [[EN_HI, BIO]] },
  BHU_BCOM: { combos: [[["accountancy"], ["business"], G]] },
  BHU_PCM: { combos: [[C, M, P]] },
  BHU_PCB: { combos: [[BIO, C, P]] },
  BHU_PCM_OR_PCB: {
    combos: [
      [C, M, P],
      [BIO, C, P],
    ],
  },
  BHU_AGRI: {
    combos: [
      [C, M, P],
      [BIO, C, P],
      [["agriculture"], BIO, C],
    ],
  },
  BHU_SHASTRI: { combos: [[["sanskrit"]]] },
};

// best sum filling `slots` with distinct papers from `scores`, or null
const bestFill = (slots, scores, used = new Set()) => {
  if (!slots.length) return 0;
  const [slot, ...rest] = slots;
  let best = null;
  for (const id of slot) {
    if (used.has(id) || scores[id] === undefined) continue;
    used.add(id);
    const tail = bestFill(rest, scores, used);
    used.delete(id);
    if (tail !== null && (best === null || scores[id] + tail > best)) {
      best = scores[id] + tail;
    }
  }
  return best;
};

/** The most a course's score can be: 250 per paper it counts (750, 1000) */
export const courseMax = (ruleId) =>
  Math.max(...(CUET_RULES[ruleId]?.combos || [[]]).map((c) => c.length)) *
  MAX_PAPER_SCORE;

const slotName = (slot) => {
  const k = slot.join();
  if (k === LANG_IDS.join()) return "language";
  if (k === SUBJECT_IDS.join()) return "subject";
  if (k === "gat") return "GAT";
  if (k === EN_HI.join()) return "English or Hindi";
  return slot
    .map((id) => (id === "maths" ? "Maths" : PAPER_LABEL[id]))
    .join(" or ");
};

/**
 * The papers a course counts, short enough for a table line:
 * "Language + Maths + 2 subjects", "Physics + Chemistry + Maths",
 * "Sanskrit". Combinations are joined with "or".
 */
export function coursePapers(ruleId) {
  const rule = CUET_RULES[ruleId];
  if (!rule) return null;
  const combo = (slots) => {
    const parts = [];
    for (const name of slots.map(slotName)) {
      const last = parts[parts.length - 1];
      if (last && last.name === name) last.n += 1;
      else parts.push({ name, n: 1 });
    }
    return parts
      .map(({ name, n }) =>
        n === 1
          ? name
          : `${n} ${
              name === "language" || name === "subject"
                ? `${name}s`
                : `x ${name}`
            }`
      )
      .join(" + ");
  };
  const text = rule.combos.map(combo).join(", or ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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
    const sum = bestFill(combo, scores);
    if (sum === null) continue;
    const scaled = (sum * size) / combo.length;
    if (best === null || scaled > best) best = scaled;
  }
  return best === null ? null : Math.round(best * 100) / 100;
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

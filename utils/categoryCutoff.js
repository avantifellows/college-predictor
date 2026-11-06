import { profileDefaultsForFields } from "./portalSession";

// The rank a college closed at for THIS student: their category, gender and
// home state, from the predictor's own full cutoff list (/api/exam-result
// view=full), filtered to the college (and its branch, or the branches of
// the plan's career). Only for exams whose every required field the
// profile (or a safe default) can fill: elsewhere a wrong home university
// or category code would give a confident wrong number, so those plans keep
// the college card's open-category figure.

// exam key → the extra fields the profile doesn't carry
const SUPPORTED = {
  // IIT rows only come with JEE Advanced qualified; the college filter keeps
  // the right ones
  JoSAA: { program: "Engineering", qualifiedJeeAdv: "Yes" },
  NEETUG: { program: "MBBS" },
  TGEAPCET: {},
  BITSAT: { campus: "Any" },
};
export const categoryCutoffExams = Object.keys(SUPPORTED);

const cache = new Map(); // exam key → Promise<{ rows, category }>

async function rowsFor(exam, profile) {
  const key = `${exam}|${profile?.category}|${profile?.gender}|${profile?.state}`;
  if (!cache.has(key))
    cache.set(
      key,
      (async () => {
        const { default: examConfigs } = await import("../examConfig");
        const fields = examConfigs[exam]?.fields || [];
        const defaults = profileDefaultsForFields(profile, fields);
        // an exam with a category field needs the student's category, or
        // the number would be someone else's
        if (fields.some((f) => f.name === "category") && !defaults.category)
          return null;
        const query = { exam, view: "full", ...SUPPORTED[exam], ...defaults };
        const r = await fetch(`/api/exam-result?${new URLSearchParams(query)}`);
        if (!r.ok) return null;
        const rows = await r.json();
        return Array.isArray(rows)
          ? { rows, category: defaults.category || null }
          : null;
      })().catch(() => null)
    );
  return cache.get(key);
}

const num = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * { lo, hi, category } for one plan, or null when there's no such number
 * (unsupported exam, no category on the profile, college not in the list).
 * branches: the program names to keep (null = all the college's rows).
 * rowExam: JoSAA's "JEE Main" / "JEE Advanced", to keep that exam's seats.
 */
export async function categoryCutoff({
  exam,
  rowExam,
  collegeId,
  branches,
  profile,
}) {
  if (!SUPPORTED[exam] || !collegeId) return null;
  const got = await rowsFor(exam, profile);
  if (!got) return null;
  const ranks = got.rows
    .filter((r) => r["Facts Key"] === collegeId)
    // JoSAA: only the plan's exam (JEE Main or JEE Advanced)
    .filter((r) => !rowExam || !r.Exam || r.Exam === rowExam)
    .filter((r) => {
      if (!branches) return true;
      const prog = String(
        r["Academic Program Name"] || r["Program"] || r["Course"] || ""
      ).toLowerCase();
      return branches.some((b) => prog.startsWith(String(b).toLowerCase()));
    })
    .map((r) => num(r["Closing Rank"] ?? r.closing_rank))
    .filter(Boolean);
  if (!ranks.length) return null;
  return {
    lo: Math.min(...ranks),
    hi: Math.max(...ranks),
    category: got.category,
  };
}

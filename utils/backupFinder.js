// The backup-exam finder (/backup-exams): three questions (public or
// private college, home state or national, which stream as the backup),
// then the five exams that fit, most applicants first. It merges the
// preparation plan's old "See backup exam options" and "See backup exam
// cutoffs" steps: each exam it suggests links to its page and, where the
// predictor has them, its cutoffs.

export const COLLEGE_PREFS = [
  { id: "public", label: "Public", sub: "Government colleges" },
  { id: "private", label: "Private" },
  { id: "any", label: "No preference" },
];

export const PLACE_PREFS = (state) => [
  { id: "state", label: state ? `In ${state}` : "In my state" },
  { id: "national", label: "National level", sub: "Anywhere in India" },
  { id: "any", label: "Either" },
];

// the backup streams, how each reads off an exam's `streams`, and which
// Class 12 subject group a stream needs unless the exam says otherwise
// (scripts/exam_access.json `subjects`)
const FIELDS = {
  eng: {
    label: "Engineering",
    sub: "B.Tech / B.E.",
    streams: ["Engineering"],
    needs: "pcm",
  },
  sci: { label: "Science", sub: "B.Sc.", streams: ["Science"], needs: "any" },
  pharma: {
    label: "Pharmacy",
    sub: "B.Pharm",
    streams: ["Pharma"],
    needs: "any",
  },
  agri: {
    label: "Agriculture",
    sub: "B.Sc.",
    streams: ["Agriculture"],
    needs: "any",
  },
  nursing: {
    label: "Nursing",
    sub: "B.Sc.",
    streams: ["Nursing"],
    needs: "pcb",
  },
};
const FIELDS_BY_STREAM = {
  pcm: ["eng", "sci", "pharma", "agri"],
  pcb: ["pharma", "nursing", "sci", "agri"],
  pcmb: ["eng", "pharma", "nursing", "sci", "agri"],
};

/** Does the finder serve this Class 11-12 stream? */
export const finderStream = (stream) => !!FIELDS_BY_STREAM[stream];

/** The backup streams offered for a Class 11-12 stream. */
export const fieldOptions = (stream) =>
  (FIELDS_BY_STREAM[stream] || []).map((id) => ({ id, ...FIELDS[id] }));

/** The predictor stream a backup field names (KCET's cutoffs: Pharma). */
export const fieldStream = (field) => FIELDS[field]?.streams[0];

// Can a pcm / pcb / pcmb student sit this exam for the field?
const canSit = (e, field, stream) => {
  const want = FIELDS[field];
  const s = e.subjects || {};
  const needs =
    want.streams.map((x) => s[x]).find(Boolean) || s._ || want.needs;
  if (needs === "none") return false;
  if (needs === "any" || stream === "pcmb" || !stream) return true;
  return needs === stream;
};

const fits = (e, { college, place, field, state, stream }) =>
  (e.streams || []).some((s) => FIELDS[field].streams.includes(s)) &&
  canSit(e, field, stream) &&
  (e.eligible_in === "All India" || e.eligible_in === state) &&
  (college === "public"
    ? e.run_by === "Public"
    : college === "private"
    ? // private universities' tests, and the state CETs whose counselling
      // fills private colleges' seats too (KCET, MHT CET)
      e.run_by === "Private" || e.fills_private
    : true) &&
  (place === "state"
    ? !!state && e.scope_state === state
    : place === "national"
    ? e.scope_state !== state && e.eligible_in === "All India"
    : true);

const byApplicants = (a, b) => {
  const n = (e) => e.applicants?.count || 0;
  if (n(b) !== n(a)) return n(b) - n(a);
  const ai = (e) => (e.scope_type === "All India" ? 0 : 1);
  return ai(a) - ai(b) || a.name.localeCompare(b.name);
};

/**
 * The exams that fit the answers, most applicants first (those with no
 * published count after, All India ones first). `mainIds` are the exam ids
 * the student is already taking: never suggested as a backup. When nothing
 * fits all three answers, the nearest: any place, then any college too
 * (`relaxed` says which).
 */
export function backupExams(exams, answers, mainIds) {
  const { college, place, field } = answers;
  if (!FIELDS[field] || !college || !place) return { exams: [] };
  const skip = new Set(mainIds || []);
  const pool = exams.filter((e) => !skip.has(e.exam_id));
  const tries = [
    [answers, null],
    [{ ...answers, place: "any" }, "place"],
    [{ ...answers, place: "any", college: "any" }, "both"],
  ];
  for (const [a, relaxed] of tries) {
    const hits = pool.filter((e) => fits(e, a)).sort(byApplicants);
    if (hits.length) return { exams: hits.slice(0, 5), relaxed };
  }
  return { exams: [] };
}

/** 1480000 -> "14.8 lakh", 62000 -> "62,000" */
export function peopleCount(n) {
  if (!n) return null;
  if (n >= 100000) {
    const l = n / 100000;
    return `${l >= 10 ? Math.round(l) : Math.round(l * 10) / 10} lakh`;
  }
  return n.toLocaleString("en-IN");
}

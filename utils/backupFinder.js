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

// the backup streams, and how each reads off an exam's `streams`
const FIELDS = {
  eng: { label: "Engineering", sub: "B.Tech / B.E.", streams: ["Engineering"] },
  sci: { label: "Science", sub: "B.Sc.", streams: ["Science"] },
  pharma: { label: "Pharmacy", sub: "B.Pharm", streams: ["Pharma"] },
  agri: { label: "Agriculture", sub: "B.Sc.", streams: ["Agriculture"] },
  nursing: { label: "Nursing", sub: "B.Sc.", streams: ["Nursing"] },
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

// a state's own entrance test (KCET, MHT CET): the government's, but its
// counselling fills private colleges' seats as well
const isStateTest = (e) =>
  e.run_by === "Public" &&
  e.scope_type !== "All India" &&
  e.scope_type !== "University";

/**
 * The exams that fit the answers, most applicants first (those with no
 * published count after, All India ones first). `mainIds` are the exam ids
 * the student is already taking: never suggested as a backup.
 */
export function backupExams(exams, { college, place, field, state }, mainIds) {
  const want = FIELDS[field];
  if (!want || !college || !place) return [];
  const skip = new Set(mainIds || []);
  return exams
    .filter((e) => !skip.has(e.exam_id))
    .filter((e) => (e.streams || []).some((s) => want.streams.includes(s)))
    .filter((e) => e.eligible_in === "All India" || e.eligible_in === state)
    .filter((e) =>
      college === "public"
        ? e.run_by === "Public"
        : college === "private"
        ? e.run_by === "Private" || isStateTest(e)
        : true
    )
    .filter((e) =>
      place === "state"
        ? !!state && e.scope_state === state
        : place === "national"
        ? e.scope_state !== state && e.eligible_in === "All India"
        : true
    )
    .sort((a, b) => {
      const n = (e) => e.applicants?.count || 0;
      if (n(b) !== n(a)) return n(b) - n(a);
      const ai = (e) => (e.scope_type === "All India" ? 0 : 1);
      return ai(a) - ai(b) || a.name.localeCompare(b.name);
    })
    .slice(0, 5);
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

/** An acceptance rate as "about 4 in 100" (or "about 1 in 250" below 1%). */
export function chanceText(pct) {
  if (!pct || pct <= 0) return null;
  if (pct >= 1) return `about ${Math.round(pct)} in 100`;
  return `about 1 in ${Math.round(100 / pct)}`;
}

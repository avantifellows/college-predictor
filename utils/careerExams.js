import { matchesQuery, plainText } from "./search";

// The exams a career leads through, for the Exams page's ?career= filter:
// every exam its chips point at (careers.json `exams`), resolved the way
// the Exams page's own search would. A chip names an exam by page
// (/exams/<id>), by search (/exams?q=JEE Main) or by predictor
// (/predictor?exam=TNEA). A career with no chips (CA) falls back to the
// exams whose "Leads to" lists it; those lists are padded with stream
// neighbours, so they don't add to a career that has chips.
const searchFields = (e) => [
  e.name,
  e.acronym,
  e.scope,
  e.scope_state || "",
  ...(e.aliases || []),
];

const exact = (e, q) =>
  plainText(e.acronym) === plainText(q) ||
  (e.aliases || []).some((a) => plainText(a) === plainText(q));

const resolveChip = (href, label, exams) => {
  const page = href.match(/^\/exams\/([^?#]+)/);
  if (page) return exams.filter((e) => e.exam_id === page[1]);
  const q = decodeURIComponent(
    (href.match(/[?&](?:q|exam)=([^&#]+)/) || [])[1] || label
  );
  const byPredictor = href.startsWith("/predictor")
    ? exams.filter((e) => e.predictor_exam === q)
    : [];
  if (byPredictor.length) return byPredictor;
  const exacts = exams.filter((e) => exact(e, q) || exact(e, label));
  if (exacts.length) return exacts;
  const found = exams.filter((e) =>
    matchesQuery(searchFields(e), plainText(q))
  );
  // "JEE Main" finds Papers 1, 2A and 2B: the paper the predictor uses
  const linked = found.filter((e) => e.predictor_exam);
  return found.length > 1 && linked.length ? linked : found;
};

export const examIdsForCareer = (career, exams) => {
  const ids = new Set();
  (career?.exams || []).forEach((chip) =>
    resolveChip(chip.href, chip.label, exams).forEach((e) => ids.add(e.exam_id))
  );
  if (!ids.size)
    exams.forEach((e) => {
      if ((e.careers || []).some((k) => k.slug === career?.career_id))
        ids.add(e.exam_id);
    });
  return ids;
};

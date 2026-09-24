// One search behaviour for the whole site: punctuation-blind, word-by-word
// (every typed word must appear somewhere), and aware of how students
// actually say names — "iiser pune", "nit trichy", "srcc", "kgp".
// Used by the colleges tab, compare dropdowns, mock allotment, exams and
// careers, so a query that works in one place works in all of them.

const ALIASES = {
  iit: "indian institute of technology",
  nit: "national institute of technology",
  iiit: "indian institute of information technology",
  iiser: "indian institute of science education and research",
  iisc: "indian institute of science",
  aiims: "all india institute of medical sciences",
  gmc: "government medical college",
  nlu: "national law",
  spa: "school of planning and architecture",
  iiest: "shibpur",
  trichy: "tiruchirappalli",
  kgp: "kharagpur",
  bhu: "banaras",
  bangalore: "bengaluru",
  calcutta: "kolkata",
  bombay: "mumbai",
  madras: "chennai",
  mnnit: "motilal nehru",
  mnit: "malaviya",
  vnit: "visvesvaraya",
  svnit: "sardar vallabhbhai",
  manit: "maulana azad",
  nitk: "surathkal",
  vjti: "veermata jijabai",
  uiet: "university institute of engineering and technology",
  uicet: "bhatnagar",
  ssb: "bhatnagar",
  ccet: "chandigarh college of engineering",
  cca: "chandigarh college of architecture",
  pau: "punjab agricultural",
  tnau: "tamil nadu agricultural",
  gbpuat: "pant university",
  kau: "kerala agricultural",
  iet: "institute of engineering and technology",
  hbtu: "harcourt butler",
  knit: "kamla nehru institute",
  mmmut: "madan mohan malaviya",
  aktu: "abdul kalam technical",
  coep: "coep",
  srcc: "shri ram college of commerce",
  lsr: "lady shri ram",
  kmc: "kirori mal",
  stephens: "stephen",
  cse: "computer science",
  ece: "electronics and communication",
  eee: "electrical and electronics",
  mech: "mechanical",
};

// lower-case, punctuation to spaces: "St. Stephen's" -> "st stephen s"
export const plainText = (x) =>
  String(x ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Each typed word becomes a set of alternatives: itself, and its expansion.
// Bombay/Mumbai and Madras/Chennai go both ways because sources use both
// ("IIT Bombay", "VJTI, Mumbai").
const BOTH_WAYS = {
  bombay: "mumbai",
  madras: "chennai",
  bangalore: "bengaluru",
  calcutta: "kolkata",
};

export function queryTerms(query) {
  return plainText(query)
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      const alts = [w];
      if (ALIASES[w]) alts.push(ALIASES[w]);
      for (const [a, b] of Object.entries(BOTH_WAYS)) {
        if (w === b) alts.push(a);
      }
      return alts;
    });
}

/** Does `haystack` (a string or array of strings) match every typed word? */
export function matchesQuery(haystack, query) {
  const terms = queryTerms(query);
  if (terms.length === 0) return true;
  const hay = ` ${plainText(
    Array.isArray(haystack) ? haystack.join(" ") : haystack
  )} `;
  // short words match only at a word start (so typing a prefix works):
  // "iat" must not hit "assoc-iat-e"
  return terms.every((alts) =>
    alts.some((a) => (a.length <= 4 ? hay.includes(` ${a}`) : hay.includes(a)))
  );
}

/** react-select filterOption using the same rules (for Dropdown). */
export const selectFilter = (option, input) =>
  matchesQuery(`${option.label ?? ""} ${option.data?.keywords ?? ""}`, input);

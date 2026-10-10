// Forgiving search over college names, for the results table's college
// filter: "IIT" finds Indian Institute of Technology, "Trichy" finds
// Tiruchirappalli, and a letter or two off ("Tiruchirapalli") still matches.

// what students type -> how JoSAA spells it (whole words only)
const ABBREVIATIONS = {
  iit: "indian institute of technology",
  iits: "indian institute of technology",
  nit: "national institute of technology",
  nits: "national institute of technology",
  iiit: "institute of information technology",
  iiits: "institute of information technology",
  iiitdm: "information technology design and",
  iiitm: "information technology and management",
  iiest: "indian institute of engineering science and technology",
  spa: "school of planning and architecture",
  bit: "birla institute of technology",
  nitk: "national institute of technology karnataka",
  mnnit: "motilal nehru national institute of technology",
  mnit: "malaviya national institute of technology",
  manit: "maulana azad national institute of technology",
  vnit: "visvesvaraya national institute of technology",
  svnit: "sardar vallabhbhai national institute of technology",
  nielit: "national institute of electronics and information technology",
  niftem: "national institute of food technology entrepreneurship",
  pec: "punjab engineering college",
  dtu: "delhi technological university",
  nsut: "netaji subhas university of technology",
  igdtuw: "indira gandhi delhi technical university",
  ism: "dhanbad",
  bhu: "varanasi",
  kgp: "kharagpur",
};

// other names for the same place
const PLACES = {
  trichy: "tiruchirappalli",
  tiruchi: "tiruchirappalli",
  kozhikode: "calicut",
  prayagraj: "allahabad",
  mumbai: "bombay",
  chennai: "madras",
  banaras: "varanasi",
  benares: "varanasi",
  bbsr: "bhubaneswar",
  gurgaon: "gurugram",
  bengaluru: "bangalore",
  pondicherry: "puducherry",
};

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// edit distance, stopping early past `max`
const within = (a, b, max) => {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      best = Math.min(best, cur[j]);
    }
    if (best > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
};

// a typed word against the words of a name: a prefix, or a near miss
const wordMatches = (token, words) => {
  const slack = token.length >= 8 ? 2 : token.length >= 5 ? 1 : 0;
  return words.some(
    (w) =>
      w.startsWith(token) ||
      (slack > 0 &&
        (within(token, w, slack) ||
          // a partly typed long word: compare like lengths
          (w.length > token.length &&
            within(token, w.slice(0, token.length), slack))))
  );
};

// Does the typed text match this college name? Every typed word has to.
// The last word may be half typed, so it also matches the start of an
// abbreviation or place name ("tri" -> Trichy, "ii" -> IIT and IIIT).
export const matchesCollege = (name, input) => {
  const query = normalize(input);
  if (!query) return true;
  const hay = ` ${normalize(name)} `;
  const words = hay.trim().split(" ");
  const hasPhrase = (phrase) => hay.includes(` ${phrase} `);
  const tokens = query.split(" ");
  const typing = !/\s$/.test(String(input));
  return tokens.every((token, i) => {
    if (ABBREVIATIONS[token]) return hasPhrase(ABBREVIATIONS[token]);
    if (wordMatches(token, words)) return true;
    if (PLACES[token] && wordMatches(PLACES[token], words)) return true;
    if (!typing || i < tokens.length - 1) return false;
    const starts = (table) =>
      Object.keys(table).filter((k) => k.startsWith(token));
    return (
      starts(ABBREVIATIONS).some((k) => hasPhrase(ABBREVIATIONS[k])) ||
      starts(PLACES).some((k) => wordMatches(PLACES[k], words))
    );
  });
};

// The name students use for a college ("NIT Trichy", "IIT (BHU) Varanasi"),
// shown with the full name in the dropdown; null when it's the same.
const SHORT_NAMES = [
  [/^Malaviya National Institute of Technology/, "MNIT"],
  [/^Motilal Nehru National Institute of Technology/, "MNNIT"],
  [/^Maulana Azad National Institute of Technology/, "MANIT"],
  [/^Visvesvaraya National Institute of Technology,?/, "VNIT"],
  [/^Sardar Vallabhbhai National Institute of Technology,?/, "SVNIT"],
  [/^Dr\. B R Ambedkar National Institute of Technology,?/, "NIT"],
  [/^National Institute of Technology Karnataka,?/, "NIT"],
  [/^National Institute of Technology,?/, "NIT"],
  [/^Indian Institute of Technology/, "IIT"],
  [
    /^Indian Institute of Information Technology,? Design & Manufacturing,?/,
    "IIITDM",
  ],
  [/^Pt\. Dwarka Prasad Mishra .*Design & Manufacture/, "IIITDM"],
  [
    /^Atal Bihari Vajpayee Indian Institute of Information Technology & Management/,
    "ABV-IIITM",
  ],
  [/^Indian Institute of Information Technology\s*(\(IIIT\))?[,\s]*/i, "IIIT"],
  [/^International Institute of Information Technology,?/, "IIIT"],
  [/^Indian Institute of Engineering Science and Technology,?/, "IIEST"],
  [/^School of Planning & Architecture[,:]?/, "SPA"],
  [/^Birla Institute of Technology,?/, "BIT"],
];
const SHORT_PLACES = { Tiruchirappalli: "Trichy" };

export const shortCollegeName = (name) => {
  for (const [re, short] of SHORT_NAMES) {
    if (!re.test(name)) continue;
    let rest = name
      .replace(re, "")
      .replace(/^[\s,]+/, "")
      .trim();
    for (const [full, nick] of Object.entries(SHORT_PLACES))
      rest = rest.replace(full, nick);
    const out = `${short} ${rest}`.replace(/\s+/g, " ").trim();
    return out === name ? null : out;
  }
  return null;
};

// for react-select's filterOption
export const collegeFilterOption = (option, input) =>
  matchesCollege(option.label, input) ||
  (!!option.data?.short && matchesCollege(option.data.short, input));

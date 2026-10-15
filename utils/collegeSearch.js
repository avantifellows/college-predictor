// Forgiving search over college names, for the results table's college
// filter. Built on the site search (utils/search.js: its aliases turn "IIT"
// into Indian Institute of Technology and "Trichy" into Tiruchirappalli),
// with two more allowances for a search box students type into: a letter or
// two off ("Tiruchirapalli") still matches, and a half-typed last word can
// be the start of an alias ("nit tri" -> NIT Trichy).
import { ALIASES, plainText, queryTerms, termHits } from "./search";

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

// a typed word against the words of a name: a prefix, or a near miss. Near
// misses only for real words (6+ letters): acronyms a letter apart are
// different colleges (MNNIT, MNIT, MANIT)
const wordMatches = (token, words) => {
  const slack = token.length >= 8 ? 2 : token.length >= 5 ? 1 : 0;
  return words.some(
    (w) =>
      w.startsWith(token) ||
      (slack > 0 &&
        w.length >= 6 &&
        (within(token, w, slack) ||
          // a partly typed long word: compare like lengths
          (w.length > token.length &&
            within(token, w.slice(0, token.length), slack))))
  );
};

// Does the typed text match this college name? Every typed word has to.
export const matchesCollege = (name, input) => {
  const terms = queryTerms(input);
  if (!terms.length) return true;
  const hay = ` ${plainText(name)} `;
  const words = hay.trim().split(" ");
  const typing = !/\s$/.test(String(input));
  return terms.every((alts, i) => {
    if (alts.some((a) => termHits(hay, a))) return true;
    const [word] = alts;
    if (wordMatches(word, words)) return true;
    // the last word, still being typed: the start of an alias
    if (!typing || i < terms.length - 1) return false;
    return Object.keys(ALIASES).some(
      (k) => k.startsWith(word) && termHits(hay, ALIASES[k])
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

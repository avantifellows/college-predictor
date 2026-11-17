#!/usr/bin/env node
// Links predictor college names to college cards when the names differ.
//
//   node scripts/build_college_name_links.js           # writes the links
//   node scripts/build_college_name_links.js --check   # fails if stale
//
// A predictor row finds its card (utils/collegeFacts.js) by College ID or by
// the exact name on the card. Counselling bodies spell names their own way
// ("Govt. Doon Medical College" against the NMC's "Doon Medical College,
// Dehradun"), so most NEET rows found none: no star, no NIRF, no salary.
//
// For every predictor exam, each name that finds no card is compared with the
// cards in the same state:
//   - the distinctive words have to agree (Govt/Government, Med./Medical and
//     the like read as one; an acronym such as "JLNMC" reads as its words);
//   - a place the row names has to be the card's place;
//   - the kind of college has to agree: a dental, nursing, AYUSH, pharmacy,
//     engineering or law college never takes another kind's card;
//   - the degree has to agree where the card lists its degrees (an MBBS row
//     needs a card with MBBS).
// A clear winner is linked. A close call is left out and listed in
// scripts/college_name_links_review.json, where a decision ("college_id", or
// null for "no card") overrides the matcher. Re-run after any colleges.json
// or predictor data change.
const fs = require("fs");
const path = require("path");
const { addHook } = require("sucrase/dist/register");

addHook(".js", { transforms: ["imports", "jsx"], jsxRuntime: "automatic" });

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public/data/colleges/name_links.json");
const REVIEW = path.join(__dirname, "college_name_links_review.json");

const examConfigs = require(path.join(ROOT, "examConfig.js")).default;
const { PREDICTOR_EXAMS } = require(path.join(
  ROOT,
  "utils/predictorRoutes.js"
));
const { slugOf, linkKeyOf, cardFor } = require(path.join(
  ROOT,
  "utils/collegeFacts.js"
));

const raw = JSON.parse(
  fs.readFileSync(path.join(ROOT, "public/data/colleges/colleges.json"), "utf8")
);
const cards = Array.isArray(raw) ? raw : raw.colleges || [];

// ---- words ----------------------------------------------------------------
const EXPAND = {
  govt: "government",
  gov: "government",
  gvt: "government",
  goverment: "government",
  govermnet: "government",
  medcial: "medical",
  collage: "college",
  sceinces: "sciences",
  scie: "sciences",
  sce: "sciences",
  hopt: "hospital",
  edu: "education",
  int: "international",
  med: "medical",
  medl: "medical",
  col: "college",
  coll: "college",
  clg: "college",
  colg: "college",
  inst: "institute",
  instt: "institute",
  institue: "institute",
  sc: "sciences",
  sci: "sciences",
  science: "sciences",
  scs: "sciences",
  res: "research",
  rc: "research centre",
  ri: "research institute",
  hosp: "hospital",
  hospt: "hospital",
  hsp: "hospital",
  hos: "hospital",
  hospl: "hospital",
  univ: "university",
  uni: "university",
  dr: "",
  st: "saint",
  sri: "shri",
  shree: "shri",
  sree: "shri",
  mc: "medical college",
  gmc: "government medical college",
  dc: "dental college",
  mch: "medical college hospital",
  asmc: "autonomous state medical college",
  aiims: "all india institute medical sciences",
  esic: "employees state insurance corporation",
  esi: "employees state insurance",
  kgmu: "king george medical university",
  kgmc: "king george medical college",
  uttrakhand: "uttarakhand",
  orissa: "odisha",
  pondicherry: "puducherry",
  bangalore: "bengaluru",
  calcutta: "kolkata",
  bombay: "mumbai",
  madras: "chennai",
  trivandrum: "thiruvananthapuram",
  baroda: "vadodara",
  gurgaon: "gurugram",
  poona: "pune",
  mysore: "mysuru",
  hubli: "hubballi",
  belgaum: "belagavi",
  gulbarga: "kalaburagi",
  mangalore: "mangaluru",
  shimoga: "shivamogga",
  bellary: "ballari",
  bijapur: "vijayapura",
  tumkur: "tumakuru",
  allahabad: "prayagraj",
  pragyraj: "prayagraj",
  rajahmundry: "rajamahendravaram",
  yeotmal: "yavatmal",
  sholapur: "solapur",
  nasik: "nashik",
};
// words every medical (or engineering) college shares: they say nothing
// about which one
const COMMON = new Set(
  (
    "and of the in at for a an s prev previously formerly now pvt ltd trust " +
    "society medical college colleges government institute institutes " +
    "sciences research hospital hospitals health centre center university " +
    "deemed to be education educational foundation post graduate pg " +
    "autonomous state general district teaching campus dental nursing " +
    "engineering technology management studies school " +
    // an address or an office, not a name
    "principal director dean office road marg street colony nagar campus " +
    "block academic main dist district po near"
  ).split(" ")
);
const words = (s) =>
  String(s || "")
    // "G.S.V.M." and "R N T" are one word, as "GSVM" and "RNT" are
    .replace(
      /\b(?:[A-Za-z][.\s]\s*){2,}(?![a-z])/g,
      (m) => ` ${m.replace(/[^A-Za-z]/g, "")} `
    )
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[`'’]s\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .flatMap((w) => (w in EXPAND ? EXPAND[w] : w).split(" "))
    .filter(Boolean);
const distinctive = (s) =>
  words(s).filter((w) => !COMMON.has(w) && w.length > 1);
// "J.L.N.M.C." and "JLNMC" read as the initials they are
const acronymsOf = (s) => {
  const dotted = String(s || "").match(/\b(?:[A-Za-z]\.\s*){2,}/g) || [];
  // an all-caps name ("GUWAHATI MEDICAL COLLEGE") is words, not acronyms
  const solid = /[a-z]/.test(String(s || ""))
    ? String(s || "").match(/\b[A-Z]{3,6}\b/g) || []
    : [];
  return [
    ...dotted
      .map((x) => x.replace(/[^A-Za-z]/g, ""))
      .filter((x) => x.length >= 2),
    ...solid,
  ].map((x) => x.toLowerCase());
};
// titles a name may or may not carry ("Dr.", "Smt.", "Pt.")
const TITLES = new Set([
  "dr",
  "smt",
  "shri",
  "sri",
  "shree",
  "sh",
  "pt",
  "late",
  "lt",
  "st",
  "seth",
]);
const initialsOf = (s, { titles = false, whole = true } = {}) =>
  String(s || "")
    .replace(/&/g, " ")
    .replace(/[^A-Za-z ]+/g, " ")
    .split(/\s+/)
    .filter((w) => {
      const l = w.toLowerCase();
      return (
        w && !["of", "and", "the"].includes(l) && (titles || !TITLES.has(l))
      );
    })
    // a short all-caps word in a mixed-case name is initials already ("GS")
    .map((w) =>
      whole && /^[A-Z]{2,4}$/.test(w) && /[a-z]/.test(s)
        ? w.toLowerCase()
        : w[0].toLowerCase()
    )
    .join("");
// "BJMC" in "B J Govt. Medical College": the acronym's letters in order,
// from the first
const inOrder = (a, i) => {
  if (a[0] !== i[0]) return false;
  let k = 0;
  for (const ch of i) if (ch === a[k]) k++;
  return k >= a.length;
};

// ---- kinds and degrees ------------------------------------------------------
const KINDS = [
  ["dental", /dental|\bbds\b/i],
  ["nursing", /nursing/i],
  ["ayush", /ayurved|homoeo|homeo|unani|siddha|naturopath|\byoga\b/i],
  ["pharmacy", /pharma/i],
  ["engineering", /engineering|polytechnic|\btechnology\b/i],
  ["law", /\blaw\b|legal/i],
  ["veterinary", /veterinar/i],
  ["agriculture", /agricultur|horticultur/i],
];
const kindsOf = (s) =>
  new Set(KINDS.filter(([, re]) => re.test(String(s || ""))).map(([k]) => k));
// the medical degrees a row or a card can name; other exams' rows match on
// kind alone
const DEGREES = ["MBBS", "BDS", "BAMS", "BHMS", "BUMS", "BSMS", "BNYS"];
const degreeOf = (program) => {
  const p = String(program || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return DEGREES.find((d) => p.startsWith(d)) || null;
};
const cardDegrees = (c) => {
  const list = c.programs?.degrees || [];
  return new Set(list.map(degreeOf).filter(Boolean));
};

// ---- states and places -----------------------------------------------------
const stateKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/&/g, "and")
    .replace(/\bnct\b|\bof\b/g, "")
    .replace(/[^a-z]/g, "")
    .replace(/^orissa$/, "odisha")
    .replace(/^pondicherry$/, "puducherry")
    .replace(/^jammuandkashmir$/, "jammukashmir");
const byState = new Map();
const placesByState = new Map();
for (const c of cards) {
  const k = stateKey(c.state);
  if (!byState.has(k)) byState.set(k, []);
  byState.get(k).push(c);
  if (!placesByState.has(k)) placesByState.set(k, new Set());
  for (const w of words(c.district))
    if (w.length > 3) placesByState.get(k).add(w);
}
const cardText = (c) => [c.display_name, c.name, ...(c.aka || [])].join(" ");

// "Government Medical College, Datia, MP": a state's short form
const STATE_SHORT = new Set(
  "ap ar as br cg ga gj hr hp jh jk ka kl mp mh mn ml mz nl od pb rj sk tn ts tg tr up uk wb dl py".split(
    " "
  )
);

// ---- scoring ----------------------------------------------------------------
// spellings of one word ("Seetharama"/"Sitaram", "Siddartha"/"Siddhartha",
// "Laheriasarai"/"Lehriasarai") read as one
const sound = (w) =>
  w
    .replace(/ee|ie/g, "i")
    .replace(/oo|ou/g, "u")
    .replace(/([bcdgkpt])h/g, "$1")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/(.)\1+/g, "$1")
    .replace(/a(?=[^aeiou]|$)/g, "a")
    .replace(/a$/, "");
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return d[a.length][b.length];
};
const same = (a, b) => {
  if (a === b) return true;
  const x = sound(a);
  const y = sound(b);
  if (x === y) return true;
  const n = Math.min(x.length, y.length);
  // Vadnagar is not Bhavnagar: a letter's slip, two in a long word
  return n >= 6 && lev(x, y) <= (n >= 10 ? 2 : 1);
};
const has = (set, w) => [...set].some((v) => same(v, w));

// Kerala's lists lead with a code ("CMC- Govt. Medical College, Ernakulam")
const plain = (name) => String(name || "").replace(/^[A-Z]{2,5}\s*-\s+/, "");
const GOVT = /\b(govt|government|rajkiya)\b/i;

// a state at the end of a name is an address ("…, Mahasamund Chhattisgarh"),
// at its start a name ("Kerala Medical College")
const withoutStateTail = (name, state) => {
  const st = words(state).join(" ");
  const w = words(name);
  const tail = w.slice(-st.split(" ").length).join(" ");
  return tail === st
    ? String(name).replace(
        new RegExp(`[\\s,(]*${state.split(/\W+/)[0]}[^,]*$`, "i"),
        ""
      )
    : name;
};

const score = (rowName, card, places) => {
  const name = withoutStateTail(plain(rowName), card.state || "");
  // a government college's name never lands on a private card
  if (GOVT.test(name) && card.ownership === "Private") return 0;
  const rowKinds = kindsOf(name);
  const cKinds = kindsOf(cardText(card));
  // the kind of college must agree both ways (a "Dental College" row never
  // lands on the medical college in the same town, and vice versa)
  for (const k of new Set([...rowKinds, ...cKinds]))
    if (rowKinds.has(k) !== cKinds.has(k)) return 0;
  const cNames = [card.display_name, card.name, ...(card.aka || [])];
  const cWords = new Set(cNames.flatMap(words).concat(words(card.district)));
  // a place the row names must be the card's
  const rowPlaces = words(name).filter((w) => places.has(w));
  if (rowPlaces.length && !rowPlaces.some((w) => has(cWords, w))) return 0;

  // the state's own name and a PIN code say nothing either
  const stateWords = new Set(words(card.state));
  const notPlace = (w) =>
    !places.has(w) && !STATE_SHORT.has(w) && !/^\d+$/.test(w);
  const cardOwn = (w) =>
    notPlace(w) &&
    !stateWords.has(w) &&
    !STATE_SHORT.has(w) &&
    !/^\d+$/.test(w) &&
    w !== "pin";
  const rd = new Set(distinctive(name).filter(notPlace));
  // the card's own words, from its shortest name (aka spellings would
  // otherwise count as extra words)
  const cd = new Set(
    cNames
      // a bracketed former name is not the card's own words
      .map((n) => distinctive(n.replace(/\(.*?\)/g, " ")).filter(cardOwn))
      .sort((a, b) => a.length - b.length)[0] || []
  );
  const cAll = new Set(cNames.flatMap(distinctive));
  // an acronym ("JLNMC", "A.N.M.M.C.") stands for the card's full name
  // with and without titles: "SKMC" keeps Shri's S, "B.S.A." drops Dr's D
  // and with a short all-caps word whole or as its first letter
  // ("Seth GS Medical College" is GSMC, "Shaikh-UL-Hind" is SUH)
  const cInitials = cNames.flatMap((n) =>
    [true, false].flatMap((titles) =>
      [true, false].map((whole) => initialsOf(n, { titles, whole }))
    )
  );
  // initials spell the card's name from its start; a long acronym may sit
  // inside it ("SKIMS" for "Sher-i-Kashmir Institute…")
  const spells = (a) =>
    cInitials.some(
      (i) =>
        i.startsWith(a) ||
        // skipping letters only for a long, vowel-less acronym ("BJMC"),
        // never for a word ("Sai") or a short one ("NMC")
        (a.length >= 4 &&
          (a.match(/[aeiou]/g) || []).length <= 1 &&
          inOrder(a, i)) ||
        (a.length >= 5 && i.includes(a))
    );
  let acr = false;
  const lead = words(name).find((w) => !TITLES.has(w));
  for (const a of acronymsOf(name)) {
    if (has(cAll, a)) continue;
    // an acronym that leads the name and that the card's initials don't
    // spell is a different college ("N.M.C. Patna" is Nalanda, not Patna
    // Medical College); later in the name it is an address ("SVP Road")
    if (!spells(a)) {
      if (a === lead) return 0;
      continue;
    }
    acr = true;
    rd.delete(a);
  }
  // a word that is the card's initials ("JIPMER", "NEIGRIHMS", "KIMS")
  for (const w of [...rd])
    if (w.length >= 3 && !has(cAll, w) && spells(w)) {
      acr = true;
      rd.delete(w);
    }
  let shared = 0;
  for (const w of rd) if (has(cAll, w)) shared++;
  if (rd.size && !shared && !acr) return 0;
  // every distinctive word of the row on the card, and few the card has
  // that the row lacks
  let back = 0;
  for (const w of cd) if (has(rd, w)) back++;
  let recall = rd.size ? shared / rd.size : 1;
  const precision = cd.size ? back / cd.size : 1;
  // every word of the card's own name is in the row, in its place: the
  // row's other words are an address ("Kakatiya Medical College Warangal,
  // SVP Road")
  if (cd.size && back === cd.size && rowPlaces.length && rd.size - shared <= 2)
    recall = Math.max(recall, 0.75);
  return (
    0.6 * (acr ? Math.max(recall, 1) : recall) +
    0.4 * (acr ? 1 : precision) +
    (rowPlaces.length ? 0.1 : 0)
  );
};

// ---- predictor names --------------------------------------------------------
const nameOf = (row) =>
  row["Institute"] ||
  row["College Name"] ||
  row.institute_name ||
  row.institute ||
  "";
const keys = new Set(
  PREDICTOR_EXAMS.flatMap((e) => e.counsellings.map((c) => c.key))
);
// one entry per (state, name): the degrees its rows offer, the exams it
// comes from
const names = new Map();
for (const key of keys) {
  const cfg = examConfigs[key];
  if (!cfg?.getDataPath) continue;
  const cats = (cfg.fields || []).find((f) => f.name === "category")?.options;
  const files = new Set();
  for (const o of cats?.length ? cats : [undefined]) {
    try {
      files.add(cfg.getDataPath(o && typeof o === "object" ? o.value : o));
    } catch {
      /* a category with no file */
    }
  }
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const rows = JSON.parse(fs.readFileSync(f, "utf8"));
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      const name = nameOf(r);
      const state = r.State || r.state || "";
      if (!name || !state || cardFor(r, key, { links: false })) continue;
      const k = linkKeyOf(name, state);
      if (!names.has(k))
        names.set(k, { name, state, degrees: new Set(), exams: new Set() });
      const e = names.get(k);
      const d = degreeOf(r["Academic Program Name"] || r.Program || r.Course);
      if (d) e.degrees.add(d);
      e.exams.add(key);
    }
  }
}

// ---- match -----------------------------------------------------------------
const review = fs.existsSync(REVIEW)
  ? JSON.parse(fs.readFileSync(REVIEW, "utf8"))
  : { decisions: {} };
const decided = review.decisions || {};
const cardIds = new Set(cards.map((c) => c.college_id));

const links = {};
const open = {};
let auto = 0;
let manual = 0;
for (const [k, e] of [...names].sort()) {
  if (k in decided) {
    const id = decided[k]?.college_id ?? null;
    if (id && !cardIds.has(id))
      throw new Error(`review: ${k} names a card that is gone (${id})`);
    if (id) {
      links[k] = id;
      manual++;
    }
    continue;
  }
  const sk = stateKey(e.state);
  const places = placesByState.get(sk) || new Set();
  const ranked = (byState.get(sk) || [])
    .filter((c) => {
      // an MBBS row needs a card that lists MBBS (a card without degrees
      // passes: AISHE cards don't list them)
      // a card without degrees passes only if it takes NEET (AISHE cards
      // list none)
      const cd = cardDegrees(c);
      if (!e.degrees.size) return true;
      if (!cd.size) return (c.entrance_exams || []).includes("NEET-UG");
      return [...e.degrees].some((d) => cd.has(d));
    })
    .map((c) => [score(e.name, c, places), c])
    .filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0]);
  const [best, second] = ranked;
  if (best && best[0] >= 0.85 && (!second || best[0] - second[0] >= 0.2)) {
    links[k] = best[1].college_id;
    auto++;
  } else if (best && best[0] >= 0.5) {
    open[k] = {
      name: e.name,
      state: e.state,
      exams: [...e.exams].sort(),
      candidates: ranked.slice(0, 3).map(([s, c]) => ({
        college_id: c.college_id,
        name: c.display_name,
        district: c.district,
        score: Math.round(s * 100) / 100,
      })),
    };
  }
}

const sorted = (o) =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const body =
  JSON.stringify(sorted(links), null, 0).replace(/","/g, '",\n"') + "\n";
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== body) {
    console.error(
      "public/data/colleges/name_links.json is stale: run node scripts/build_college_name_links.js"
    );
    process.exit(1);
  }
  console.log(`name links up to date (${Object.keys(links).length})`);
  process.exit(0);
}
fs.writeFileSync(OUT, body);
fs.writeFileSync(
  REVIEW,
  JSON.stringify(
    {
      about:
        "Decisions on predictor college names the matcher left open " +
        "(scripts/build_college_name_links.js). Move an entry from `open` to " +
        '`decisions` as {"college_id": "..."} or {"college_id": null} ' +
        "(no card), then re-run.",
      decisions: sorted(decided),
      open: sorted(open),
    },
    null,
    2
  ) + "\n"
);
console.log(
  `names without an exact card: ${names.size}; linked ${auto} by the matcher, ` +
    `${manual} by review; ${Object.keys(open).length} left for review`
);

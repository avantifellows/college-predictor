export const meta = {
  name: "neet-state-audit",
  description:
    "Audit each NEET state cutoff source for parsing/data bugs against sanity rules + web-verified anchors",
  phases: [
    {
      title: "Audit",
      detail:
        "one agent per state source: scan anomalies, read parser, web-verify anchors",
    },
    {
      title: "Verify",
      detail:
        "adversarially confirm each reported bug is real (not a real-world quirk)",
    },
    {
      title: "Synthesize",
      detail:
        "merge into one ranked bug report with root cause + fix per source",
    },
  ],
};

const REPO = "/Users/surya/jan2023/college-predictor";
const PARSERS = "/Users/surya/jan2023/futures-v2/neet/scrape/scripts";
const SCAN =
  "/private/tmp/claude-501/-Users-surya-jan2023-college-predictor/3491cd03-fb57-4cf5-a1e1-ea8bbe09cd7a/scratchpad/anomaly_scan.py";

// Each state: source substring in NEETUG.json + its parser file + notable colleges to web-verify.
const STATES = [
  {
    key: "maharashtra",
    src: "maharashtra",
    parser: "06_parse_maharashtra.py",
    anchors:
      "Grant Medical College Mumbai (GSMC), BJ Medical College Pune, IIMSR Jalna minority",
    focus:
      'quota-vs-category (I.Q. is a QUOTA not a category); EM = EarMarking (EMR=Receiver / EMD=Donor), NOT "EWS Minority" — the parser mislabels it; giant closing ranks (>700000) at GMC Jalna suggest wrong-college attribution in the regex; minority male worse than female at IIMSR Jalna.',
  },
  {
    key: "telangana",
    src: "telangana",
    parser: "07_parse_telangana.py",
    anchors:
      "Osmania Medical College Hyderabad, Gandhi Medical College Secunderabad, Kakatiya MC Warangal",
    focus:
      "MOP-UP phase looser cutoffs; COLL:: text blocks; female split; category vs local/non-local quota.",
  },
  {
    key: "kerala",
    src: "kerala",
    parser: "09_parse_kerala.py",
    anchors: "Govt Medical College Thiruvananthapuram, Kozhikode GMC",
    focus:
      "Kerala state-rank converted to AIR via crosswalk; SM/SM-MU category codes; unmapped rows.",
  },
  {
    key: "karnataka",
    src: "karnataka",
    parser: "03_parse_karnataka.py",
    anchors: "Bangalore Medical College BMCRI, Mysore Medical College",
    focus:
      "KEA course code; GM/2AG/etc ~40 category codes; MBBS-GOVT/PRIV/NRI in course name; seat-type mapping.",
  },
  {
    key: "gujarat",
    src: "gujarat",
    parser: "02_parse_gujarat.py",
    anchors: "BJ Medical College Ahmedabad, AMC MET, Government MC Surat",
    focus:
      "pre-computed wide grid, category-as-columns OPEN/SC/ST/SE/EW; quota suffix GQ/MQ/NQ/LQ; Score+AIR carried; duplicate buckets (46 found).",
  },
  {
    key: "westbengal",
    src: "westbengal",
    parser: "04_parse_flat_states.py",
    anchors:
      "Medical College Kolkata, RG Kar Medical College, NRS Medical College",
    focus: "R1 only; UR/state categories; 16 duplicate buckets.",
  },
  {
    key: "mp",
    src: "mp_2025",
    parser: "04_parse_flat_states.py",
    anchors: "Gandhi Medical College Bhopal, MGM Medical College Indore",
    focus:
      "has AI RANK + MP STATE RANK + AISCORE; compound category UR/X/OP; ensure AI RANK (not state rank) is used.",
  },
  {
    key: "punjab",
    src: "punjab",
    parser: "04_parse_flat_states.py",
    anchors: "Government Medical College Patiala, GMC Amritsar",
    focus:
      "NEET Marks+Rank; 49 duplicate buckets (highest dup count among states) — investigate dedup/pivot key.",
  },
  {
    key: "andhra",
    src: "andhra",
    parser: "05_parse_andhra.py",
    anchors: "Andhra Medical College Visakhapatnam, Guntur Medical College",
    focus:
      "college name is a SECTION HEADER row (carry-forward); NEET RANK+Score; compound allotment string; carry-forward bugs (wrong college for a block).",
  },
  {
    key: "himachal",
    src: "himachal",
    parser: "08_parse_himachal.py",
    anchors: "IGMC Shimla, Dr RPGMC Tanda",
    focus:
      "cleanest table-based R3; only 34 rows; 6 duplicate buckets; MBBS/BDS program from name heuristic.",
  },
];

const FINDINGS_SCHEMA = {
  type: "object",
  properties: {
    source: { type: "string" },
    anomaly_counts: {
      type: "string",
      description: "summary of anomaly_scan output (rule: count)",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          severity: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          category: {
            type: "string",
            description:
              "e.g. wrong-column, dup-bucket, quota-vs-category, contaminated-max, missing-college, mangled-field, real-world-quirk",
          },
          evidence: {
            type: "string",
            description:
              "concrete rows/values from the data + what reality says (with web source if applicable)",
          },
          root_cause: {
            type: "string",
            description:
              "the specific parser line/logic causing it, file:line if known",
          },
          proposed_fix: { type: "string" },
          is_real_bug: {
            type: "boolean",
            description:
              "false if this is actually a legitimate real-world quirk, not a bug",
          },
        },
        required: [
          "title",
          "severity",
          "category",
          "evidence",
          "root_cause",
          "is_real_bug",
        ],
      },
    },
  },
  required: ["source", "findings"],
};

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["CONFIRMED", "REFUTED", "UNCERTAIN"] },
    reasoning: { type: "string" },
  },
  required: ["verdict", "reasoning"],
};

function auditPrompt(s) {
  return `You are auditing the NEET-UG 2025 college-predictor data for the "${s.key}" source (Source substring "${s.src}" in ${REPO}/public/data/NEETUG/NEETUG.json).

CONTEXT: This app predicts medical colleges from a student's NEET All India Rank. Each row = (Institute, State, Seat Type, Academic Program Name, Category, Category Label, Closing Rank, Round, rank_space, Source). Closing Rank is a NEET AIR (or converted to AIR). Cutoff = worst AIR admitted for that (college, category). The parser lives at ${PARSERS}/${s.parser}.

KNOWN BUG CLASSES (found elsewhere in this dataset):
- WRONG COLUMN: cutoff bucketed on seat-category vs candidate-category, or picking the wrong PDF column.
- CONTAMINATED MAX: max-AIR aggregation pulls in a wrong-college / wrong-category student → absurdly high closing rank (e.g. a govt college showing OBC closing 750000). Real govt-college cutoffs are usually < 200000.
- DUP BUCKET: same (institute, program, category, seat type) appears twice with different ranks — pivot key includes a noisy string (address/whitespace/line-wrap typo like "CIV IL"→"CIVIL").
- QUOTA-vs-CATEGORY: a seat-type/quota token (I.Q.=Institute Quota, NRI, MGMT, EMR/EMD=EarMarking Receiver/Donor) mislabeled as a social category.
- MANGLED FIELD: pincode or seat annotation leaking into State/Institute.
- MISSING COLLEGE: a well-known college for this state absent from the data.

STATE-SPECIFIC FOCUS: ${s.focus}
NOTABLE COLLEGES TO SANITY-CHECK: ${s.anchors}

DO THIS:
1. Run: cd ${REPO} && python3 ${SCAN} ${s.src}   — read the anomaly report.
2. Read the parser ${PARSERS}/${s.parser} to find the root cause of each anomaly class.
3. Inspect concrete rows in the JSON (python3/jq) for the notable colleges — do the cutoffs look plausible? Are categories social-categories or quotas? Any dups? Any absurd (>300000 for a govt college) ranks?
4. Web-verify AT LEAST 2 anchor colleges' real 2025 cutoffs (use WebSearch/WebFetch) and compare to our data. Cite sources.
5. Distinguish REAL BUGS from legitimate real-world quirks (e.g. mop-up rounds genuinely have looser cutoffs; tiny female seat pools can be noisy). Set is_real_bug accordingly.

Return the structured findings. Be concrete: real institute names, real numbers, real parser line refs. Do NOT invent.`;
}

phase("Audit");
const results = await pipeline(
  STATES,
  (s) =>
    agent(auditPrompt(s), {
      label: `audit:${s.key}`,
      phase: "Audit",
      schema: FINDINGS_SCHEMA,
      agentType: "general-purpose",
    }),
  // Verify each REAL-BUG finding adversarially: is it truly a parser bug, or a real-world quirk?
  (res, s) => {
    if (!res || !res.findings) return res;
    const realBugs = res.findings.filter((f) => f.is_real_bug);
    if (!realBugs.length) return { ...res, verified: [] };
    return parallel(
      realBugs.map(
        (f) => () =>
          agent(
            `Adversarially verify this claimed NEET-data bug for source "${res.source}". Try to REFUTE it — could this be a legitimate real-world counselling quirk rather than a parser bug? Consider: mop-up/stray rounds are genuinely looser; small seat pools are noisy; category-specific reservation genuinely varies; some colleges genuinely have few AIQ seats.

CLAIM: ${f.title}
EVIDENCE: ${f.evidence}
ROOT CAUSE: ${f.root_cause}

Check the actual data/parser if needed (data at ${REPO}/public/data/NEETUG/NEETUG.json, parser at ${PARSERS}/${s.parser}). Verdict CONFIRMED only if it is genuinely a parser/data bug.`,
            {
              label: `verify:${s.key}:${f.title.slice(0, 24)}`,
              phase: "Verify",
              schema: VERDICT_SCHEMA,
              agentType: "general-purpose",
            }
          ).then((v) => ({ finding: f, ...v }))
      )
    ).then((verified) => ({ ...res, verified }));
  }
);

phase("Synthesize");
const packed = results.filter(Boolean).map((r) => ({
  source: r.source,
  anomaly_counts: r.anomaly_counts,
  confirmed: (r.verified || [])
    .filter((v) => v.verdict === "CONFIRMED")
    .map((v) => v.finding),
  refuted: (r.verified || [])
    .filter((v) => v.verdict !== "CONFIRMED")
    .map((v) => ({ t: v.finding.title, verdict: v.verdict, why: v.reasoning })),
}));

const report = await agent(
  `You are synthesizing a NEET-UG college-predictor data-quality audit across all state sources. Below is the per-state confirmed/refuted findings JSON. Produce a single prioritized engineering report in Markdown:

- Group by SEVERITY (critical → low).
- For each bug: source, one-line symptom, root cause (parser file:line if given), and the concrete fix.
- Call out CROSS-CUTTING patterns (same bug class in multiple parsers) explicitly — those deserve a shared fix.
- Separate a short "Not bugs (real-world quirks)" section listing refuted claims so we don't chase them.
- End with a concrete FIX PLAN ordered by impact/effort.

DATA:
${JSON.stringify(packed, null, 2)}`,
  { label: "synthesize", phase: "Synthesize", agentType: "general-purpose" }
);

return { packed, report };

// The College Predictor's stream -> exam -> counselling choices.
//
// An exam is what the student sat; a counselling is the body that allots seats
// on it. JEE Main alone feeds JoSAA, JAC Delhi, UPTAC, OJEE and more, so the
// form asks for the exam and then the counselling.
//
// Streams come from the Exams tab (public/data/exams/exams.json, matched on
// `examIds`), so an exam sits under the same streams there and here. `streams`
// is given only for a route the Exams tab has no exam for (TNEA admits on
// Class 12 marks).
//
// `key` is the examConfigs key for the counselling's cutoffs, or null where
// Futures has none yet: those are listed so students know the route exists.
// `hint` names one or two colleges the counselling fills. `defaultStream`
// (on an exam or a counselling) is where a deep link to it lands.

export const PREDICTOR_EXAMS = [
  {
    // one entry for both papers: JoSAA takes both ranks, and the form asks
    // whether the student qualified JEE Advanced
    id: "jee",
    examIds: ["jee-main-paper-1", "jee-advanced"],
    label: "JEE Main & Advanced",
    counsellings: [
      { label: "JoSAA", hint: "IITs, NITs, IIITs, etc.", key: "JoSAA" },
      { label: "JAC Delhi", hint: "DTU, NSUT, etc.", key: "JEE Main-JAC" },
      {
        label: "JAC Chandigarh",
        hint: "PEC, CCET, etc.",
        key: "JAC Chandigarh",
      },
      {
        label: "UPTAC",
        hint: "IET Lucknow, KNIT Sultanpur, etc.",
        key: "UPTAC",
      },
      { label: "HBTU Kanpur", hint: null, key: "HBTU" },
      {
        label: "OJEE",
        hint: "OUTR Bhubaneswar, VSSUT Burla, etc.",
        key: "OJEE",
      },
      {
        label: "CSAB",
        hint: "NIT, IIIT seats left after JoSAA",
        key: null,
      },
      { label: "MP DTE", hint: "SGSITS Indore, UIT RGPV, etc.", key: null },
      {
        label: "HSTES Haryana",
        hint: "DCRUST Murthal, J.C. Bose YMCA, etc.",
        key: null,
      },
      { label: "IIIT Hyderabad", hint: null, key: null },
      { label: "IISc Bangalore", hint: "BS Research", key: null },
      { label: "IIST Thiruvananthapuram", hint: null, key: null },
    ],
  },
  {
    id: "bitsat",
    examIds: ["bitsat"],
    label: "BITSAT",
    counsellings: [
      { label: "BITS", hint: "Pilani, Goa, Hyderabad", key: "BITSAT" },
    ],
  },
  {
    id: "neet-ug",
    examIds: ["neet-ug"],
    label: "NEET-UG",
    defaultStream: "Medical",
    counsellings: [
      {
        label: "MCC and state counselling",
        hint: "AIIMS, government medical colleges, etc.",
        key: "NEETUG",
      },
    ],
  },
  {
    id: "aiims-ee",
    examIds: ["aiims-ee"],
    label: "AIIMS B.Sc. Nursing entrance",
    counsellings: [
      {
        label: "AIIMS B.Sc. (Hons.) Nursing",
        hint: "AIIMS Delhi, etc.",
        key: "AIIMS Nursing",
      },
    ],
  },
  {
    id: "cuet-ug",
    examIds: ["cuet-ug"],
    label: "CUET (UG)",
    counsellings: [
      {
        label: "Central universities",
        hint: "DU, BHU, etc.",
        key: "CUET",
        defaultStream: "Arts",
      },
      {
        label: "ICAR",
        hint: "state agricultural universities",
        key: "ICAR-UG",
        defaultStream: "Agriculture",
      },
    ],
  },
  {
    id: "clat",
    examIds: ["clat"],
    label: "CLAT",
    counsellings: [
      {
        label: "CLAT counselling",
        hint: "NLSIU Bengaluru, NALSAR, etc.",
        key: "CLAT",
      },
    ],
  },
  {
    id: "ap-eapcet",
    examIds: ["ap-eapcet-e-category"],
    label: "AP EAPCET",
    counsellings: [
      {
        label: "AP EAPCET counselling",
        hint: "Andhra University, JNTU Kakinada, etc.",
        key: "AP EAPCET",
      },
    ],
  },
  {
    id: "tg-eapcet",
    examIds: ["tg-eapcet-e"],
    label: "TG EAPCET",
    counsellings: [
      {
        label: "TG EAPCET counselling",
        hint: "JNTU Hyderabad, Osmania University, etc.",
        key: "TGEAPCET",
      },
    ],
  },
  {
    id: "gujcet",
    examIds: ["gujcet"],
    label: "GUJCET",
    counsellings: [
      { label: "ACPC Gujarat", hint: "LDCE Ahmedabad, etc.", key: "GUJCET" },
    ],
  },
  {
    id: "kcet",
    examIds: ["kea-cet"],
    label: "KCET",
    counsellings: [
      { label: "KEA Karnataka", hint: "RVCE, BMSCE, etc.", key: "KCET" },
    ],
  },
  {
    id: "keam",
    examIds: ["keam"],
    label: "KEAM",
    counsellings: [
      {
        label: "CEE Kerala",
        hint: "CET Trivandrum, TKM Kollam, etc.",
        key: "KEAM",
      },
    ],
  },
  {
    id: "mht-cet",
    examIds: ["mht-cet"],
    label: "MHT CET",
    counsellings: [
      {
        label: "Maharashtra CET Cell",
        hint: "COEP, VJTI, etc.",
        key: "MHT CET",
      },
    ],
  },
  {
    id: "wbjee",
    examIds: ["wbjee"],
    label: "WBJEE",
    counsellings: [
      {
        label: "WBJEEB",
        hint: "Jadavpur University, etc.",
        key: "WBJEE",
      },
    ],
  },
  {
    id: "tnea",
    examIds: [],
    streams: ["Engineering"],
    label: "Class 12 marks (Tamil Nadu)",
    counsellings: [
      { label: "TNEA", hint: "CEG Guindy, PSG Tech, etc.", key: "TNEA" },
    ],
  },
];

export const counsellingLabel = (c) =>
  c.hint ? `${c.label} (${c.hint})` : c.label;

// Streams per exam, from the Exams tab's records.
export const streamsFor = (exam, examsById) =>
  exam.streams ||
  Array.from(
    new Set(exam.examIds.flatMap((id) => examsById[id]?.streams || []))
  );

export const allStreams = (examsById) =>
  Array.from(
    new Set(PREDICTOR_EXAMS.flatMap((e) => streamsFor(e, examsById)))
  ).sort();

export const examsInStream = (stream, examsById) =>
  PREDICTOR_EXAMS.filter((e) => streamsFor(e, examsById).includes(stream));

// A deep link names a predictor key (?exam=JoSAA), optionally with the Exams
// tab's exam (&examId=jee-advanced). Find the route that leads to it.
export const routeForKey = (key, examsById, examId = null) => {
  const exams = PREDICTOR_EXAMS.filter((e) =>
    e.counsellings.some((c) => c.key === key)
  );
  const exam = exams.find((e) => e.examIds.includes(examId)) || exams[0];
  if (!exam) return null;
  const counselling = exam.counsellings.find((c) => c.key === key);
  const streams = streamsFor(exam, examsById);
  const preferred = [
    counselling.defaultStream,
    exam.defaultStream,
    "Engineering",
  ].find((s) => s && streams.includes(s));
  return { stream: preferred || streams[0], exam, counselling };
};

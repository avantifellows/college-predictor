const baseUrl = process.argv[2] || process.env.BASE_URL || "http://localhost:3001";

const cases = [
  {
    name: "Home page",
    path: "/",
    expectTitle: "College Predictor - Home",
  },
  {
    name: "Scholarships page",
    path: "/scholarships",
    expectTitle: "Scholarships Reference - Home",
  },
  {
    name: "Favicon",
    path: "/favicon.ico",
    expectBinary: true,
  },
  {
    name: "JoSAA API",
    path: "/api/exam-result?exam=JoSAA&qualifiedJeeAdv=No&category=OPEN&mainRank=1414&gender=Gender-Neutral&program=Engineering&homeState=Andhra%20Pradesh",
    expectJsonArray: true,
  },
  {
    name: "GUJCET API",
    path: "/api/exam-result?exam=GUJCET&category=General&program=Engineering&rank=80",
    expectJsonArray: true,
  },
  {
    name: "KCET API",
    path: "/api/exam-result?exam=KCET&category=General&courseType=Engineering&homeState=Karnataka&language=Any&region=All&rank=25000",
    expectJsonArray: true,
    validate: (rows) => {
      if (rows.some((row) => String(row["Closing Rank"]) === "0")) {
        throw new Error("KCET results still include zero closing ranks");
      }
    },
  },
  {
    name: "TNEA API",
    path: "/api/exam-result?exam=TNEA&category=BC&courseType=Computer%20Science&collegeType=Any&district=Any&rank=180",
    expectJsonArray: true,
  },
  {
    name: "MHT CET API",
    path: "/api/exam-result?exam=MHT%20CET&category=Open&gender=Gender-Neutral&homeState=Maharashtra&isPWD=No&isDefenseWard=No&rank=50000",
    expectJsonArray: true,
  },
  {
    name: "NEETUG API",
    path: "/api/exam-result?exam=NEETUG&program=MBBS&gender=Open&category=Open&religion=Other&nationality=Indian&region=Other&defence_war=No&seat_type=Any&rank=50000",
    expectJsonArray: true,
  },
  {
    name: "TGEAPCET API",
    path: "/api/exam-result?exam=TGEAPCET&category=OC&gender=Male&region=OU&rank=10000",
    expectJsonArray: true,
  },
  {
    name: "JEE Main-JAC API",
    path: "/api/exam-result?exam=JEE%20Main-JAC&category=General&gender=Gender-Neutral&homeState=Delhi&isPWD=No&isDefenseWard=No&rank=10000",
    expectJsonArray: true,
  },
  {
    name: "Scholarship data",
    path: "/data/scholarships/scholarship_data.json",
    expectJsonArray: true,
    validate: (rows) => {
      const parseDeadline = (value) => {
        if (!value) return null;
        const parts = String(value).split("/").map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
        return new Date(parts[2], parts[0] - 1, parts[1], 23, 59, 59, 999);
      };
      const allClosed = rows.every((row) => {
        const status = String(row.Status || "").toLowerCase();
        if (status === "closed") return true;
        const deadline = parseDeadline(row["Last Date"]);
        return deadline ? deadline < new Date() : false;
      });
      if (!allClosed) {
        throw new Error("Some scholarships are still marked active by status/deadline logic");
      }
    },
  },
];

const getTitle = (html) => {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1] : null;
};

let failed = false;

for (const testCase of cases) {
  const url = `${baseUrl}${testCase.path}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.error(`[FAIL] ${testCase.name}: HTTP ${response.status}`);
    failed = true;
    continue;
  }

  if (testCase.expectBinary) {
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`[PASS] ${testCase.name}: ${buffer.length} bytes`);
    continue;
  }

  const text = await response.text();

  if (testCase.expectTitle) {
    const title = getTitle(text);
    if (title !== testCase.expectTitle) {
      console.error(
        `[FAIL] ${testCase.name}: expected title "${testCase.expectTitle}" but got "${title}"`
      );
      failed = true;
      continue;
    }
    console.log(`[PASS] ${testCase.name}: ${title}`);
    continue;
  }

  if (testCase.expectJsonArray) {
    const rows = JSON.parse(text);
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error(`[FAIL] ${testCase.name}: expected non-empty JSON array`);
      failed = true;
      continue;
    }
    if (testCase.validate) {
      try {
        testCase.validate(rows);
      } catch (error) {
        console.error(`[FAIL] ${testCase.name}: ${error.message}`);
        failed = true;
        continue;
      }
    }
    console.log(`[PASS] ${testCase.name}: ${rows.length} rows`);
  }
}

if (failed) {
  process.exit(1);
}

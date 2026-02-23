const TOTAL_MARKS = 300;
const TOTAL_TEST_TAKERS = 1500000;

// Percentage -> Percentile (piecewise)
const LFIT = -86.555129;
const UFIT = 98.24994;
const KFIT = 0.153249;
const X0_FIT = 0.624824;

// SC coefficients
const F1_C1_M = 0.0251;
const F1_C1_B = -19.5;
const F1_C2_M = 0.0276;
const F1_C2_B = -51.9;
const F1_C3_M = 0.0383;
const F1_C3_B = -373;
const F1_C4_M = 0.0429;
const F1_C4_B = -605;
const F1_C5_M = 0.0515;
const F1_C5_B = -1297;
const F1_C6_M = 0.0571;
const F1_C6_B = -1854;
const F1_C7_M = 0.0738;
const F1_C7_B = -4542;
const F1_C8_M = 0.0892;
const F1_C8_B = -9217;
const F1_C9_M = 0.106;
const F1_C9_B = -17937;
const F1_C10_M = 0.118;
const F1_C10_B = -30183;

// OBC-NCL coefficients
const F2_C1_M = 0.232;
const F2_C1_B = -131;
const F2_C2_M = 0.313;
const F2_C2_B = -1180;
const F2_C3_M = 0.351;
const F2_C3_B = -2833;
const F2_C4_M = 0.389;
const F2_C4_B = -7865;

// EWS coefficients
const F3_C1_M = 0.129;
const F3_C1_B = -77.2;
const F3_C2_M = 0.145;
const F3_C2_B = -100;
const F3_C3_M = 0.118;
const F3_C3_B = 7517;
const F3_C4_M = 0.098;
const F3_C4_B = 19862;
const F3_C5_M = 0.0788;
const F3_C5_B = 39286;

// ST coefficients
const F4_C1_M = 0.00725;
const F4_C1_B = -32.2;
const F4_C2_M = 0.0122;
const F4_C2_B = -326;
const F4_C3_M = 0.0165;
const F4_C3_B = -930;
const F4_C4_M_LINEAR = 0.0136;
const F4_C4_M_QUAD = 1.76e-8;
const F4_C4_B = -1146;
const F4_C5_M = 0.0396;
const F4_C5_B = -11081;

const ALLOWED_CATEGORIES = new Set(["OPEN", "OBC-NCL", "SC", "ST", "EWS"]);

const marksToPercentage = (score) => (score * 100) / TOTAL_MARKS;
const percentageToMarks = (percentage) =>
  Math.floor((percentage * TOTAL_MARKS) / 100);

const percentageToPercentile = (percentage) => {
  if (percentage <= 25) {
    return LFIT + (UFIT - LFIT) / (1 + Math.exp(-KFIT * (percentage - X0_FIT)));
  }
  if (percentage <= 40) {
    return 65.1 + 8.95 * Math.log(percentage);
  }
  return 100 * (1 - Math.exp(-0.095 * percentage));
};

const PERCENTILE_AT_25 =
  LFIT + (UFIT - LFIT) / (1 + Math.exp(-KFIT * (25 - X0_FIT)));
const PERCENTILE_AT_40 = 65.1 + 8.95 * Math.log(40);

const percentileToPercentage = (percentile) => {
  if (percentile <= PERCENTILE_AT_25) {
    let low = 0;
    let high = 25;
    for (let i = 0; i < 50; i += 1) {
      const mid = (low + high) / 2;
      const testPercentile = percentageToPercentile(mid);
      if (Math.abs(testPercentile - percentile) < 0.001) {
        return mid;
      }
      if (testPercentile < percentile) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  }

  if (percentile <= PERCENTILE_AT_40) {
    return Math.exp((percentile - 65.1) / 8.95);
  }

  if (percentile >= 100) return 100;
  return -Math.log(1 - percentile / 100) / 0.095;
};

const percentileToAir = (percentile) =>
  Math.floor(TOTAL_TEST_TAKERS * (1 - percentile / 100));

const calculateFunction1 = (value) => {
  if (value < 10000) return F1_C1_M * value + F1_C1_B;
  if (value <= 30000) return F1_C2_M * value + F1_C2_B;
  if (value <= 50000) return F1_C3_M * value + F1_C3_B;
  if (value <= 75000) return F1_C4_M * value + F1_C4_B;
  if (value <= 100000) return F1_C5_M * value + F1_C5_B;
  if (value <= 150000) return F1_C6_M * value + F1_C6_B;
  if (value <= 300000) return F1_C7_M * value + F1_C7_B;
  if (value <= 500000) return F1_C8_M * value + F1_C8_B;
  if (value <= 1000000) return F1_C9_M * value + F1_C9_B;
  return F1_C10_M * value + F1_C10_B;
};

const calculateFunction2 = (value) => {
  if (value <= 10000) return F2_C1_M * value + F2_C1_B;
  if (value <= 50000) return F2_C2_M * value + F2_C2_B;
  if (value <= 100000) return F2_C3_M * value + F2_C3_B;
  return F2_C4_M * value + F2_C4_B;
};

const calculateFunction3 = (value) => {
  if (value <= 10000) return F3_C1_M * value + F3_C1_B;
  if (value <= 300000) return F3_C2_M * value + F3_C2_B;
  if (value <= 600000) return F3_C3_M * value + F3_C3_B;
  if (value <= 1000000) return F3_C4_M * value + F3_C4_B;
  return F3_C5_M * value + F3_C5_B;
};

const calculateFunction4 = (value) => {
  if (value <= 50000) return F4_C1_M * value + F4_C1_B;
  if (value <= 150000) return F4_C2_M * value + F4_C2_B;
  if (value <= 200000) return F4_C3_M * value + F4_C3_B;
  if (value <= 750000) {
    return F4_C4_M_QUAD * value * value + F4_C4_M_LINEAR * value + F4_C4_B;
  }
  return F4_C5_B + F4_C5_M * value;
};

const airToCat = (category, rank) => {
  let raw;
  if (category === "SC") raw = calculateFunction1(rank);
  else if (category === "OBC-NCL") raw = calculateFunction2(rank);
  else if (category === "EWS") raw = calculateFunction3(rank);
  else if (category === "OPEN") raw = rank;
  else if (category === "ST") raw = calculateFunction4(rank);
  else throw new Error("Invalid category");

  const rounded = Math.round(raw);
  return rounded <= 0 ? 1 : rounded;
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const marksRaw = body?.marks;
  const percentileRaw = body?.percentile;
  const category = body?.category;

  if (!ALLOWED_CATEGORIES.has(category)) {
    return res
      .status(400)
      .json({ error: "Unsupported category for estimation" });
  }

  let marks;
  let percentage;
  let percentile;

  if (marksRaw !== undefined && marksRaw !== null && marksRaw !== "") {
    marks = Number(marksRaw);
    if (Number.isNaN(marks) || marks < 0 || marks > TOTAL_MARKS) {
      return res.status(400).json({ error: "Marks must be between 0 and 300" });
    }
    percentage = marksToPercentage(marks);
    percentile = percentageToPercentile(percentage);
  } else if (
    percentileRaw !== undefined &&
    percentileRaw !== null &&
    percentileRaw !== ""
  ) {
    percentile = Number(percentileRaw);
    if (Number.isNaN(percentile) || percentile < 0 || percentile > 100) {
      return res
        .status(400)
        .json({ error: "Percentile must be between 0 and 100" });
    }
    percentage = percentileToPercentage(percentile);
    marks = percentageToMarks(percentage);
  } else {
    return res
      .status(400)
      .json({ error: "Provide either marks or percentile" });
  }

  let allIndiaRank = percentileToAir(percentile);
  let categoryRank = airToCat(category, allIndiaRank);

  if (marks >= TOTAL_MARKS || percentile >= 100) {
    percentile = 100;
    allIndiaRank = 1;
    categoryRank = 1;
    marks = TOTAL_MARKS;
    percentage = 100;
  }

  const percentageRounded = Number(percentage.toFixed(5));
  const percentileRounded = Number(percentile.toFixed(5));

  return res.status(200).json({
    marks: Math.round(marks),
    percentage: percentageRounded,
    percentile: percentileRounded,
    allIndiaRank,
    categoryRank,
  });
}

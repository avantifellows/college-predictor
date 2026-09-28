// JEE Main marks (or percentile) -> percentile, all-India rank, category rank.
//
// The model revised in Aug 2026 with the academic teams (data-assistant
// analysis/academic-levels-cutoffs, PR #150), replacing the older piecewise
// fits that read ~90 percentile at 67 marks:
//   - percentile <-> marks: a Weibull-CDF-inverse curve,
//       marks = S * (-ln(1 - p/100))^(1/k),
//     anchored at 90 percentile = 85 marks and 99 percentile = 160 marks (a
//     "moderate" paper). Monotonic, saturates, never passes 300.
//   - AIR = N * (1 - p/100), N = 15 lakh candidates.
//   - category rank <-> AIR: per category, log(AIR) = b0 + b1*log(CR) +
//     b2*log(CR)^2, fitted on ~2,700 labelled Avanti JEE Main 2025 students.
//     Open needs none (its category rank is the AIR). Inverted here.
const TOTAL_MARKS = 300;
const TOTAL_TEST_TAKERS = 1500000;

// (p90, marks at p90, p99, marks at p99) for a moderate paper
const ANCHOR = [90, 85, 99, 160];
const solveSK = ([p90, m90, p99, m99]) => {
  const x90 = -Math.log(1 - p90 / 100);
  const x99 = -Math.log(1 - p99 / 100);
  const kInv =
    (Math.log(m99) - Math.log(m90)) / (Math.log(x99) - Math.log(x90));
  return { S: Math.exp(Math.log(m90) - kInv * Math.log(x90)), k: 1 / kInv };
};
const { S, k } = solveSK(ANCHOR);

// cr_air_models.json from the analysis
const CR_AIR = {
  "OBC-NCL": [2.994301380644778, 0.7376463727990962, 0.008116634409503646],
  SC: [4.829901443014002, 0.842105692516867, -0.004706354675119741],
  ST: [6.437680123152332, 0.8028635490854991, -0.008189470143248166],
  EWS: [4.7073098201655785, 0.3958857670094553, 0.03271513675279924],
};

const ESTIMATION_SUPPORTED_CATEGORIES = new Set([
  "OPEN",
  "OBC-NCL",
  "SC",
  "ST",
  "EWS",
]);
const PWD_CATEGORY_SUFFIX = "(PwD)";
const PWD_CATEGORY_ERROR =
  "Rank estimation is currently unavailable for PwD categories. Please switch to 'No, I know my rank' and enter your rank directly.";

const marksToPercentile = (marks) =>
  100 * (1 - Math.exp(-Math.pow(marks / S, k)));
const percentileToMarks = (percentile) =>
  Math.min(TOTAL_MARKS, S * Math.pow(-Math.log(1 - percentile / 100), 1 / k));
const percentileToAir = (percentile) =>
  Math.max(1, Math.floor(TOTAL_TEST_TAKERS * (1 - percentile / 100)));

// solve b2*x^2 + b1*x + (b0 - ln AIR) = 0 for x = ln(CR), on the rising branch
const airToCat = (category, air) => {
  if (category === "OPEN") return air;
  const [b0, b1, b2] = CR_AIR[category];
  const c = b0 - Math.log(air);
  let x;
  if (Math.abs(b2) < 1e-12) {
    x = -c / b1;
  } else {
    const disc = b1 * b1 - 4 * b2 * c;
    if (disc < 0) {
      x = -b1 / (2 * b2); // the curve's turning point: the largest it reaches
    } else {
      const roots = [
        (-b1 + Math.sqrt(disc)) / (2 * b2),
        (-b1 - Math.sqrt(disc)) / (2 * b2),
      ];
      x = roots.find((r) => b1 + 2 * b2 * r > 0) ?? roots[0];
    }
  }
  // a category rank is at least 1 and never above the all-India rank
  return Math.max(1, Math.min(air, Math.floor(Math.exp(x))));
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const marksRaw = body?.marks;
  const percentileRaw = body?.percentile;
  const category = body?.category;

  if (String(category || "").includes(PWD_CATEGORY_SUFFIX)) {
    return res.status(400).json({ error: PWD_CATEGORY_ERROR });
  }

  if (!ESTIMATION_SUPPORTED_CATEGORIES.has(category)) {
    return res
      .status(400)
      .json({ error: "Unsupported category for estimation" });
  }

  let marks;
  let percentile;

  if (marksRaw !== undefined && marksRaw !== null && marksRaw !== "") {
    marks = Number(marksRaw);
    if (Number.isNaN(marks) || marks < 0 || marks > TOTAL_MARKS) {
      return res.status(400).json({ error: "Marks must be between 0 and 300" });
    }
    percentile = marksToPercentile(marks);
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
    marks = percentile >= 100 ? TOTAL_MARKS : percentileToMarks(percentile);
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
  }

  const percentage = (marks * 100) / TOTAL_MARKS;
  return res.status(200).json({
    marks: Math.round(marks),
    percentage: Number(percentage.toFixed(5)),
    percentile: Number(percentile.toFixed(5)),
    allIndiaRank,
    categoryRank,
  });
}

/**
 * NEET-UG marks -> All India Rank (AIR) estimator.
 *
 * Uses the score->AIR model fitted in scripts/fit_score_rank_model.py from
 * ~32k real (score, AIR) pairs across the Telangana merit list + MP + Punjab
 * (they agree to <1% because AIR is national). The model is a degree-4
 * polynomial in log10(AIR) space:  log10(AIR) = polyval(coeffs, score).
 *
 * NEET is scored out of 720. The model is trustworthy for scores ~150..640;
 * above 640 real data is too thin, so we cap and label the result "top tier"
 * rather than invent a precise rank.
 *
 * Unlike JEE, NEET has a SINGLE All India Rank (there is no separate per-category
 * rank in NEET-UG counselling — cutoffs are published as AIR per category seat),
 * so this returns just the AIR. The predictor compares that AIR to closing ranks.
 */
import fs from "fs";
import path from "path";

const TOTAL_MARKS = 720;

let MODEL = null;
function loadModel() {
  if (MODEL) return MODEL;
  const p = path.join(process.cwd(), "public/data/NEETUG/score_rank_model.json");
  MODEL = JSON.parse(fs.readFileSync(p, "utf-8"));
  return MODEL;
}

// polyval with numpy-style coeffs (highest power first)
function polyval(coeffs, x) {
  return coeffs.reduce((acc, c) => acc * x + c, 0);
}

function scoreToAir(score, model) {
  const s = Math.max(score, model.min_trusted_score);
  const capped = Math.min(s, model.max_trusted_score);
  const air = Math.round(Math.pow(10, polyval(model.coeffs, capped)));
  return air < 1 ? 1 : air;
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const marksRaw = body?.marks;

  if (marksRaw === undefined || marksRaw === null || marksRaw === "") {
    return res.status(400).json({ error: "Please enter your NEET marks." });
  }

  const marks = Number(marksRaw);
  if (Number.isNaN(marks) || marks < 0 || marks > TOTAL_MARKS) {
    return res
      .status(400)
      .json({ error: `Marks must be between 0 and ${TOTAL_MARKS}.` });
  }

  const model = loadModel();
  const allIndiaRank = scoreToAir(marks, model);

  // Above the trusted range the exact rank is unreliable: flag it so the UI can
  // show "top ~N" instead of a falsely precise number.
  const aboveTrusted = marks > model.max_trusted_score;

  return res.status(200).json({
    marks: Math.round(marks),
    allIndiaRank,
    aboveTrusted,
    note: aboveTrusted
      ? `Above ${model.max_trusted_score} marks the rank is approximate (top tier).`
      : undefined,
  });
}

// JEE (Advanced) marks -> category rank, from the official marks at every
// 100th rank (JIC reports 2025 and 2026, sections 6.8-6.13; external_data_
// sources jeeadv/ -> BigQuery -> scripts/build_jee_adv_marks.py).
//
// The reports publish only ranks 1, 101, 201, ... so for marks M a year
// gives a RANGE: best = (last published rank scoring more than M) + 1,
// worst = (first published rank scoring less than M) - 1. The estimate is
// the middle of that range, averaged over the years whose table reaches M
// (2024 left out: its curve was an outlier). Marks past the published
// tables, and PwD categories (CRL-PwD has 3-4 points; category-PwD lists
// aren't published), get no estimate — the student enters the rank.
import table from "../../public/data/JEE/jee_adv_marks_at_rank.json";

// the JoSAA form's category label -> the report's rank list
const LIST = {
  OPEN: "CRL",
  EWS: "GEN-EWS",
  "OBC-NCL": "OBC-NCL",
  SC: "SC",
  ST: "ST",
};

const rangeFor = (points, marks) => {
  // points: [rank, marks] by rank ascending, marks never rising
  const above = points.filter(([, m]) => m > marks);
  const below = points.find(([, m]) => m < marks);
  if (!below) return null; // past the last published rank
  const best = above.length ? above[above.length - 1][0] + 1 : 1;
  const worst = Math.max(best, below[0] - 1);
  return { best, worst };
};

export const estimateAdvRank = (marks, category) => {
  const list = LIST[category];
  if (!list) return { error: "pwd" };
  const ranges = Object.values(table.years)
    .map((y) => rangeFor(y.lists[list] || [], marks))
    .filter(Boolean);
  if (!ranges.length) return { error: "beyond" };
  const mids = ranges.map((r) => (r.best + r.worst) / 2);
  return {
    rank: Math.max(
      1,
      Math.round(mids.reduce((a, b) => a + b, 0) / mids.length)
    ),
    low: Math.min(...ranges.map((r) => r.best)),
    high: Math.max(...ranges.map((r) => r.worst)),
  };
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const marks = Number(req.body?.marks);
  const category = String(req.body?.category || "");
  if (!Number.isInteger(marks) || marks < 0 || marks > 360) {
    return res
      .status(400)
      .json({ error: "Enter your JEE Advanced marks out of 360." });
  }
  const out = estimateAdvRank(marks, category);
  if (out.error === "pwd") {
    return res.status(400).json({
      error:
        "JEE Advanced rank estimation isn't available for PwD categories. Please switch to 'No, I know my rank' and enter your rank directly.",
    });
  }
  if (out.error === "beyond") {
    return res.status(400).json({
      error:
        "These marks are below the ranks published for past years. Please switch to 'No, I know my rank' and enter your JEE Advanced rank.",
    });
  }
  return res.status(200).json(out);
}

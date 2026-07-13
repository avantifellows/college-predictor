#!/usr/bin/env python3
"""
Fit a NEET-UG score -> All India Rank (AIR) model.

WHY THIS EXISTS
  The college predictor asks a student for their NEET *marks*, but every cutoff
  we have is expressed as an *All India Rank*. This script fits the marks -> AIR
  curve so the predictor can convert a student's score into an AIR and compare
  it against college closing ranks.

CALIBRATION DATA (all NEET 2025, all carry score + AIR as published pairs)
  - Telangana KNRUHS final merit list  (~16.6k students, score 113..638)
  - Madhya Pradesh allotment list       (~14.3k students)
  - Punjab allotment list               (~1.1k students)
  These three independent state sources agree on AIR-at-a-given-score to <1%,
  because a NEET AIR is national — it does not depend on which state a student
  counselled in. So this curve is a national score->AIR map, not a state one.

METHOD
  AIR spans ~1 (topper) to ~1.3M (score 150) — four orders of magnitude — so we
  fit in log10(AIR) space against raw score. A low-degree polynomial captures
  the smooth monotonic relationship. We report error per score-band so the
  predictor (and reviewers) know exactly where the curve is trustworthy.

  Grace marks: we calibrate on the *raw* NEET score, never "score after grace"
  (grace is a person-specific NCC/etc. bonus that breaks the score<->rank law).

TOP END
  Above ~640 marks (AIR < ~100) almost no real students exist, so the data is
  too thin to fit precisely. We cap: predictions above MAX_TRUSTED_SCORE are
  reported as "top ~N" rather than a fake precise rank.

OUTPUT
  public/data/NEETUG/score_rank_model.json  — coefficients + metadata the app reads
  scripts/score_rank_calibration.csv        — the (score, AIR) anchors, committed for audit
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parent

# The polynomial is fit where data is dense. Real (score, AIR) pairs exist up to
# ~638; above that almost no students exist. Rather than flat-cap the whole top
# (which mapped 650 and 720 to the same rank), we anchor a TOP SEGMENT: from the
# highest real anchor up to the perfect score, interpolate log-linearly toward
# AIR = TOP_AIR. This keeps the top monotonic and sensible without inventing dense data.
MAX_TRUSTED_SCORE = 638   # highest score with a real anchor
TOP_SCORE = 720           # perfect NEET score
TOP_AIR = 1               # AIR at (near) a perfect score
POLY_DEGREE = 4


def load_pairs() -> list[tuple[int, int]]:
    """Return combined (score, AIR) pairs from all three calibration sources."""
    pairs: list[tuple[int, int]] = []

    # Telangana: pre-summarised {score: [min, median, max, n]} — expand to median points,
    # weighted by n so dense scores count proportionally.
    tg = json.loads((HERE / "tg_score_air.json").read_text())
    for score_str, (mn, med, mx, n) in tg.items():
        for _ in range(int(n)):
            pairs.append((int(score_str), int(med)))

    # MP + Punjab: raw (score, AIR) lists
    extra = json.loads((HERE / "extra_score_air.json").read_text())
    for src in ("mp", "punjab"):
        for score, air in extra.get(src, []):
            pairs.append((int(score), int(air)))

    return pairs


def fit(pairs: list[tuple[int, int]]):
    scores = np.array([s for s, _ in pairs], dtype=float)
    airs = np.array([a for _, a in pairs], dtype=float)

    trusted = scores <= MAX_TRUSTED_SCORE
    x = scores[trusted]
    y = np.log10(airs[trusted])

    # polyfit: log10(AIR) = c[0]*s^d + ... + c[d]
    coeffs = np.polyfit(x, y, POLY_DEGREE)
    return coeffs


def predict(coeffs, score: float) -> float:
    return 10 ** np.polyval(coeffs, score)


def error_report(coeffs, pairs):
    """Median abs % error per score band, using per-score median AIR as truth."""
    by = defaultdict(list)
    for s, a in pairs:
        by[s].append(a)
    truth = {s: float(np.median(v)) for s, v in by.items()}

    bands = [(150, 300), (300, 400), (400, 450), (450, 500),
             (500, 550), (550, 600), (600, 640)]
    print(f"{'band':>12}  {'n scores':>8}  {'median err%':>11}  {'max err%':>9}")
    rows = []
    for lo, hi in bands:
        errs = []
        for s, t in truth.items():
            if lo <= s < hi:
                pred = predict(coeffs, s)
                errs.append(abs(pred - t) / t * 100)
        if errs:
            med, mx = float(np.median(errs)), float(np.max(errs))
            print(f"  {lo:>4}-{hi:<4}    {len(errs):>8}  {med:>10.2f}%  {mx:>8.1f}%")
            rows.append((lo, hi, len(errs), med, mx))
    return rows


def main():
    pairs = load_pairs()
    print(f"calibration points: {len(pairs):,}  (score {min(s for s,_ in pairs)}..{max(s for s,_ in pairs)})")

    coeffs = fit(pairs)
    print(f"\nfitted log10(AIR) poly (deg {POLY_DEGREE}), powers {POLY_DEGREE}..0:")
    print("  ", list(coeffs))

    print("\nspot checks (score -> predicted AIR):")
    for s in [640, 620, 600, 550, 500, 450, 400, 350, 300, 200]:
        print(f"  {s} -> {round(predict(coeffs, s)):,}")

    print("\nerror by band:")
    error_report(coeffs, pairs)

    # AIR at the top anchor, from the poly, so the top segment joins continuously.
    air_at_max = float(predict(coeffs, MAX_TRUSTED_SCORE))

    # write model json for the app
    model = {
        "kind": "neet_score_to_air",
        "note": (
            "For score in [min_trusted_score, max_trusted_score]: "
            "AIR = 10**polyval(coeffs, score). "
            "For score in (max_trusted_score, top_score]: log-linear interpolation "
            "from air_at_max_trusted down to top_air. Below min: floored."
        ),
        "coeffs": [float(c) for c in coeffs],
        "poly_degree": POLY_DEGREE,
        "max_trusted_score": MAX_TRUSTED_SCORE,
        "min_trusted_score": 150,
        "air_at_max_trusted": air_at_max,
        "top_score": TOP_SCORE,
        "top_air": TOP_AIR,
        "calibration_sources": ["telangana_2025_merit_list", "mp_2025", "punjab_2025"],
        "calibration_n": len(pairs),
    }
    out_dir = REPO / "public" / "data" / "NEETUG"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "score_rank_model.json").write_text(json.dumps(model, indent=2))
    print(f"\nwrote {out_dir / 'score_rank_model.json'}")

    # committed calibration anchors (median AIR per score) for audit
    by = defaultdict(list)
    for s, a in pairs:
        by[s].append(a)
    lines = ["score,air_median,n"]
    for s in sorted(by):
        v = by[s]
        lines.append(f"{s},{int(np.median(v))},{len(v)}")
    (HERE / "score_rank_calibration.csv").write_text("\n".join(lines) + "\n")
    print(f"wrote {HERE / 'score_rank_calibration.csv'}")


if __name__ == "__main__":
    main()

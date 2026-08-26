#!/usr/bin/env python3
"""
L4+L5: fit a 2026 marks->AIR curve and produce the 2026 AIQ min-marks matrix.

Data (see docs/NEET_2026_MATRIX_DECISIONS.md), trust order:
  - OFFICIAL 2026 cumulative anchors: (715,1),(700,19),(690,138),(650,1492).
  - JNV 2026 pairs (185) from NTA xlsx, AIR 40k..1.59M.
  - Qualifying floor anchor: 2026 UR 50th pctile = 213 marks at ~AIR 1.32M
    (11.21L qualified; 50th pctile of ~22.8L appeared ≈ rank 1.14M..1.32M band -> use 1.3M).
We fit log10(AIR) = poly(marks) (same shape as the 2025 model), robustly, then invert to get
marks at each matrix AIR. Validate on a held-out split of the in-range JNV points.
2026 matrix = for each 2025 govt closing AIR (from L1), the 2026 marks at that AIR.
"""
import csv, json, re
import numpy as np
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"

# ---- gather 2026 (marks, AIR) points ----
import openpyxl
wb = openpyxl.load_workbook(REPO / "amogh-csv/NTA NEET 2025.xlsx", read_only=True, data_only=True)
ws = wb["2026 Physical NEET"]
jnv = []
for r in ws.iter_rows(min_row=3, values_only=True):
    if not r:
        continue
    try:
        m, a = float(r[1]), float(r[2])
        if 0 < m <= 720 and a >= 1:
            jnv.append((m, a))
    except Exception:
        pass

official = [(715, 1), (700, 19), (690, 138), (650, 1492)]   # NTA 2026 cumulative
qualifying = [(213, 1_300_000)]                              # UR 50th pctile floor, ~AIR 1.3M
anchors = official + qualifying

# ---- fit log10(AIR) = poly(marks), weighting official/qualifying anchors heavily ----
pts = [(m, a, 6.0) for m, a in official] + [(m, a, 8.0) for m, a in qualifying] + [(m, a, 1.0) for m, a in jnv]
# held-out: 20% of in-range JNV for validation
rng = np.random.default_rng(0)
jnv_arr = np.array(jnv)
idx = rng.permutation(len(jnv_arr))
test_idx = set(idx[: max(1, len(jnv_arr) // 5)].tolist())
train_pts = [(m, a, w) for k, (m, a, w) in enumerate(
    [(m, a, 6.0) for m, a in official] + [(m, a, 8.0) for m, a in qualifying]
) ] + [(jnv[k][0], jnv[k][1], 1.0) for k in range(len(jnv)) if k not in test_idx]

M = np.array([p[0] for p in train_pts])
A = np.log10(np.array([p[1] for p in train_pts]))
W = np.array([p[2] for p in train_pts])
deg = 3
V = np.vander(M, deg + 1)
# weighted least squares
Wm = np.sqrt(W)[:, None]
coef, *_ = np.linalg.lstsq(V * Wm, A * np.sqrt(W), rcond=None)

def marks_to_logair_2026(m):
    return np.polyval(coef, m)
def air_to_marks_2026(air):
    la = np.log10(air)
    lo, hi = 100.0, 720.0
    for _ in range(60):
        mid = (lo + hi) / 2
        # higher marks -> lower AIR -> lower log10(AIR)
        if marks_to_logair_2026(mid) > la:
            lo = mid
        else:
            hi = mid
    return round((lo + hi) / 2)

# ---- validate on held-out JNV ----
errs = []
for k in test_idx:
    m, a = jnv[k]
    pred_m = air_to_marks_2026(a)
    errs.append(abs(pred_m - m))
print(f"JNV points: {len(jnv)} (train {len(jnv)-len(test_idx)}, test {len(test_idx)})")
print(f"held-out validation: mean |Δmarks| = {np.mean(errs):.1f}, median = {np.median(errs):.1f}, max = {np.max(errs):.0f}")

# ---- L5: apply to the 2025 govt closing AIRs from L1 (aiq_2025_matrix.csv) ----
rows = list(csv.DictReader(open(OUT / "aiq_2025_matrix.csv")))
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177}
with open(OUT / "aiq_2026_matrix.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["category", "program_band", "floor_closing_AIR", "min_marks_2025", "min_marks_2026", "qualifying_2026_B2b"])
    print("\n=== 2026 AIQ min-marks matrix (govt floor) ===")
    print(f"{'cat':5} {'band':9} {'AIR':>7} {'2025':>5} {'2026':>5} {'qual26':>7}")
    for r in rows:
        air = int(r["floor_closing_AIR_2025"])
        m26 = air_to_marks_2026(air)
        cat = r["category"]
        w.writerow([cat, r["program_band"], air, r["min_marks_2025"], m26, QUAL_2026.get(cat, "")])
        print(f"{cat:5} {r['program_band']:9} {air:>7} {r['min_marks_2025']:>5} {m26:>5} {QUAL_2026.get(cat,''):>7}")
print(f"\nwrote {OUT/'aiq_2026_matrix.csv'}")
print("coef (log10AIR=poly(marks), deg3):", [round(c,6) for c in coef])

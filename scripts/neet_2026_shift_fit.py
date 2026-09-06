#!/usr/bin/env python3
"""
Fit the 2025->2026 difficulty SHIFT, McElreath-style:
  - 2025 marks<->AIR curve = FIXED strong backbone (our 32k-point model).
  - 2026 = same backbone shifted: marks_2026(rank) = marks_2025(rank) + Delta(marks_2025).
  - Delta fit from the 185 real JNV 2026 (marks, AIR) points + anchors, only 2 params.
Diagnostics FIRST (look before trusting): plot-free residual summary, per-band Delta.
"""
import csv, json, re
import numpy as np
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# ---- FIXED 2025 backbone: marks -> AIR (our model) and its inverse ----
model = json.load(open(REPO / "public/data/NEETUG/score_rank_model.json"))
def polyval(c, x):
    v = 0.0
    for a in c: v = v*x + a
    return v
def air2025(score):
    s = max(model["min_trusted_score"], min(score, model["max_trusted_score"]))
    return 10**polyval(model["coeffs"], s)
def marks2025_at_air(air):          # invert (monotone decreasing)
    lo, hi = model["min_trusted_score"], model["max_trusted_score"]
    for _ in range(60):
        mid=(lo+hi)/2
        if air2025(mid) > air: lo=mid
        else: hi=mid
    return (lo+hi)/2

# ---- real 2026 points (185 JNV) ----
import openpyxl
wb = openpyxl.load_workbook(REPO/"amogh-csv/NTA NEET 2025.xlsx", read_only=True, data_only=True)
ws = wb["2026 Physical NEET"]
jnv=[]
for r in ws.iter_rows(min_row=3, values_only=True):
    if not r: continue
    try:
        m,a=float(r[1]),float(r[2])
        if 0<m<=720 and a>=1: jnv.append((m,a))
    except: pass

# For each real 2026 point: observed Delta = marks_2026 - marks_2025_at_same_AIR
obs=[]  # (marks_2025_at_that_air, observed_delta, air)
for m26,air in jnv:
    m25=marks2025_at_air(air)
    obs.append((m25, m26-m25, air))
obs.sort()

# anchors (as pseudo-observations): top ~ (m25=715, delta~0); qualifying floor (m25~144 2025 UR, delta ~ +69 -> 2026 213)
anchors=[(710,0.0),(144,69.0)]

# ---- 2-param shift: Delta(m25) = k * max(0, Mref - m25)  (0 above Mref, linear below) ----
# fit k, Mref by grid + least squares on obs (JNV) with anchors weighted
def loss(k, Mref):
    e=0.0
    for m25,d,_ in obs:
        pred=k*max(0.0, Mref-m25); e+=(pred-d)**2
    for m25,d in anchors:
        pred=k*max(0.0, Mref-m25); e+=8*(pred-d)**2   # weight anchors
    return e
best=None
for Mref in np.arange(640,721,5):
    for k in np.arange(0.02,0.40,0.005):
        L=loss(k,Mref)
        if best is None or L<best[0]: best=(L,k,Mref)
_,k,Mref=best
print(f"fitted shift: Delta(m25) = {k:.3f} * max(0, {Mref:.0f} - m25)")
def delta(m25): return k*max(0.0, Mref-m25)

# ---- diagnostics: observed vs fitted Delta by 2025-marks band ----
print("\nobserved Delta (2026-2025 marks at same AIR), by 2025-marks band vs fitted:")
bands=[(500,720),(450,500),(400,450),(300,400),(200,300),(100,200)]
for lo,hi in bands:
    ds=[d for m25,d,_ in obs if lo<=m25<hi]
    if ds:
        mid=(lo+hi)/2
        print(f"  m25 {lo:>3}-{hi:<3}: n={len(ds):>3} obs mean Δ={np.mean(ds):+5.1f} (sd {np.std(ds):4.1f})  fitted Δ={delta(mid):+5.1f}")
resid=[ (k*max(0,Mref-m25)) - d for m25,d,_ in obs]
print(f"\nfit residual (fitted-obs): mean {np.mean(resid):+.1f}, sd {np.std(resid):.1f}, n={len(obs)}")
print(f"JNV AIR coverage: {min(a for _,_,a in obs):.0f} .. {max(a for _,_,a in obs):.0f}")
print("NOTE the gap: our govt-MBBS floor is AIR ~21k-27k; JNV starts at ~40k -> floor Δ is EXTRAPOLATED.")

# save the shift params for the matrix builder
json.dump({"form":"delta = k*max(0, Mref - marks2025)","k":float(k),"Mref":float(Mref),
           "jnv_air_min":float(min(a for _,_,a in obs)),"jnv_air_max":float(max(a for _,_,a in obs)),
           "n_jnv":len(obs)},
          open(REPO/"scripts/neet_matrix_out/shift_2026.json","w"), indent=2)
print("\nwrote scripts/neet_matrix_out/shift_2026.json")

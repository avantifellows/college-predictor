"""Rebuild public/data/TSEAPERT/tseapert.json from the TG-EAPCET 2025 fact.

Source: external_data_sources/tgeapcet/clean/tgeapcet_fact_cutoffs.parquet
        (itself built from the Convener's 2025 Last Rank Statement PDFs).

WHAT CHANGES vs the shipped 2024 file
-------------------------------------
1. YEAR. 2024 -> 2025-26. The shipped file was the 2024 layout, identifiable by
   two things the 2025 source removed: a `tuition_fee` column and a single
   plain `SC` category.

2. SC SPLITS THREE WAYS. The 2024 SC Rationalization GO divides SC into
   SC_I / SC_II / SC_III and the 2025 PDFs publish all three separately, with
   materially different cutoffs (Earth Sciences Univ CSE boys: SC_I 45,412 vs
   SC_II 120,845). We keep the sub-group as its own selectable category rather
   than collapsing it, because collapsing hides exactly what an SC student
   needs.

3. REGION (OU / Other) IS GONE. The 2025 source does not publish local-area
   sub-pools per row — only the headline all-local-area rank. The old file's
   `region` column was a derived approximation, and the old config's region
   dropdown silently narrowed results on a distinction the new source cannot
   make. Dropping the field is more honest than inventing it; a student's real
   cutoff in their own local area may be slightly easier than shown.

4. tuition_fee / year_of_establish are dropped — not in the 2025 source.

WHAT STAYS
----------
Every institute type ships (162 institutes), same as before: govt scope is a
filter the student can apply, not a decision baked into the file.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

PARQUET = (Path.home() / "jan2023" / "external_data_sources" / "tgeapcet"
           / "clean" / "tgeapcet_fact_cutoffs.parquet")
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "TSEAPERT" / "tseapert.json"

# The predictor's category values are lowercased raw codes minus the gender
# half, so the dropdown can offer the real Telangana sub-groups.
CATEGORY_FROM_RAW = {
    "OC": "oc",
    "BC_A": "bc_a", "BC_B": "bc_b", "BC_C": "bc_c", "BC_D": "bc_d", "BC_E": "bc_e",
    "SC_I": "sc_i", "SC_II": "sc_ii", "SC_III": "sc_iii",
    "ST": "st",
    "EWS": "ews",
}


def main() -> None:
    if not PARQUET.exists():
        raise SystemExit(
            f"Missing {PARQUET}. Run external_data_sources/tgeapcet/scripts/build_clean.py first."
        )
    df = pd.read_parquet(PARQUET)
    print(f"Read {len(df):,} rows from {PARQUET.name}")

    # category_raw is gender-bearing (OC_BOYS / OC_GIRLS). Split it: the base
    # code becomes the category dropdown value, gender is already its own col.
    base = df["category_raw"].str.replace(r"_(BOYS|GIRLS)$", "", regex=True)
    unknown = sorted(set(base) - set(CATEGORY_FROM_RAW))
    if unknown:
        raise SystemExit(f"Unmapped category_raw base codes: {unknown}")
    df["category"] = base.map(CATEGORY_FROM_RAW)

    out = pd.DataFrame({
        "inst_code": df["college_code"],
        "institute_name": df["college_name"],
        "place": df["place"],
        "dist_code": df["district"],
        "co_ed": df["coed"],
        "college_type": df["institute_type_raw"],
        "branch_code": df["branch_code"],
        "branch_name": df["branch_name"],
        "category": df["category"],
        "category_key": df["category_raw"],
        "gender": df["gender"].map({"Boys": "Male", "Girls": "Female"}),
        "closing_rank": df["closing_rank"].astype(int),
        "affiliated_to": df["affiliated_to"],
        "Year": df["year"].astype(int),
    })

    if out["gender"].isna().any():
        raise SystemExit("Unmapped gender value")

    # ── sanity, against the fact table's own anchors ─────────────────────────
    assert len(out) == 20_449, f"expected 20,449 rows, got {len(out):,}"
    assert out["inst_code"].nunique() == 162, out["inst_code"].nunique()
    jnt = out[(out.inst_code == "JNTH") & (out.branch_code == "CSE")
              & (out.category_key == "OC_BOYS")]
    assert len(jnt) == 1 and int(jnt.iloc[0].closing_rank) == 1228, jnt.to_dict("records")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out.to_dict(orient="records"), indent=1))
    print(f"Wrote {len(out):,} rows -> {OUT}")
    print("\n  rows per category:")
    print(out["category"].value_counts().to_string())
    print("\n  rows per college_type:")
    print(out["college_type"].value_counts().to_string())


if __name__ == "__main__":
    main()

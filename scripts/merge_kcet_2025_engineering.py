#!/usr/bin/env python3
"""
Update the app's KCET data with the 2025 engineering cutoffs.

The app serves public/data/KCET/kcet_data.json — a mix of KCET streams
(Medical/Dental, Pharma, Agriculture, BNYS, Architecture, Engineering). The old
Engineering slice was CET-2021 data with NO real college names (the "Institute"
field held a PDF header line). This replaces ONLY the Engineering rows with the
2025 Third-Round cutoffs (real college names). Of the 2021 streams, Pharma and
Agriculture stay; Medical/Dental and BNYS (ranked on NEET; the NEET predictor
holds Karnataka's state quota) and Architecture (ranked on NATA) are dropped:
their closing ranks are not KCET ranks.

Without --src it only re-normalises the existing file (Pool, dropped streams).

New source: KA_engg_2025_all_cutoffs_R3.csv (from futures-v2 parse_KA_2025.py)
  columns: college_code, college_name, course_name, domicile_pool,
           category_code, closing_rank, year, round, course_name_raw

App schema:
  Institute, Course Type, Year, Academic Program Name, Category, Pool,
  Language, Rural/Urban, Category_Key, Closing Rank

Pool: "General" (any Karnataka candidate) or "Kalyana-Karnataka" (the 371(J)
region's reserved seats; its students compete for both). 2021 rows print the
two pools as one ("GM/GMH") and are all "General".

Category-code grammar (KEA):
  vertical prefix -> Category:   1/2A/2B/3A/3B (as-is), GM->General, SC->SC, ST->ST
  horizontal suffix -> Language + Rural/Urban:
     G = General (Language=Any,     Rural/Urban=All)
     K = Kannada (Language=Kannada, Rural/Urban=All)
     R = Rural   (Language=Any,     Rural/Urban=Rural)
  trailing H = Kalyana-Karnataka 371(j) / HK domicile pool (also domicile_pool=HK)
"""
from __future__ import annotations
import argparse, csv, json, re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
# The 2025 engineering cutoff CSV is produced by futures-v2's parse_KA_2025.py
# (state_cet/scrape/extracted_data/KA_engg_2025_all_cutoffs_R3.csv). Pass its
# path with --src; it is not committed to this repo.
DEFAULT_APP_JSON = REPO / "public" / "data" / "KCET" / "kcet_data.json"

VERTICAL = {"GM": "General", "SC": "SC", "ST": "ST",
            "1": "1", "2A": "2A", "2B": "2B", "3A": "3A", "3B": "3B"}


VERTICAL_PREFIXES = ("GM", "SC", "ST", "2A", "2B", "3A", "3B", "1")


def decode_category(code: str):
    """category_code -> (Category, Language, Rural/Urban, is_hk).

    Grammar: <vertical><horizontal?><H?>
      vertical    = GM/SC/ST/1/2A/2B/3A/3B
      horizontal  = G (general) | K (Kannada) | R (rural) | '' (implicit general)
      trailing H  = Kalyana-Karnataka 371(j) / HK domicile
    Examples: GMH = GM + (implicit general) + HK;  2AKH = 2A + Kannada + HK;
              SCH = SC + (implicit general) + HK;  1RH = 1 + Rural + HK.
    """
    c = code.strip()
    # 1) peel trailing H = HK domicile (always the last char when present)
    hk = c.endswith("H")
    if hk:
        c = c[:-1]
    # 2) identify the vertical prefix (longest match)
    vert = next((v for v in VERTICAL_PREFIXES if c.startswith(v)), c)
    suffix = c[len(vert):]  # G / K / R / ''
    lang, rural = "Any", "All"
    if suffix == "K":
        lang = "Kannada"
    elif suffix == "R":
        rural = "Rural"
    # suffix in ('G','') -> general horizontal (defaults)
    category = VERTICAL.get(vert, vert)
    return category, lang, rural, hk


def build_engineering_rows(src: Path):
    rows = []
    with src.open() as f:
        for r in csv.DictReader(f):
            rank = str(r["closing_rank"]).strip()
            if not rank or rank.upper() in ("NULL", "NA", ""):
                continue
            # closing_rank is a float string like '11952.0'
            try:
                rank_int = int(float(rank))
            except ValueError:
                continue
            cat, lang, rural, hk = decode_category(r["category_code"])
            rows.append({
                "Institute": f"{r['college_code']}  {r['college_name']}".strip(),
                "Course Type": "Engineering",
                "Year": "2025",
                "Academic Program Name": r["course_name"].strip(),
                "Category": cat,
                "Pool": "Kalyana-Karnataka" if hk else "General",
                "Language": lang,
                "Rural/Urban": rural,
                "Category_Key": r["category_code"].strip(),
                "Closing Rank": str(rank_int),
            })
    return rows


# ranked on NEET (Medical/Dental, BNYS) or NATA (Architecture), not KCET
NOT_KCET_RANK = {"Medical/Dental", "BNYS", "Architecture"}


def normalise(r):
    """Older files carried "State": "Karnataka" for the HK pool (2025) and
    for the rural / Kannada rows (2021), "All India" otherwise."""
    if "State" in r:
        state = r.pop("State")
        hk = r["Year"] == "2025" and state == "Karnataka"
        r["Pool"] = "Kalyana-Karnataka" if hk else "General"
    return r


# Every row carries a per-row "Year": engineering rows are 2025, the untouched
# non-engineering streams remain 2021. Stamped again in main() so re-runs keep it.
def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--src", type=Path,
                    help="Path to KA_engg_2025_all_cutoffs_R3.csv (from futures-v2 parse_KA_2025.py)")
    ap.add_argument("--app-json", type=Path, default=DEFAULT_APP_JSON)
    args = ap.parse_args()

    data = json.loads(args.app_json.read_text())
    non_eng = [r for r in data if r.get("Course Type") != "Engineering"
               and r.get("Course Type") not in NOT_KCET_RANK]
    for r in non_eng:                      # the untouched streams are CET-2021 vintage
        r.setdefault("Year", "2021")
        normalise(r)
    old_eng = sum(r.get("Course Type") == "Engineering" for r in data)

    if args.src:
        new_eng = build_engineering_rows(args.src)
    else:
        new_eng = [normalise(r) for r in data if r.get("Course Type") == "Engineering"]
    merged = non_eng + new_eng
    args.app_json.write_text(json.dumps(merged, ensure_ascii=False, indent=1))

    print(f"old engineering rows dropped: {old_eng:,}")
    print(f"non-engineering kept:         {len(non_eng):,}")
    print(f"new 2025 engineering added:   {len(new_eng):,}")
    print(f"total now:                    {len(merged):,}")
    # spot-check
    from collections import Counter
    e = new_eng
    print("\nnew engineering Category:", dict(Counter(r["Category"] for r in e)))
    print("Language:", dict(Counter(r["Language"] for r in e)))
    print("Rural/Urban:", dict(Counter(r["Rural/Urban"] for r in e)))
    print("Pool:", dict(Counter(r["Pool"] for r in merged)))
    print("Course Type:", dict(Counter(r["Course Type"] for r in merged)))


if __name__ == "__main__":
    main()

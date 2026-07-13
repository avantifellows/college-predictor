#!/usr/bin/env python3
"""
Build the unified NEET-UG cutoff dataset the college predictor serves.

Merges the parsed cutoff CSVs (produced by the parsers in
futures-v2/neet/scrape/scripts/) into a single public/data/NEETUG/NEETUG.json.

Two seat-type families:
  - 'All India'   : MCC national All India Quota (from the AIQ R1+R3 union).
                    Shown to every student regardless of home state.
  - 'State Quota' : each state's own counselling cutoffs. Shown to a student
                    only for their HOME state's colleges (see the UI's
                    cross-state filter, mirroring JoSAA's AI/HS/OS logic).

Each output row:
  Institute, State, Seat Type, Academic Program Name, Category,
  Category Label, Closing Rank, Round, rank_space, Source

State cutoffs keep each state's own category codes (per Amogh: show the unique
list per state, student picks their own). 'Category Label' is a human-readable
expansion where we can derive one, else equal to Category.

Input CSVs are expected under --extracted (default: the futures-v2 sibling repo).
This script does NOT parse PDFs — run the parsers first.
"""
from __future__ import annotations
import argparse, csv, json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEFAULT_EXTRACTED = REPO.parent / "futures-v2" / "neet" / "scrape" / "extracted_data"
OUT = REPO / "public" / "data" / "NEETUG" / "NEETUG.json"

# CSV file -> (state full name, is national?)
SOURCES = {
    "neet_aiq_2025_cutoffs.csv":            ("All India", True),
    "neet_gujarat_2025_cutoffs.csv":        ("Gujarat", False),
    "neet_karnataka_2025_r3_cutoffs.csv":   ("Karnataka", False),
    "neet_westbengal_2025_cutoffs.csv":     ("West Bengal", False),
    "neet_mp_2025_cutoffs.csv":             ("Madhya Pradesh", False),
    "neet_punjab_2025_cutoffs.csv":         ("Punjab", False),
    "neet_andhra_2025_r3_cutoffs.csv":      ("Andhra Pradesh", False),
}

# Minimal, safe category-label expansions (extended per state as we learn them).
# Where a code isn't known, the label falls back to the raw code (honest, per Amogh).
CATEGORY_LABELS = {
    # AIQ / central
    "Open": "Open (General)", "OBC": "OBC-NCL", "EWS": "EWS", "SC": "SC", "ST": "ST",
    "Open PwD": "Open (PwD)", "OBC PwD": "OBC-NCL (PwD)", "EWS PwD": "EWS (PwD)",
    "SC PwD": "SC (PwD)", "ST PwD": "ST (PwD)",
    # Gujarat
    "OPEN": "Open (General)", "SE": "SEBC", "EW": "EWS",
}

OUTPUT_COLUMNS = ["Institute", "State", "Seat Type", "Academic Program Name",
                  "Category", "Category Label", "Closing Rank", "Round",
                  "rank_space", "Source"]


def load_csv(path: Path):
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def build(extracted: Path):
    out = []
    for fname, (state, is_national) in SOURCES.items():
        p = extracted / fname
        if not p.exists():
            print(f"  [skip] {fname} not found in {extracted}")
            continue
        rows = load_csv(p)
        for r in rows:
            rank = str(r.get("Closing Rank", "")).strip()
            if not rank.isdigit():
                continue
            cat = (r.get("Category") or "").strip()
            seat_type = "All India" if is_national else "State Quota"
            out.append({
                "Institute": (r.get("Institute") or "").strip(),
                "State": state if not is_national else _infer_state(r),
                "Seat Type": seat_type,
                "Academic Program Name": (r.get("Academic Program Name") or "").strip(),
                "Category": cat,
                "Category Label": CATEGORY_LABELS.get(cat, cat),
                "Closing Rank": int(rank),
                "Round": (r.get("Round") or "").strip(),
                "rank_space": (r.get("rank_space") or "NEET AIR").strip(),
                "Source": fname.replace("neet_", "").replace(".csv", ""),
            })
        print(f"  {fname}: {len(rows)} rows -> {state}")
    return out


def _infer_state(row):
    # AIQ colleges carry their physical state inside the messy Institute string
    # ("... , <State>, <pincode>"). Best-effort; national rows show to everyone
    # regardless, so this is only for display/search.
    inst = row.get("Institute", "")
    parts = [p.strip() for p in inst.split(",")]
    return parts[-2] if len(parts) >= 2 else ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--extracted", type=Path, default=DEFAULT_EXTRACTED)
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()

    print(f"Reading extracted CSVs from {args.extracted}")
    out = build(args.extracted)
    out.sort(key=lambda x: (x["Seat Type"] != "All India", x["Closing Rank"]))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, ensure_ascii=False, indent=0))
    print(f"\nwrote {args.out}: {len(out):,} rows")
    # summary
    from collections import Counter
    print("  seat types:", dict(Counter(r["Seat Type"] for r in out)))
    print("  programs:", dict(Counter(r["Academic Program Name"] for r in out)))
    print("  state-quota states:", sorted({r["State"] for r in out if r["Seat Type"] == "State Quota"}))


if __name__ == "__main__":
    main()

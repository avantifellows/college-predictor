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
import argparse, csv, json, re
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
    "neet_maharashtra_2025_r3_cutoffs.csv": ("Maharashtra", False),
}

# Maharashtra alone splits a seat pool along extra axes (female / home-university
# / EWS-minority). We fold those into a single readable Category string so each
# pool stays a distinct cutoff AND shows as a pickable dropdown option, with no
# special UI. e.g. base "OPEN" + female -> "OPEN (Female)".
def compose_mh_category(row):
    base = (row.get("Category") or "").strip()
    tags = []
    if (row.get("Is Home University") or "").strip() == "Yes":
        tags.append("Home Univ")
    if (row.get("Is EWS Minority") or "").strip() == "Yes":
        tags.append("EWS-Minority")
    if (row.get("Is Female Seat") or "").strip() == "Yes":
        tags.append("Female")
    return f"{base} ({', '.join(tags)})" if tags else base

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

OUTPUT_COLUMNS = ["Institute", "Address", "State", "Seat Type",
                  "Academic Program Name", "Category", "Category Label",
                  "Closing Rank", "Round", "rank_space", "Source"]


def load_csv(path: Path):
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def split_institute(raw):
    """Split a raw institute string into (name, address, state).

    The MCC/AIQ format is 'Name, City,ADDRESS BLOB, State, pincode'. We keep the
    college NAME (+ city) for display and preserve the rest as ADDRESS — we never
    discard the address, just move it out of the name column. Returns
    (name, address, state). State is best-effort from the trailing ', State, pincode'.
    """
    raw = (raw or "").strip()
    # A double comma ('Name,,ADDRESS') means the city slot is empty and the
    # address starts immediately — the name is just the first segment.
    had_empty_city = ",," in raw.replace(", ,", ",,")
    parts = [p.strip() for p in raw.split(",") if p.strip() != ""]
    if len(parts) <= 1:
        return raw, "", ""

    # name = first part; include the 2nd part as city only if it looks like a
    # city (short, title-case-ish, no long digit run, not an all-caps street) and
    # the original didn't signal an empty city slot.
    name = parts[0]
    city = parts[1] if len(parts) >= 2 else ""
    looks_like_city = (
        city
        and not had_empty_city
        and len(city) <= 18
        and not re.search(r"\d{3,}", city)
        # a real city is usually one or two words, not an ALL-CAPS street phrase
        and len(city.split()) <= 2
    )
    if looks_like_city:
        name = f"{parts[0]}, {city}"
        rest = parts[2:]
    else:
        rest = parts[1:]

    # state = the part before a trailing pincode, if present
    state = ""
    if rest:
        tail = rest[-1]
        if re.fullmatch(r"\d{5,6}", tail) and len(rest) >= 2:
            state = rest[-2]
        elif not re.fullmatch(r"\d{5,6}", tail):
            state = tail
    address = ", ".join(rest)
    return name, address, state


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
            # Maharashtra folds its female/home-univ/EWS-minority flags into the
            # category string so each seat pool is a distinct, pickable cutoff.
            if state == "Maharashtra":
                cat = compose_mh_category(r)
            else:
                cat = (r.get("Category") or "").strip()
            seat_type = "All India" if is_national else "State Quota"
            # Prefer the parser-provided clean columns (AIQ splits name/address/
            # state at the parser layer). Fall back to splitting here only if a
            # source CSV still ships a combined Institute blob.
            if r.get("Address") is not None:
                name = (r.get("Institute") or "").strip()
                address = (r.get("Address") or "").strip()
                inferred_state = (r.get("State") or "").strip()
            else:
                name, address, inferred_state = split_institute(r.get("Institute"))
            out.append({
                "Institute": name,
                "Address": address,
                "State": state if not is_national else inferred_state,
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

    # Per-state category list -> the UI's home-state category dropdown. Each state
    # uses its own codes (Amogh: "take the unique list per state, student knows
    # their code"). We show the RAW code as both value and label — no relabeling —
    # so value == label and there is no code/label divergence to mishandle.
    from collections import Counter, defaultdict
    state_cats = defaultdict(set)
    for r in out:
        if r["Seat Type"] == "State Quota" and r["State"] and r["Category"]:
            state_cats[r["State"]].add(r["Category"])
    state_cat_options = {
        st: [{"value": c, "label": c} for c in sorted(cats)]
        for st, cats in state_cats.items()
    }
    cats_path = args.out.parent / "neet_state_categories.json"
    cats_path.write_text(json.dumps(state_cat_options, ensure_ascii=False, indent=2))
    print(f"wrote {cats_path}: {len(state_cat_options)} states")

    print("  seat types:", dict(Counter(r["Seat Type"] for r in out)))
    print("  programs:", dict(Counter(r["Academic Program Name"] for r in out)))
    print("  state-quota states:", sorted({r["State"] for r in out if r["Seat Type"] == "State Quota"}))


if __name__ == "__main__":
    main()

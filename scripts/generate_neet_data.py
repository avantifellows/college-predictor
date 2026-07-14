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
    "neet_telangana_2025_cutoffs.csv":      ("Telangana", False),
    "neet_himachal_2025_r3_cutoffs.csv":    ("Himachal Pradesh", False),
    "neet_kerala_2025_cutoffs.csv":         ("Kerala", False),
}

# Some states split a seat pool along extra axes and expose them as flag columns
# (Maharashtra: female/home-univ/EWS-minority; Telangana: female). We fold any
# present flags into one readable Category string so each pool stays a distinct,
# pickable cutoff with no special UI — e.g. base "OPEN" + female -> "OPEN (Female)".
def compose_category(row):
    # The parser already bakes seat sub-pools (PwD / Orphan / EarMark) into
    # Category. Here we additionally fold the Female / Home-University flags, plus
    # the AIQ "Female Seat only" note, so each pool remains a distinct, pickable
    # cutoff string. (Maharashtra's old "Is EWS Minority" flag was a mislabel of
    # the EarMarking pool — that is now handled in the parser and dropped here.)
    base = (row.get("Category") or "").strip()
    tags = []
    if (row.get("Is Home University") or "").strip() == "Yes":
        tags.append("Home Univ")
    if (row.get("Is Female Seat") or "").strip() == "Yes":
        tags.append("Female")
    note = (row.get("Seat Note") or "").strip()
    if note:
        tags.append(note)
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

# Student-readable round labels. Rounds differ by state and materially affect how
# loose the cutoffs are (mop-up/last-round cutoffs are looser than early rounds),
# so we show this per row in the UI.
ROUND_LABELS = {
    "R1": "Round 1", "R2": "Round 2", "R3": "Round 3",
    "R1+R3": "Rounds 1–3", "P3": "Phase 3", "MopUp": "Mop-up round",
}

OUTPUT_COLUMNS = ["Institute", "Address", "State", "Seat Type",
                  "Academic Program Name", "Category", "Category Label",
                  "Closing Rank", "Round", "rank_space", "Source"]


# Seat-type label canonicalization: parsers emit case variants of the same pool
# ("Christian Minority" vs "CHRISTIAN MINORITY"), which would otherwise split
# into duplicate rows. Map known case/synonym variants to one canonical label;
# leave anything else as the parser wrote it (only trimmed).
_SEAT_TYPE_CANON = {
    "christian minority": "Christian Minority",
    "nri": "NRI Quota",
    "mgmt": "Management Quota",
    "private management quota": "Management Quota",
}


def normalize_seat_type(raw):
    s = (raw or "").strip()
    if not s:
        return "State Quota"
    return _SEAT_TYPE_CANON.get(s.lower(), s)


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
        kept = 0
        for r in rows:
            rank = str(r.get("Closing Rank", "")).strip()
            if not rank.isdigit():
                continue
            # Fold any seat-split flag columns (female / home-univ / EWS-minority)
            # into the category string, so each pool is a distinct pickable cutoff.
            cat = compose_category(r)
            if is_national:
                # The AIQ CSV carries its OWN Seat Type per row (the counselling
                # "Quota"): "All India" is the national merit pool (the cutoff
                # every student compares against — AIIMS Delhi Open=48); the rest
                # (Delhi University / IP University / AMU / ESI / minority /
                # deemed / foreign) are domicile/institution-restricted pools. We
                # keep them ALL, each under its own labeled Seat Type, so the data
                # is complete and honest — the national pool is never contaminated
                # by them because they are separate buckets/rows.
                seat_type = (r.get("Seat Type") or "All India").strip()
            else:
                # Honor the per-row Seat Type the parser emits (Government /
                # Private / Management / NRI / Minority / HP Quota / ...). The
                # old code flattened every state row to "State Quota", which
                # merged distinct pools (a general govt seat and a ~1M-rank NRI
                # seat under one bucket) and mislabeled pay/management seats as
                # if they were cheap state seats. The UI's cross-state filter
                # gates any non-"All India" seat type to the home state, so these
                # labels stay home-state-scoped. Normalize casing so variants
                # like "Christian Minority"/"CHRISTIAN MINORITY" don't split.
                seat_type = normalize_seat_type(r.get("Seat Type"))
            # Prefer parser-provided clean columns: a CSV that ships its own
            # "State" column has already split name/state at the parser layer
            # (AIQ does this now; it has no Address column). Otherwise the
            # Institute cell may still pack name+address+state, so split here.
            if r.get("State") is not None:
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
                # Stored as a STRING to match every other exam's data (the
                # results component's PropTypes expect string); sorted numerically
                # below via _rank_num.
                "Closing Rank": str(int(rank)),
                "_rank_num": int(rank),
                "Round": ROUND_LABELS.get(
                    (r.get("Round") or "").strip(), (r.get("Round") or "").strip()
                ),
                "rank_space": (r.get("rank_space") or "NEET AIR").strip(),
                "Source": fname.replace("neet_", "").replace(".csv", ""),
            })
            kept += 1
        note = f" ({kept} kept as All India merit pool)" if is_national else ""
        print(f"  {fname}: {len(rows)} rows -> {state}{note}")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--extracted", type=Path, default=DEFAULT_EXTRACTED)
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()

    print(f"Reading extracted CSVs from {args.extracted}")
    out = build(args.extracted)
    out.sort(key=lambda x: (x["Seat Type"] != "All India", x["_rank_num"]))
    for row in out:
        del row["_rank_num"]  # helper only; not part of the output schema

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
        # The home-state category dropdown is built ONLY from the state-counselling
        # files (Maharashtra/Gujarat/... — every seat type they carry: State Quota
        # / Government / Management / NRI / HP Quota / ...). AIQ-sourced rows are
        # excluded even when their pool is domicile-restricted (e.g. a Delhi
        # University Quota row with State "Delhi (NCT)"), otherwise AIQ states
        # (Delhi, TN, UP, ...) would leak into the dropdown as phantom home states.
        if (
            not r["Source"].startswith("aiq")
            and r["State"]
            and r["Category"]
        ):
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

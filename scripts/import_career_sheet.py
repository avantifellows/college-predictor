"""
Import Amogh's career sheet (careers.xlsx, Sheet1) into
data-sources/career_streams.csv, the file build_careers_data.py reads.

The Oct 2026 sheet (171 careers) adds RIASEC columns and 64 careers,
including the armed forces, but no longer carries "Entry Exams" or
"Top Colleges". Those two are kept from the current CSV for the careers
that had them; every other column comes from the sheet.

Usage:
  python3 scripts/import_career_sheet.py ~/careers/careers.xlsx
"""
import sys

import pandas as pd

OUT = "data-sources/career_streams.csv"
KEEP_FROM_CSV = ["Entry Exams", "Top Colleges"]
# careers renamed in the sheet (old -> new), so the columns kept from the
# CSV follow them. Oct 2026: Administration split into public and business
# administration; Airline Pilot Training renamed.
RENAMES = {
    "Administration": "Public Administration (Civil Services)",
    "Business Administration (MBA)": "Business Administration (BBA / MBA)",
    "Airline Pilot Training": "Airline Pilot",
}


def main(xlsx):
    sheet = pd.read_excel(xlsx, sheet_name="Sheet1")
    sheet = sheet[sheet["Career Name"].notna()].copy()
    sheet["Career Name"] = sheet["Career Name"].str.strip()
    assert sheet["Career Name"].is_unique, "duplicate career names in the sheet"

    old = pd.read_csv(OUT)
    old["Career Name"] = old["Career Name"].str.strip().replace(RENAMES)
    gone = set(old["Career Name"]) - set(sheet["Career Name"])
    assert not gone, f"careers dropped from the sheet: {sorted(gone)}"

    kept = old.set_index("Career Name")[KEEP_FROM_CSV]
    out = sheet.set_index("Career Name")
    for col in KEEP_FROM_CSV:
        out[col] = kept[col].reindex(out.index)

    # the CSV's column order, then whatever the sheet adds (RIASEC)
    cols = [c for c in old.columns if c != "Career Name"]
    cols += [c for c in out.columns if c not in cols]
    out = out[cols].reset_index()
    out.to_csv(OUT, index=False)
    print(
        f"{len(out)} careers -> {OUT} "
        f"({len(out) - len(old)} new; Entry Exams / Top Colleges kept for "
        f"{kept.index.isin(out['Career Name']).sum()})"
    )


if __name__ == "__main__":
    main(sys.argv[1])

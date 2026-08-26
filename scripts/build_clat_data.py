"""
Build public/data/CLAT/clat_data.json from clat_fact_cutoffs (BigQuery).

App and warehouse must not drift: this reads the same table ask-avantifellows
answers from. Rows the predictor cannot compare on (air_cutoff NULL — the
consortium's '**') and special-quota rows (NCC/CAP/sports/freedom-fighter…,
which almost nobody qualifies for) are excluded here so every dropdown
combination the form offers can actually return results.
"""
import json, os
from google.cloud import bigquery

client = bigquery.Client(project="avantifellows", location="asia-south1")
rows = list(client.query("""
SELECT college, program, category_label, category_code, category_canonical,
       domicile_state, subgroup, is_women_row, is_pwd_row, special_quota,
       seats, air_cutoff, category_rank_cutoff
FROM `avantifellows.external_data_sources.clat_fact_cutoffs`
WHERE air_cutoff IS NOT NULL AND special_quota IS NULL
""").result())

out = []
for r in rows:
    out.append({
        "Institute": r.college,
        "Academic Program Name": r.program,
        "Category": r.category_label,
        "Category Code": r.category_code,
        "Canonical": r.category_canonical or "",
        "Domicile State": r.domicile_state or "",
        "Women Row": bool(r.is_women_row),
        "PwD Row": bool(r.is_pwd_row),
        "Seats": int(r.seats),
        "Closing Rank": str(int(r.air_cutoff)),
        "Category Rank Cutoff": (str(int(r.category_rank_cutoff))
                                 if r.category_rank_cutoff is not None else ""),
        "Year": "2026",
        "List": "5th (final) allotment",
    })
out.sort(key=lambda x: (x["Institute"], x["Academic Program Name"],
                        int(x["Closing Rank"])))
path = os.path.join("public", "data", "CLAT", "clat_data.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1)
states = sorted({x["Domicile State"] for x in out if x["Domicile State"]})
print(f"{len(out)} rows → {path}")
print("domicile states:", states)
print("canonical:", sorted({x['Canonical'] for x in out}))

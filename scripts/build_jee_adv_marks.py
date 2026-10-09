"""
Build public/data/JEE/jee_adv_marks_at_rank.json from BigQuery
jeeadv_fact_marks_at_rank (external_data_sources jeeadv/, the JIC reports'
sections 6.8-6.13): per year and rank list, the aggregate marks (out of
360) at ranks 1, 101, 201, ... — what /api/jee-adv-estimate reads to turn
JEE (Advanced) marks into a category rank.

Usage: python3 scripts/build_jee_adv_marks.py
"""
import json

from google.cloud import bigquery

OUT = "public/data/JEE/jee_adv_marks_at_rank.json"

rows = bigquery.Client(project="avantifellows").query("""
SELECT exam_year, rank_list, rank, marks, max_marks
FROM `avantifellows.external_data_sources.jeeadv_fact_marks_at_rank`
ORDER BY exam_year, rank_list, rank""").result()
out = {"source": "JEE (Advanced) JIC reports 2025-2026, sections 6.8-6.13", "years": {}}
for r in rows:
    y = out["years"].setdefault(str(r.exam_year), {"max_marks": r.max_marks, "lists": {}})
    y["lists"].setdefault(r.rank_list, []).append([r.rank, r.marks])
json.dump(out, open(OUT, "w"), separators=(",", ":"))
print({y: {k: len(v) for k, v in d["lists"].items()} for y, d in out["years"].items()})

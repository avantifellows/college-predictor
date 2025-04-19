import json

MAIN_JSON = "public/data/JEE/OPEN.json" 
NIRF_JSON = "nirf_data.json"   

with open(MAIN_JSON, "r") as f:
    main_data = json.load(f)

with open(NIRF_JSON, "r") as f:
    nirf_data = json.load(f)

nirf_lookup = {
    item["Institute"].strip().lower(): item["rank"]
    for item in nirf_data
}

for entry in main_data:
    key = entry.get("Institute", "").strip().lower()
    entry["nirf_rank"] = nirf_lookup.get(key, None)

with open(MAIN_JSON, "w") as f:
    json.dump(main_data, f, indent=2)

print("✅ Updated", MAIN_JSON, "in‑place with nirf_rank.")

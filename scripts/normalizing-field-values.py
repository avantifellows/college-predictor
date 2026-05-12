from typing import Any
from pathlib import Path
import json
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

LOG_FOLDER = BASE_DIR.parent / "public" / "logs" 
# CREATES FOLDER IF MISSING
LOG_FOLDER.mkdir(parents=True, exist_ok=True)

LOG_FILE = LOG_FOLDER / "field_normalization.log"


def log_changes(field_name:str , old_value:Any , new_value:Any , file_path:str | Path , index:int):
    
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "file path": str(file_path),
        "field": field_name,
        "old_value": old_value,
        "new_value": new_value,
        "record_index": index
    }

    with open(LOG_FILE,"a",encoding="utf-8") as log_file:
        log_file.write(json.dumps(log_entry) + "\n")


def field_normalizer(field_name:str , value_mapping:dict[Any,Any] , folder:str | Path , dry_run:bool = True , preserve_original:bool = True):
    
    folder = Path(folder)

    for files_path in folder.glob("*.json"):
        print("Processing the file : " + files_path.name)

        with open(file=files_path,mode="r",encoding="utf-8") as f :
            data = json.load(f)

        i = -1
        for obj in data:
            i += 1
            # VALIDATION CHECKPOINT
            if field_name not in obj:
                print(f"No such field name for file: {files_path.name} Idx: {i}")
                continue 

            # GETTING VALUE
            old_value = obj.get(field_name)
            if old_value in value_mapping:
                new_value = value_mapping.get(old_value)
                
                if(dry_run):
                    # FOR LOGGING PURPOSE
                    log_changes(field_name, old_value, new_value, files_path, i)
                    continue

                if(preserve_original):
                    obj[f"normalized_{field_name}"] = new_value
                    log_changes(field_name, old_value, new_value, files_path, i)
                    continue 

                obj[field_name] = new_value
                log_changes(field_name, old_value, new_value, files_path, i)

        if not dry_run:
            with open(files_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

    return

def main():

    # CHANGES TO BE MADE. RUN IT ONCE
    DATA_FOLDER = BASE_DIR.parent / "public" / "data" / "GUJCET"

    CATEGORY_MAPPING = {
        "st": "ST",
        "general": "OPEN"
    }

    # DIFFERENT VALUES CAN BE PROVIDED FOR FURTHER DATA CLEANING 
    field_normalizer(
        field_name="category",
        value_mapping=CATEGORY_MAPPING,
        folder=DATA_FOLDER,
        dry_run=True,
        preserve_original=True
    )


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Versions for the hand-kept CSVs in data-sources/ and docs/audits/.

The CSVs are the master copy; the Google sheets they started from are
copies that fall behind. data-sources/VERSIONS.json records, per file, its
version, row count and checksum, and the last version copied back to the
sheet. docs/audits/data_changelog.csv has one row per version: what was
added, which rows and columns were removed, and why.

  python3 scripts/data_versions.py status                 # what changed vs main
  python3 scripts/data_versions.py bump FILE... -m "why"  # record a new version
  python3 scripts/data_versions.py check --base origin/main   # CI
  python3 scripts/data_versions.py synced FILE            # sheet now has it

`check` fails when a file changed without a bump, a row key is empty or
repeated, or a row or column that main has is gone without the changelog
naming it. Removing rows on purpose is fine: bump lists them.

Edit these CSVs with Python's csv module (lineterminator="\\n"), not
pandas, so untouched rows stay byte-for-byte the same.
"""
import argparse
import csv
import datetime
import hashlib
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = "data-sources/VERSIONS.json"
LOG = "docs/audits/data_changelog.csv"
LOG_COLS = ["file", "version", "date", "rows", "added", "changed", "removed",
            "columns_added", "columns_removed", "note"]


def _p(rel):
    return os.path.join(ROOT, rel)


def load_manifest():
    return json.load(open(_p(MANIFEST)))


def save_manifest(m):
    with open(_p(MANIFEST), "w") as fh:
        json.dump(m, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def parse(text):
    rows = list(csv.reader(io.StringIO(text)))
    return (rows[0], rows[1:]) if rows else ([], [])


def keyed(text, key):
    """{key tuple: row tuple} and the header. Raises on empty/duplicate keys."""
    head, rows = parse(text)
    missing = [k for k in key if k not in head]
    if missing:
        raise ValueError(f"key columns not in header: {missing}")
    idx = [head.index(k) for k in key]
    out, bad = {}, []
    for n, r in enumerate(rows, start=2):
        r = r + [""] * (len(head) - len(r))
        k = tuple(r[i] for i in idx)
        if not any(k) or k in out:
            bad.append(f"line {n}: {'empty' if not any(k) else 'repeated'} key {k}")
        out[k] = dict(zip(head, r))
    return out, head, bad


def at_ref(ref, rel):
    try:
        # bytes, decoded here: text=True would turn CRLF into LF
        # (branch_taxonomy.csv), so an unchanged file would differ
        return subprocess.run(["git", "show", f"{ref}:{rel}"], cwd=ROOT,
                              capture_output=True, check=True).stdout.decode("utf-8")
    except subprocess.CalledProcessError:
        return None


def diff(old_text, new_text, key):
    if old_text and not all(k in parse(old_text)[0] for k in key):
        # the base predates the key column (row_id): rows can't be matched,
        # so only the columns are compared
        oh, nh = parse(old_text)[0], parse(new_text)[0]
        return {"added": [], "removed": [], "changed": [],
                "columns_added": [c for c in nh if c not in oh],
                "columns_removed": [c for c in oh if c not in nh]}
    old, oh, _ = keyed(old_text, key) if old_text else ({}, [], [])
    new, nh, _ = keyed(new_text, key)
    added = [k for k in new if k not in old]
    removed = [k for k in old if k not in new]
    shared = [c for c in nh if c in oh]
    changed = [k for k in new if k in old
               and any(new[k][c] != old[k][c] for c in shared)]
    return {"added": added, "removed": removed, "changed": changed,
            "columns_added": [c for c in nh if c not in oh],
            "columns_removed": [c for c in oh if c not in nh]}


def fmt_key(k):
    return " | ".join(k)


def read_log():
    if not os.path.exists(_p(LOG)):
        return []
    return list(csv.DictReader(open(_p(LOG), newline="")))


def cmd_status(args, m):
    for rel, f in m["files"].items():
        text = open(_p(rel), newline="").read()
        base = at_ref(args.base, rel)
        d = diff(base, text, f["key"]) if base is not None else None
        state = "ok" if sha(text) == f["sha256"] else "CHANGED, not bumped"
        sheet = f.get("sheet_synced_version")
        behind = ("" if f.get("sheet") is None else
                  "  sheet version unknown" if sheet is None else
                  f"  sheet has v{sheet}" if sheet == f["version"] else
                  f"  sheet BEHIND (has v{sheet})")
        line = f"{rel}: v{f['version']} {state}{behind}"
        if d and (d["added"] or d["removed"] or d["changed"]
                  or d["columns_added"] or d["columns_removed"]):
            line += (f"\n    vs {args.base}: +{len(d['added'])} rows, "
                     f"-{len(d['removed'])}, ~{len(d['changed'])}"
                     + (f", new columns {d['columns_added']}" if d["columns_added"] else "")
                     + (f", dropped columns {d['columns_removed']}" if d["columns_removed"] else ""))
        print(line)


def cmd_bump(args, m):
    today = datetime.date.today().isoformat()
    log = read_log()
    for rel in args.files:
        rel = os.path.relpath(os.path.abspath(rel), ROOT)
        if rel not in m["files"]:
            sys.exit(f"{rel} is not in {MANIFEST}: add it with its key first")
        f = m["files"][rel]
        text = open(_p(rel), newline="").read()
        _, _, bad = keyed(text, f["key"])
        if bad:
            sys.exit(f"{rel}: " + "; ".join(bad[:5]))
        if sha(text) == f["sha256"]:
            print(f"{rel}: unchanged, still v{f['version']}")
            continue
        d = diff(at_ref(args.base, rel), text, f["key"])
        f["version"] += 1
        f.update(updated=today, rows=text.count("\n") - 1, sha256=sha(text))
        log.append({
            "file": rel, "version": f["version"], "date": today,
            "rows": f["rows"], "added": len(d["added"]),
            "changed": len(d["changed"]),
            "removed": "; ".join(fmt_key(k) for k in d["removed"]),
            "columns_added": "; ".join(d["columns_added"]),
            "columns_removed": "; ".join(d["columns_removed"]),
            "note": args.m,
        })
        print(f"{rel}: v{f['version']} (+{len(d['added'])} -{len(d['removed'])} "
              f"~{len(d['changed'])} vs {args.base})")
    save_manifest(m)
    with open(_p(LOG), "w", newline="") as fh:
        w = csv.DictWriter(fh, LOG_COLS, lineterminator="\n")
        w.writeheader()
        w.writerows(log)


def cmd_check(args, m):
    errors = []
    log = read_log()
    base_m = None
    if args.base:
        bt = at_ref(args.base, MANIFEST)
        base_m = json.loads(bt) if bt else {"files": {}}
    for rel, f in m["files"].items():
        if not os.path.exists(_p(rel)):
            errors.append(f"{rel}: missing")
            continue
        text = open(_p(rel), newline="").read()
        _, _, bad = keyed(text, f["key"])
        errors += [f"{rel}: {b}" for b in bad[:5]]
        if sha(text) != f["sha256"]:
            errors.append(f"{rel}: changed since v{f['version']}. Run "
                          f"python3 scripts/data_versions.py bump {rel} -m '...'")
        if base_m is None:
            continue
        base_text = at_ref(args.base, rel)
        if base_text is None:
            continue
        bv = base_m["files"].get(rel, {}).get("version", 0)
        if base_text != text and f["version"] <= bv:
            errors.append(f"{rel}: differs from {args.base} but is still v{f['version']}")
        d = diff(base_text, text, f["key"])
        mine = [r for r in log if r["file"] == rel and int(r["version"]) > bv]
        logged_rows = {x.strip() for r in mine for x in r["removed"].split(";")}
        logged_cols = {x.strip() for r in mine for x in r["columns_removed"].split(";")}
        lost = [fmt_key(k) for k in d["removed"] if fmt_key(k) not in logged_rows]
        lost_cols = [c for c in d["columns_removed"] if c not in logged_cols]
        if lost:
            errors.append(f"{rel}: {len(lost)} rows in {args.base} are gone and not "
                          f"in {LOG}: {lost[:5]}")
        if lost_cols:
            errors.append(f"{rel}: columns gone and not in {LOG}: {lost_cols}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(1)
    print(f"data versions ok ({len(m['files'])} files)")


def cmd_synced(args, m):
    for rel in args.files:
        rel = os.path.relpath(os.path.abspath(rel), ROOT)
        f = m["files"][rel]
        f["sheet_synced_version"] = f["version"]
        print(f"{rel}: sheet marked as having v{f['version']}")
    save_manifest(m)


def sheet_guard(rel, force=False):
    """For import scripts: refuse to overwrite a CSV from a sheet that hasn't
    had the CSV's latest versions copied in, so a re-import can't undo them."""
    f = load_manifest()["files"][rel]
    have = f.get("sheet_synced_version") or 0  # None: unknown, so guard
    if have >= f["version"] or force:
        return
    notes = [f"  v{r['version']} ({r['date']}): {r['note']}" for r in read_log()
             if r["file"] == rel and int(r["version"]) > have]
    sys.exit(f"{rel} is at v{f['version']} but the sheet only has v{have}. "
             "Copy these changes into the sheet first, run "
             f"`python3 scripts/data_versions.py synced {rel}`, then import "
             "(or pass --force to overwrite them):\n" + "\n".join(notes))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("status")
    s.add_argument("--base", default="origin/main")
    b = sub.add_parser("bump")
    b.add_argument("files", nargs="+")
    b.add_argument("-m", required=True, help="why: what changed and its source")
    b.add_argument("--base", default="HEAD")
    c = sub.add_parser("check")
    c.add_argument("--base")
    y = sub.add_parser("synced")
    y.add_argument("files", nargs="+")
    args = ap.parse_args()
    m = load_manifest()
    {"status": cmd_status, "bump": cmd_bump, "check": cmd_check,
     "synced": cmd_synced}[args.cmd](args, m)


if __name__ == "__main__":
    main()

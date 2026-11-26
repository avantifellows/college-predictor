#!/usr/bin/env python3
"""
Versions for the hand-kept CSVs in data-sources/ and docs/audits/.

The CSVs are the master copy; the Google sheets they started from are
copies that fall behind. data-sources/VERSIONS.json records, per file, its
version, record count, checksum and git blob (the exact content of that
version), and the last version copied back to the sheet.
docs/audits/data_changelog.csv has one row per version: rows added and
changed, rows and columns removed (as JSON lists of keys), and why.

  python3 scripts/data_versions.py status                 # what changed vs main
  python3 scripts/data_versions.py bump FILE... -m "why"  # record a new version
  python3 scripts/data_versions.py check --base REF       # CI
  python3 scripts/data_versions.py synced FILE            # sheet now has it

`bump` compares the file with its last recorded version (the blob in the
manifest), so it is right whether or not that version was committed, and
however many times you bump before committing.

`check` fails when:
  - a file changed without a bump, or a key is blank (any part) or repeated;
  - the manifest's record count or blob doesn't match the file;
  - a version is below the base's, or any version from 1 up has no
    changelog row (or two);
  - the base ref doesn't resolve, or a file the base tracks is untracked now;
  - a row or column the base has is gone and no changelog row for a version
    after the base's names it.

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
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = "data-sources/VERSIONS.json"
LOG = "docs/audits/data_changelog.csv"
LOG_COLS = ["file", "version", "date", "rows", "added", "changed", "removed",
            "columns_added", "columns_removed", "note"]


def _p(rel):
    return os.path.join(ROOT, rel)


def git(*args, data=None):
    return subprocess.run(["git", *args], cwd=ROOT, input=data,
                          capture_output=True, check=True).stdout


def load_manifest():
    return json.load(open(_p(MANIFEST)))


def save_manifest(m):
    with open(_p(MANIFEST), "w") as fh:
        json.dump(m, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def read(rel):
    # bytes, decoded here: text mode would turn CRLF into LF
    # (branch_taxonomy.csv), so an unchanged file would differ
    return open(_p(rel), "rb").read().decode("utf-8")


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def store_blob(text):
    """Write the content into git's object store; its id is the version's
    exact content, readable later with `git cat-file blob`."""
    return git("hash-object", "-w", "--no-filters", "--stdin",
               data=text.encode()).decode().strip()


def blob_of(text):
    return git("hash-object", "--no-filters", "--stdin",
               data=text.encode()).decode().strip()


def blob_text(blob):
    try:
        return git("cat-file", "blob", blob).decode("utf-8")
    except subprocess.CalledProcessError:
        return None


def resolves(ref):
    try:
        git("rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}")
        return True
    except subprocess.CalledProcessError:
        return False


def at_ref(ref, rel):
    try:
        return git("show", f"{ref}:{rel}").decode("utf-8")
    except subprocess.CalledProcessError:
        return None


def parse(text):
    rows = list(csv.reader(io.StringIO(text)))
    return (rows[0], rows[1:]) if rows else ([], [])


def records(text):
    return len(parse(text)[1])


def keyed(text, key):
    """{key tuple: row dict}, the header, and problems (blank or repeated
    keys). Every part of a key must be filled in."""
    head, rows = parse(text)
    missing = [k for k in key if k not in head]
    if missing:
        raise ValueError(f"key columns not in header: {missing}")
    idx = [head.index(k) for k in key]
    out, bad = {}, []
    for n, r in enumerate(rows, start=2):
        r = r + [""] * (len(head) - len(r))
        k = tuple(r[i] for i in idx)
        if not all(x.strip() for x in k):
            bad.append(f"record {n - 1}: blank key part {list(k)}")
        elif k in out:
            bad.append(f"record {n - 1}: repeated key {list(k)}")
        out[k] = dict(zip(head, r))
    return out, head, bad


def diff(old_text, new_text, key):
    """Rows added / removed / changed by key, and columns added / removed.
    If the old text predates the key column (row_id, audit_id), rows are
    compared whole on the shared columns: a base row not found unchanged
    counts as removed (an edited row looks removed), `keyless` says so."""
    oh = parse(old_text)[0] if old_text else []
    nh = parse(new_text)[0]
    cols = {"columns_added": [c for c in nh if c not in oh],
            "columns_removed": [c for c in oh if c not in nh]}
    if old_text and not all(k in oh for k in key):
        shared = [c for c in oh if c in nh]
        proj = lambda h, rows: [tuple((r + [""] * len(h))[h.index(c)] for c in shared)
                                for r in rows]
        have = Counter(proj(nh, parse(new_text)[1]))
        gone = []
        for t in proj(oh, parse(old_text)[1]):
            if have[t]:
                have[t] -= 1
            else:
                gone.append(t)
        return {"added": [], "removed": gone, "changed": [], "keyless": True, **cols}
    old, _, _ = keyed(old_text, key) if old_text else ({}, [], [])
    new, _, _ = keyed(new_text, key)
    shared = [c for c in nh if c in oh]
    return {"added": [k for k in new if k not in old],
            "removed": [k for k in old if k not in new],
            "changed": [k for k in new if k in old
                        and any(new[k][c] != old[k][c] for c in shared)],
            "keyless": False, **cols}


def read_log():
    if not os.path.exists(_p(LOG)):
        return []
    return list(csv.DictReader(open(_p(LOG), newline="")))


def json_list(cell):
    return json.loads(cell) if cell.strip() else []


def rel_of(path, m):
    rel = os.path.relpath(os.path.abspath(path), ROOT)
    if rel not in m["files"]:
        sys.exit(f"{rel} is not tracked in {MANIFEST} (tracked: "
                 + ", ".join(m["files"]) + ")")
    return rel


def cmd_status(args, m):
    ok = resolves(args.base)
    if not ok:
        print(f"({args.base} doesn't resolve: only checksums are compared)")
    for rel, f in m["files"].items():
        text = read(rel)
        state = "ok" if sha(text) == f["sha256"] else "CHANGED, not bumped"
        sheet = f.get("sheet_synced_version")
        behind = ("" if f.get("sheet") is None else
                  "  sheet version unknown" if sheet is None else
                  f"  sheet has v{sheet}" if sheet == f["version"] else
                  f"  sheet BEHIND (has v{sheet})")
        line = f"{rel}: v{f['version']} {state}{behind}"
        base = at_ref(args.base, rel) if ok else None
        if base is not None and base != text:
            d = diff(base, text, f["key"])
            if d["keyless"]:
                line += (f"\n    vs {args.base}: rows can't be matched ({args.base} has no "
                         f"{'/'.join(f['key'])} column); {len(d['removed'])} of its rows "
                         "not found unchanged")
            else:
                line += (f"\n    vs {args.base}: +{len(d['added'])} rows, "
                         f"-{len(d['removed'])}, ~{len(d['changed'])}")
            if d["columns_added"]:
                line += f", new columns {d['columns_added']}"
            if d["columns_removed"]:
                line += f", dropped columns {d['columns_removed']}"
        print(line)


def cmd_bump(args, m):
    today = datetime.date.today().isoformat()
    log = read_log()
    for path in args.files:
        rel = rel_of(path, m)
        f = m["files"][rel]
        text = read(rel)
        _, _, bad = keyed(text, f["key"])
        if bad:
            sys.exit(f"{rel}: " + "; ".join(bad[:5]))
        if sha(text) == f["sha256"]:
            print(f"{rel}: unchanged, still v{f['version']}")
            continue
        # compare with the last recorded version's exact content
        if args.base:
            prev, against = at_ref(args.base, rel), args.base
        else:
            prev, against = blob_text(f.get("blob", "")), f"v{f['version']}"
        if prev is None:
            sys.exit(f"{rel}: the content of v{f['version']} isn't in this "
                     "clone's git objects; pass --base REF (a commit that has it)")
        d = diff(prev, text, f["key"])
        f["version"] += 1
        f.update(updated=today, rows=records(text), sha256=sha(text),
                 blob=store_blob(text))
        log.append({
            "file": rel, "version": f["version"], "date": today,
            "rows": f["rows"], "added": len(d["added"]),
            "changed": len(d["changed"]),
            "removed": json.dumps([list(k) for k in d["removed"]],
                                  ensure_ascii=False) if d["removed"] else "",
            "columns_added": json.dumps(d["columns_added"]) if d["columns_added"] else "",
            "columns_removed": json.dumps(d["columns_removed"]) if d["columns_removed"] else "",
            "note": args.m,
        })
        print(f"{rel}: v{f['version']} (+{len(d['added'])} -{len(d['removed'])} "
              f"~{len(d['changed'])} vs {against})")
    save_manifest(m)
    with open(_p(LOG), "w", newline="") as fh:
        w = csv.DictWriter(fh, LOG_COLS, lineterminator="\n")
        w.writeheader()
        w.writerows(log)


def cmd_check(args, m):
    errors = []
    log = read_log()
    dupes = [k for k, n in Counter((r["file"], int(r["version"])) for r in log).items()
             if n > 1]
    errors += [f"{LOG}: two rows for {rel} v{v}" for rel, v in dupes]
    base_m = None
    if args.base:
        if not resolves(args.base):
            sys.exit(f"--base {args.base} doesn't resolve to a commit")
        bt = at_ref(args.base, MANIFEST)
        base_m = json.loads(bt) if bt else {"files": {}}
        for rel in set(base_m["files"]) - set(m["files"]):
            errors.append(f"{rel}: tracked in {args.base} but not in {MANIFEST}")
    for rel, f in m["files"].items():
        if not os.path.exists(_p(rel)):
            errors.append(f"{rel}: missing")
            continue
        text = read(rel)
        _, _, bad = keyed(text, f["key"])
        errors += [f"{rel}: {b}" for b in bad[:5]]
        if sha(text) != f["sha256"]:
            errors.append(f"{rel}: changed since v{f['version']}. Run "
                          f"python3 scripts/data_versions.py bump {rel} -m '...'")
        elif f.get("blob") != blob_of(text):
            # bump diffs against this blob: a wrong one gives wrong counts
            errors.append(f"{rel}: blob in {MANIFEST} isn't this version's content "
                          f"(expected {blob_of(text)})")
        if f.get("rows") != records(text):
            errors.append(f"{rel}: {MANIFEST} says {f.get('rows')} records, "
                          f"the file has {records(text)}")
        bv = base_m["files"].get(rel, {}).get("version", 0) if base_m else 0
        if f["version"] < bv:
            errors.append(f"{rel}: v{f['version']} is below {args.base}'s v{bv}")
        if f["version"] < 1:
            errors.append(f"{rel}: version must be 1 or more")
        # the whole history: a row for every version from 1 up
        versions = {int(r["version"]) for r in log if r["file"] == rel}
        gaps = sorted(set(range(1, f["version"] + 1)) - versions)
        if gaps:
            errors.append(f"{rel}: no {LOG} row for version(s) {gaps}")
        if base_m is None:
            continue
        base_text = at_ref(args.base, rel)
        if base_text is None:
            continue
        if base_text != text and f["version"] <= bv:
            errors.append(f"{rel}: differs from {args.base} but is still v{f['version']}")
        d = diff(base_text, text, f["key"])
        # removals count only in rows for versions after the base's, up to
        # the current one
        mine = [r for r in log if r["file"] == rel
                and bv < int(r["version"]) <= f["version"]]
        logged = {tuple(k) for r in mine for k in json_list(r["removed"])}
        logged_cols = {c for r in mine for c in json_list(r["columns_removed"])}
        lost = [list(k) for k in d["removed"] if tuple(k) not in logged]
        if lost and d["keyless"]:
            errors.append(f"{rel}: {len(lost)} rows of {args.base} aren't here unchanged "
                          f"({args.base} has no {'/'.join(f['key'])} column, so an edited "
                          f"row looks removed): {lost[:3]}")
        elif lost:
            errors.append(f"{rel}: {len(lost)} rows in {args.base} are gone and not "
                          f"in {LOG}: {lost[:5]}")
        lost_cols = [c for c in d["columns_removed"] if c not in logged_cols]
        if lost_cols:
            errors.append(f"{rel}: columns gone and not in {LOG}: {lost_cols}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(1)
    print(f"data versions ok ({len(m['files'])} files"
          + (f", against {args.base})" if args.base else ")"))


def cmd_synced(args, m):
    for path in args.files:
        rel = rel_of(path, m)
        f = m["files"][rel]
        if not f.get("sheet"):
            sys.exit(f"{rel} has no Google sheet in {MANIFEST}")
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
    b.add_argument("--base", help="compare with this commit's copy instead of "
                                  "the last recorded version")
    c = sub.add_parser("check")
    c.add_argument("--base", help="the commit to compare with (CI: the PR's base)")
    y = sub.add_parser("synced")
    y.add_argument("files", nargs="+")
    args = ap.parse_args()
    m = load_manifest()
    {"status": cmd_status, "bump": cmd_bump, "check": cmd_check,
     "synced": cmd_synced}[args.cmd](args, m)


if __name__ == "__main__":
    main()

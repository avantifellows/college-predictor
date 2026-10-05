// colleges.json, fetched once per visit: the list, a college page and the
// next college page all share the same download.
const DATA_URL = "/data/colleges/colleges.json";
let pending = null;

export function loadColleges() {
  if (!pending) {
    pending = fetch(DATA_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .catch((e) => {
        pending = null; // let the next page try again
        throw e;
      });
  }
  return pending;
}

export const slugify = (t) =>
  String(t)
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// college_id -> page slug. The name, readable in a link
// (/colleges/iit-bombay...); a name shared across states carries the state.
const slugCache = new WeakMap();
export function slugMap(all) {
  if (slugCache.has(all)) return slugCache.get(all);
  const count = {};
  for (const c of all) {
    const k = slugify(c.display_name);
    count[k] = (count[k] || 0) + 1;
  }
  const out = {};
  for (const c of all) {
    const k = slugify(c.display_name);
    out[c.college_id] =
      count[k] > 1 ? `${k}-${slugify(c.state || c.college_id)}` : k;
  }
  slugCache.set(all, out);
  return out;
}

export const collegeHref = (all, c) =>
  `/colleges/${slugMap(all)[c.college_id]}`;

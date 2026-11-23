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
// (/colleges/iit-bombay...); a name shared across states carries the state,
// one shared within a state the district too (Women's Christian College in
// Chennai and in Kanniyakumari), and past that the college id.
const slugParts = (c) => [
  slugify(c.display_name),
  slugify(c.state || c.college_id),
  slugify(c.district || c.college_id),
  slugify(c.college_id),
];
const slugAt = (c, n) => slugParts(c).slice(0, n).join("-");
const slugCache = new WeakMap();
export function slugMap(all) {
  if (slugCache.has(all)) return slugCache.get(all);
  const count = [1, 2, 3].map((n) => {
    const m = {};
    for (const c of all) m[slugAt(c, n)] = (m[slugAt(c, n)] || 0) + 1;
    return m;
  });
  const out = {};
  for (const c of all) {
    const n = [1, 2, 3].find((n) => count[n - 1][slugAt(c, n)] === 1) || 4;
    out[c.college_id] = slugAt(c, n);
    // a card that took over another's (a NIRF-only card replaced by the
    // counselling's): saved stars on the old id still find it
    for (const old of c.former_ids || []) out[old] = out[c.college_id];
  }
  slugCache.set(all, out);
  return out;
}

export const collegeHref = (all, c) =>
  `/colleges/${slugMap(all)[c.college_id]}`;

/** The card at a page slug, or at one of its former slugs (links shared
 * before a card was renamed or replaced). */
export function collegeAtSlug(all, slug) {
  const slugs = slugMap(all);
  return (
    all.find((c) => slugs[c.college_id] === slug) ||
    all.find((c) => (c.former_slugs || []).includes(slug)) ||
    // name and state only: the address two same-named colleges in one
    // state shared before the district told them apart (it opened the first)
    all.find((c) => slugAt(c, 2) === slug) ||
    null
  );
}

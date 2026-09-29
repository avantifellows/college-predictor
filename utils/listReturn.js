// A detail page's "← All colleges" goes back to the list as the student left
// it (search, filters, sort), not to a blank list. The list page records its
// current address; the detail page reads it. Per tab, via sessionStorage.
const key = (list) => `listReturn:${list}`;

export function rememberList(list) {
  try {
    sessionStorage.setItem(
      key(list),
      window.location.pathname + window.location.search
    );
  } catch (e) {
    /* storage blocked: the back link falls back to the bare list */
  }
}

export function listBackHref(list) {
  try {
    const saved = sessionStorage.getItem(key(list));
    if (saved && saved.startsWith(list)) return saved;
  } catch (e) {
    /* ignore */
  }
  return list;
}

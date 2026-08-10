/**
 * Guard: every dropdown option's `label` must equal its `value`.
 *
 * pages/index.js builds the query from `selectedOption.label`, not `.value`,
 * so a friendly label against a different data value silently matches zero
 * rows — the form looks fine and the results are wrong. This has now bitten
 * twice on MHT CET:
 *
 *   Stream    label "Engineering (MHT-CET)" vs value "Engineering"  -> 0 rows
 *   homeState label "Nagpur" vs value "Rashtrasant Tukadoji Maharaj
 *             Nagpur University" -> every Home-University seat dropped, so
 *             students saw only the out-of-region pool
 *
 * Run: node scripts/check_option_labels.mjs
 */
import { readFileSync } from "node:fs";

const full = readFileSync(new URL("../examConfig.js", import.meta.url), "utf8");

// Scoped to mhtCetConfig. Other exams legitimately differ: JoSAA/JEE use short
// lowercase values ("obc_ncl") because getDataPath(category) turns them into a
// filename, and their getFilters compare against the same short form. MHT CET
// filters directly on the values in mhtcet_data.json, so there the label IS the
// lookup key and any divergence is a silent no-match.
const startIdx = full.indexOf("export const mhtCetConfig");
const endIdx = full.indexOf("export const", startIdx + 1);
if (startIdx === -1) {
  console.error("✗ could not find mhtCetConfig in examConfig.js");
  process.exit(1);
}
const src = full.slice(startIdx, endIdx === -1 ? undefined : endIdx);
const lineOffset = full.slice(0, startIdx).split("\n").length - 1;

// Match `{ value: "...", label: "..." }` in either order, tolerating the line
// breaks prettier introduces for long strings.
const pairRe =
  /\{\s*value:\s*\n?\s*"((?:[^"\\]|\\.)*)"\s*,\s*label:\s*\n?\s*"((?:[^"\\]|\\.)*)"\s*,?\s*\}/g;

const mismatches = [];
for (const m of src.matchAll(pairRe)) {
  const [, value, label] = m;
  if (value !== label) {
    const line = lineOffset + src.slice(0, m.index).split("\n").length;
    mismatches.push({ line, value, label });
  }
}

if (mismatches.length === 0) {
  console.log("✓ mhtCetConfig: every {value, label} pair matches");
  process.exit(0);
}

console.error(
  `✗ ${mismatches.length} option(s) whose label differs from its value.\n` +
    `  The query is built from the LABEL, so these match no rows:\n`
);
for (const { line, value, label } of mismatches) {
  console.error(`  examConfig.js:${line}`);
  console.error(`     value: ${JSON.stringify(value)}`);
  console.error(`     label: ${JSON.stringify(label)}\n`);
}
process.exit(1);

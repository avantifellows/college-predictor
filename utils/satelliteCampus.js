// A satellite campus shares its parent's College ID (BIT Patna and Deoghar
// off-campuses under BIT Mesra, IIT Delhi's Abu Dhabi programmes, IIIT
// Vadodara's Diu campus) but not its NIRF return: no rank or salary for it.
// Kept in its own file, with no Node imports, so the browser-side mock
// allotment (components/MockResults.js) applies the same rule as the
// predictor's withCollegeFacts (utils/collegeFacts.js).
//   row: { Institute, "Academic Program Name" }
export const isSatelliteCampus = (row) =>
  /off[- ]campus|international campus/i.test(String(row["Institute"] || "")) ||
  /^abu dhabi campus/i.test(String(row["Academic Program Name"] || ""));

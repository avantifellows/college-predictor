// JEE (Advanced)'s total marks, from the marks-at-rank table the estimate
// uses (public/data/JEE/jee_adv_marks_at_rank.json, one entry per year with
// its max_marks). The total has changed over the years, so it comes from the
// latest year's table, not a hard-coded 360; the estimate uses only years
// marked out of that same total.
import table from "../public/data/JEE/jee_adv_marks_at_rank.json";

const latest = Object.keys(table.years).sort().pop();

export const ADV_MAX_MARKS = table.years[latest].max_marks;

// the years on today's scale, for the marks -> rank estimate
export const advYearsOnScale = Object.values(table.years).filter(
  (y) => y.max_marks === ADV_MAX_MARKS
);

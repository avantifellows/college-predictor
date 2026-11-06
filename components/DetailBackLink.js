import BackLink from "./BackLink";
import { listBackHref } from "../utils/listReturn";

// A detail page's way back (a college, exam or career): BackLink, whose
// fallback is the list as the student last left it (search, filters, sort).
// `label` fixes the text whatever the origin (career pages: "Back").
export default function DetailBackLink({ list, listLabel, label }) {
  return (
    <BackLink href={listBackHref(list)} label={label}>
      {listLabel}
    </BackLink>
  );
}

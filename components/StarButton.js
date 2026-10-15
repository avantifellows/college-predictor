import React from "react";
import { Star } from "lucide-react";
import { useStudentData } from "../utils/studentData";

// Save (star) a college, career, exam or scholarship. Shown only to a
// signed-in student; the saved list lives in Student Corner.
//   compact: icon only, for table rows and cards
export default function StarButton({
  kind,
  id,
  label,
  extra,
  compact = false,
  className = "",
}) {
  const { signedIn, isStarred, toggleStar } = useStudentData();
  if (!signedIn || !id) return null;
  const on = isStarred(kind, id);
  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleStar(kind, id, label, extra);
  };
  const title = on ? "Saved: remove" : "Save";
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        aria-label={`${title} ${label || ""}`.trim()}
        title={title}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-[#fbeeec] ${className}`}
      >
        <Star
          size={17}
          className={on ? "fill-[#B52326] text-[#B52326]" : "text-[#a08a84]"}
        />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
        on
          ? "border-[#B52326] bg-[#fbeeec] text-[#8f2e31]"
          : "border-[#eaded8] bg-white text-[#2f2320] hover:border-[#B52326]"
      } ${className}`}
    >
      <Star size={15} className={on ? "fill-[#B52326] text-[#B52326]" : ""} />
      {on ? "Saved" : "Save"}
    </button>
  );
}

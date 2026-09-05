// Shared style tokens + formatters for the Mock Allotment feature — used by
// components/MockAllotment.js and its standalone sub-pages (pages/mock-
// allotment/choices.js, rounds-history.js) so all three stay visually
// consistent without duplicating the same Tailwind strings three times.

export const formatRank = (rank) =>
  rank == null ? "—" : Number(rank).toLocaleString("en-IN");
export const formatSalary = (value) =>
  value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;

export const cardClass =
  "rounded-xl border border-[#eaded8] bg-white p-4 shadow-sm";
export const inputClass =
  "w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] px-3 py-2 outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]";
export const primaryBtn =
  "rounded-full bg-[#b52326] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#98191c] disabled:cursor-not-allowed disabled:opacity-40";
export const secondaryBtn =
  "rounded-full border border-[#d8c7c1] px-5 py-2 text-sm font-semibold text-[#5b4a45] transition hover:bg-[#f8efec] disabled:cursor-not-allowed disabled:opacity-40";

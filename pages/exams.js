import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ChevronDown, ChevronUp, ExternalLink, Search } from "lucide-react";

// The shared searchable dropdown — same component as every other page.
const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The Exams tab: one row per entrance exam, the answer to "which exams even
// exist for what I want to study". Pure information display — the predictor
// stays the tool for "which college do I get", and rows that have a predictor
// link out to it. Replaced exams (BHU-UET → CUET) are not rows: their names
// are search aliases on the successor, so a student who types the old name
// still lands somewhere useful.

const DATA_URL = "/data/exams/exams.json";
const PAGE_SIZE = 30;

const Dash = () => <span className="text-[#b9a8a2]">—</span>;

const fmtFee = (e) => {
  if (e.fee_number) return `₹${e.fee_number.toLocaleString("en-IN")}`;
  return e.fee_display || null;
};

/** Label/value line used in the expander — left-aligned so long fuzzy
 *  dates ("3rd week of December/ 1st week of February") read as prose. */
const DetailRow = ({ label, children }) => (
  <div className="grid grid-cols-[6.5rem_1fr] gap-2">
    <dt className="text-[#6d5550]">{label}</dt>
    <dd>{children}</dd>
  </div>
);

/** One exam row plus its expandable detail. */
const ExamRow = ({ e, index, expanded, onToggle }) => {
  return (
    <>
      <tr
        className={`border-b border-[#eaded8] text-xs sm:text-sm ${
          index % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
        }`}
      >
        <td className="px-3 py-3 align-top">
          <button
            type="button"
            onClick={onToggle}
            className="text-left font-semibold text-[#332724] hover:text-[#8f2e31]"
          >
            {e.name}
          </button>
          {/* on phones the scope moves to its own column (Amogh) */}
          <div className="mt-0.5 hidden text-[11px] text-[#6d5550] sm:block">
            {e.scope_state && e.scope_type === "University"
              ? `${e.scope} · ${e.scope_state}`
              : e.scope}
          </div>
        </td>
        <td className="px-3 py-3 align-top">
          <div className="flex flex-wrap gap-1">
            {e.streams.map((s) => (
              <span
                key={s}
                className="rounded-full border border-[#e3d1cb] bg-white px-1.5 py-0.5 text-[11px] text-[#6d5550]"
              >
                {s}
              </span>
            ))}
          </div>
        </td>
        <td className="hidden max-w-[16rem] px-3 py-3 align-top lg:table-cell">
          {e.eligibility ? (
            <span className="line-clamp-2 text-[#5b3a34]">{e.eligibility}</span>
          ) : (
            <Dash />
          )}
        </td>
        <td className="px-3 py-3 align-top text-[#5b3a34] sm:hidden">
          {e.scope_type === "University"
            ? e.scope_state || "University"
            : e.scope_type}
        </td>
        <td className="hidden px-3 py-3 align-top tabular-nums sm:table-cell">
          {fmtFee(e) || <Dash />}
        </td>
        <td className="px-3 py-3 align-top">{e.test_month || <Dash />}</td>
        <td className="px-3 py-3 align-top">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-full border border-[#e3d1cb] bg-white px-3 py-1.5 text-xs font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
          >
            {expanded ? "Less" : "More"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-[#eaded8] bg-[#fdf7f2]">
          <td colSpan={7} className="px-4 py-4 sm:px-6">
            {/* the table is min-640px wide; cap the detail text at the
                viewport so phone users read it without side-scrolling */}
            <div className="grid max-w-[calc(100vw-4rem)] gap-6 md:max-w-none md:grid-cols-5">
              <div className="space-y-5 md:col-span-2">
                <div>
                  <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                    Typical timeline
                  </h4>
                  <dl className="space-y-1 text-sm text-[#5b3a34]">
                    {e.forms_out ? (
                      <DetailRow label="Forms out">{e.forms_out}</DetailRow>
                    ) : null}
                    {e.last_date ? (
                      <DetailRow label="Last date">{e.last_date}</DetailRow>
                    ) : null}
                    {e.test_date ? (
                      <DetailRow label="Test">{e.test_date}</DetailRow>
                    ) : null}
                  </dl>
                </div>
                <div>
                  <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                    Test format
                  </h4>
                  <dl className="space-y-1 text-sm text-[#5b3a34]">
                    {e.mode ? (
                      <DetailRow label="Mode">{e.mode}</DetailRow>
                    ) : null}
                    {e.duration ? (
                      <DetailRow label="Duration">{e.duration}</DetailRow>
                    ) : null}
                    {e.marking ? (
                      <DetailRow label="Marking">
                        <span className="tabular-nums">{e.marking}</span>
                      </DetailRow>
                    ) : null}
                    {e.degrees?.length ? (
                      <DetailRow label="Degrees">
                        {e.degrees.join(", ")}
                      </DetailRow>
                    ) : null}
                  </dl>
                </div>
              </div>
              <div className="space-y-5 md:col-span-3">
                {e.eligibility ? (
                  <div>
                    <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                      Eligibility
                    </h4>
                    <p className="text-sm leading-6 text-[#5b3a34]">
                      {e.eligibility}
                    </p>
                  </div>
                ) : null}
                {e.pattern_rows?.length || e.pattern ? (
                  <div>
                    <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                      Paper pattern
                    </h4>
                    {e.pattern_rows?.length ? (
                      <dl className="max-w-md space-y-1 text-sm text-[#5b3a34]">
                        {e.pattern_rows.map(([label, count], i) => (
                          <div
                            key={i}
                            className={`flex justify-between gap-3 ${
                              label === "Total"
                                ? "border-t border-[#e3d1cb] pt-1 font-semibold"
                                : ""
                            }`}
                          >
                            <dt>{label}</dt>
                            <dd className="whitespace-nowrap tabular-nums">
                              {count}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-sm leading-6 text-[#5b3a34]">
                        {e.pattern}
                      </p>
                    )}
                    {e.pattern_note ? (
                      <p className="mt-1.5 text-xs leading-5 text-[#6d5550]">
                        {e.pattern_note}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {e.remarks ? (
                  <p className="text-sm leading-6 text-[#5b3a34]">
                    {e.remarks}
                  </p>
                ) : null}
                {e.replaces?.length ? (
                  <p className="text-xs leading-5 text-[#6d5550]">
                    Replaces:{" "}
                    {e.replaces.map((r) => r.split(" (")[0]).join(", ")}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {e.predictor_exam ? (
                    <Link
                      href={`/?exam=${encodeURIComponent(e.predictor_exam)}`}
                      className="inline-flex items-center gap-1 rounded-full bg-[#B52326] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#8f2e31]"
                    >
                      Check your colleges
                    </Link>
                  ) : null}
                  {e.url ? (
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#6d5550] underline hover:text-[#8f2e31]"
                    >
                      official site <ExternalLink size={12} />
                    </a>
                  ) : null}
                  {e.open_data_id ? (
                    <Link
                      href={`/datasets#${e.open_data_id}`}
                      className="text-xs text-[#6d5550] underline hover:text-[#8f2e31]"
                    >
                      open data
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
};

/** Sortable column header — click toggles asc/desc, third click clears. */
const SortTh = ({ label, col, sort, setSort, className = "" }) => {
  const active = sort.col === col;
  return (
    <th
      className={`cursor-pointer select-none px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#5b1f20] ${className}`}
      onClick={() =>
        setSort(
          active && sort.dir === "desc"
            ? { col: null, dir: "asc" }
            : { col, dir: active ? "desc" : "asc" }
        )
      }
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ChevronUp size={12} />
          ) : (
            <ChevronDown size={12} />
          )
        ) : null}
      </span>
    </th>
  );
};

export default function Exams() {
  const router = useRouter();
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [stream, setStream] = useState("All");
  const [where, setWhere] = useState("All");
  const [sort, setSort] = useState({ col: null, dir: "asc" });
  const [expandedId, setExpandedId] = useState(null);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setAll)
      .catch(() => setError("Could not load the exam list right now."));
  }, []);

  // arriving from a college's exam chip: /exams?q=JEE Advanced
  useEffect(() => {
    if (router.isReady && router.query.q) setQ(String(router.query.q));
  }, [router.isReady, router.query.q]);

  const streams = useMemo(
    () => ["All", ...Array.from(new Set(all.flatMap((e) => e.streams))).sort()],
    [all]
  );
  const wheres = useMemo(() => {
    const set = new Set(all.map((e) => e.scope_type));
    for (const e of all) if (e.scope_state) set.add(e.scope_state);
    set.delete("All India");
    set.delete("University");
    return ["All", "All India", ...Array.from(set).sort(), "University"];
  }, [all]);

  const filtered = useMemo(() => {
    const raw = q.trim().toLowerCase();
    let out = all.filter((e) => {
      if (stream !== "All" && !e.streams.includes(stream)) return false;
      // a state in the Where filter also matches university exams based
      // there (AGRICET is ANGRAU's, but it lives in Andhra Pradesh)
      if (where !== "All" && e.scope_type !== where && e.scope_state !== where)
        return false;
      if (!raw) return true;
      const hay = [
        e.name,
        e.acronym,
        e.scope,
        e.scope_state || "",
        ...(e.aliases || []),
        ...e.streams,
        ...(e.degrees || []),
      ]
        .join(" ")
        .toLowerCase();
      return raw.split(/\s+/).every((w) => hay.includes(w));
    });
    if (sort.col) {
      const key =
        sort.col === "fee"
          ? (e) => e.fee_number ?? Infinity
          : (e) => e.test_month_n ?? Infinity;
      out = [...out].sort((a, b) =>
        sort.dir === "asc" ? key(a) - key(b) : key(b) - key(a)
      );
    }
    return out;
  }, [all, q, stream, where, sort]);

  useEffect(() => setShown(PAGE_SIZE), [q, stream, where, sort]);

  const th =
    "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#5b1f20]";

  return (
    <>
      <Head>
        <title>Entrance Exams - Avanti Fellows</title>
        <meta
          name="description"
          content="Every undergraduate entrance exam in India: streams, eligibility, application fee, and typical timeline."
        />
      </Head>
      <div className="min-h-screen bg-[#faf5ef] px-3 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#eee1d7] bg-white p-4 shadow-sm sm:p-8">
          <h1 className="text-center text-3xl font-bold text-[#332724]">
            Entrance Exams
          </h1>
          <p className="mt-2 text-center text-sm text-[#6d5550]">
            Dates are the typical cycle, not this year&apos;s. Always confirm on
            the official sites.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_13rem_13rem]">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b9a8a2]"
              />
              {/* sized to match the Dropdown control (48px, same border/bg) */}
              <input
                type="text"
                value={q}
                onChange={(ev) => setQ(ev.target.value)}
                placeholder="Search an exam, stream, or state"
                className="h-12 w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] pl-9 pr-3 text-[#2f2320] shadow-sm outline-none transition placeholder:text-[#7a6159] focus:border-[#b52326] focus:ring-[3px] focus:ring-[#b52326]/[0.12]"
              />
            </div>
            <div>
              <Dropdown
                options={streams.map((s) => ({
                  value: s,
                  label: s === "All" ? "All streams" : s,
                }))}
                selectedValue={stream}
                onChange={(o) => setStream(o.value)}
                className="w-full"
                hideValueWhileSearching
              />
            </div>
            <div>
              <Dropdown
                options={wheres.map((w) => ({
                  value: w,
                  label:
                    w === "All"
                      ? "Anywhere"
                      : w === "University"
                      ? "University-run"
                      : w,
                }))}
                selectedValue={where}
                onChange={(o) => setWhere(o.value)}
                className="w-full"
                hideValueWhileSearching
              />
            </div>
          </div>

          {error ? (
            <p className="py-10 text-center text-sm text-[#8f2e31]">{error}</p>
          ) : all.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#6d5550]">
              Loading exams…
            </p>
          ) : (
            <>
              <p className="mt-4 text-sm text-[#6d5550]">
                Showing {Math.min(shown, filtered.length)} of {filtered.length}{" "}
                exams
              </p>
              <div className="mt-2 overflow-x-auto">
                {/* table-fixed: expanding a row must not reflow the columns */}
                <table className="w-full min-w-[560px] table-fixed border-collapse sm:min-w-[640px]">
                  <thead>
                    <tr className="border-b-2 border-[#e3d1cb] bg-[#f8efec]">
                      <th className={`${th} w-[30%] sm:w-[34%] lg:w-[26%]`}>
                        Exam
                      </th>
                      <th className={`${th} w-[24%] sm:w-[22%] lg:w-[15%]`}>
                        Streams
                      </th>
                      <th className={`${th} hidden lg:table-cell lg:w-[24%]`}>
                        Eligibility
                      </th>
                      <th className={`${th} w-[16%] sm:hidden`}>Where</th>
                      <SortTh
                        label="Application fee"
                        col="fee"
                        sort={sort}
                        setSort={setSort}
                        className="hidden sm:table-cell sm:w-[16%] lg:w-[13%]"
                      />
                      <SortTh
                        label="Test month"
                        col="month"
                        sort={sort}
                        setSort={setSort}
                        className="w-[16%] sm:w-[15%] lg:w-[12%]"
                      />
                      <th className={`${th} w-[14%] sm:w-[13%] lg:w-[10%]`} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, shown).map((e, i) => (
                      <ExamRow
                        key={e.exam_id}
                        e={e}
                        index={i}
                        expanded={expandedId === e.exam_id}
                        onToggle={() =>
                          setExpandedId(
                            expandedId === e.exam_id ? null : e.exam_id
                          )
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > shown ? (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShown(shown + PAGE_SIZE)}
                    className="rounded-full border border-[#e3d1cb] bg-white px-4 py-2 text-sm font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
                  >
                    Show more
                  </button>
                </div>
              ) : null}
              {filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[#6d5550]">No exams match.</p>
                  {stream !== "All" || where !== "All" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStream("All");
                        setWhere("All");
                      }}
                      className="mt-3 rounded-full border border-[#e3d1cb] bg-white px-4 py-2 text-sm font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ChevronDown, ChevronRight, ChevronUp, Search } from "lucide-react";
import BackLink from "../components/BackLink";
import { Dash, fmtFee, loadExams } from "../components/examShared";
import { rememberList } from "../utils/listReturn";
import { markForward } from "../utils/navHistory";
import { matchesQuery, plainText } from "../utils/search";
import useUrlParams from "../utils/useUrlParams";

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

const PAGE_SIZE = 30;

/** One exam in the list; the whole row opens its page. */
const ExamRow = ({ e, index, onOpen }) => (
  <tr
    onClick={onOpen}
    className={`cursor-pointer border-b border-[#eaded8] text-xs transition hover:bg-[#fbeeec] sm:text-sm ${
      index % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
    }`}
  >
    <td className="px-3 py-3 align-top">
      <Link
        href={`/exams/${e.exam_id}`}
        onClick={(ev) => ev.stopPropagation()}
        className="font-semibold text-[#332724] hover:text-[#8f2e31]"
      >
        {e.name}
      </Link>
      {/* on phones the scope moves to its own column (Amogh) */}
      <div className="mt-0.5 hidden text-[11px] text-[#6d5550] sm:block">
        {e.scope_state && e.scope_type === "University"
          ? `${e.scope} · ${e.scope_state}`
          : e.scope}
      </div>
    </td>
    <td className="px-3 py-3 align-top">
      <div className="flex flex-wrap gap-1">
        {e.streams.map((st) => (
          <span
            key={st}
            className="rounded-full border border-[#e3d1cb] bg-white px-1.5 py-0.5 text-[11px] text-[#6d5550]"
          >
            {st}
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
    <td className="px-2 py-3 align-top text-[#b9a8a2]">
      <ChevronRight size={18} />
    </td>
  </tr>
);

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
  // filters, sort and the opened card live in the URL: shareable, and Back
  // returns to them. A college's exam chip links in as /exams?q=JEE Advanced.
  const [params, setParam, urlReady] = useUrlParams({
    q: "",
    stream: "All",
    where: "All",
    sort: "",
    open: "",
  });
  const { q, stream, where } = params;
  const setQ = (v) => setParam("q", v);
  const setStream = (v) => setParam("stream", v);
  const setWhere = (v) => setParam("where", v);
  // sort=deadline / sort=-deadline
  const sort = useMemo(
    () =>
      params.sort
        ? {
            col: params.sort.replace(/^-/, ""),
            dir: params.sort.startsWith("-") ? "desc" : "asc",
          }
        : { col: null, dir: "asc" },
    [params.sort]
  );
  const setSort = (v) => {
    const next = typeof v === "function" ? v(sort) : v;
    setParam(
      "sort",
      next.col ? `${next.dir === "desc" ? "-" : ""}${next.col}` : ""
    );
  };
  const arrivedQ = useRef(null);
  useEffect(() => {
    if (urlReady && arrivedQ.current === null) arrivedQ.current = q;
  }, [urlReady, q]);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    loadExams()
      .then(setAll)
      .catch(() => setError("Could not load the exam list right now."));
  }, []);

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
      return matchesQuery(
        [
          e.name,
          e.acronym,
          e.scope,
          e.scope_state || "",
          ...(e.aliases || []),
          ...e.streams,
          ...(e.degrees || []),
        ],
        raw
      );
    });
    // an exact acronym hit ("IAT", "KCET") leads the list
    const exact = (e) =>
      plainText(e.acronym) === plainText(raw) ||
      (e.aliases || []).some((a) => plainText(a) === plainText(raw));
    if (raw) out = [...out].sort((a, b) => exact(b) - exact(a));
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

  // A link that names one exam (a college's exam chip: /exams?q=JEE Advanced)
  // or an older ?open= link goes straight to that exam's page: the query
  // lands on one exam, or on exactly one exact-acronym match. Replace, so
  // Back skips this hop.
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current || !urlReady || !all.length) return;
    let pick = null;
    if (params.open) {
      pick = all.find((x) => x.exam_id === params.open) || null;
    } else if (q && q === arrivedQ.current && filtered.length) {
      const raw = plainText(q);
      const exacts = filtered.filter(
        (e) =>
          plainText(e.acronym) === raw ||
          (e.aliases || []).some((a) => plainText(a) === raw)
      );
      pick =
        filtered.length === 1
          ? filtered[0]
          : exacts.length === 1
          ? exacts[0]
          : null;
    }
    if (pick) {
      redirected.current = true;
      markForward(`/exams/${pick.exam_id}`);
      router.replace(`/exams/${pick.exam_id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, all, filtered, params.open, q]);

  // so an exam page's "All exams" comes back to this list as it is; not
  // while the list is about to forward (/exams?q=NEET-UG), or the back link
  // would point at the hop and bounce straight back
  useEffect(() => {
    if (urlReady && all.length && !redirected.current) rememberList("/exams");
  }, [urlReady, router.asPath, all.length]);

  useEffect(() => setShown(PAGE_SIZE), [q, stream, where, sort]);

  const th =
    "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#5b1f20]";

  return (
    <>
      <Head>
        <title>Entrance Exams - Futures</title>
        <meta
          name="description"
          content="Every undergraduate entrance exam in India: streams, eligibility, application fee, and typical timeline."
        />
      </Head>
      <div className="min-h-screen px-3 py-6 sm:px-6">
        <div className="mx-auto mb-3 max-w-6xl">
          <BackLink />
        </div>
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
                        onOpen={() => router.push(`/exams/${e.exam_id}`)}
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

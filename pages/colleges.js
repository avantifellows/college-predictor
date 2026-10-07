import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ChevronRight, Info, Search } from "lucide-react";
import { matchesQuery, plainText } from "../utils/search";
import useUrlParams from "../utils/useUrlParams";
import BackLink from "../components/BackLink";
import {
  Dash,
  NirfCell,
  fmtSalary,
  nirfSortRank,
} from "../components/collegeShared";
import { loadColleges, slugMap, slugify } from "../utils/collegesData";
import { rememberList } from "../utils/listReturn";
import { markForward } from "../utils/navHistory";

// The app's shared react-select wrapper — searchable, so a 30-state list can be
// narrowed by typing. A native <select> only jumps on the first letter, which is
// unusable at this length.
const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The College tab: one row per college with the basics a student scans for
// (where, NIRF, salary, placed); the whole row opens that college's own page
// (/colleges/<name>) with everything else. Not a cutoff tool: that is the
// College Predictor's job.

const PAGE_SIZE = 25;
/** One college in the list; the whole row opens its page. */
const CollegeListRow = ({ c, index, href, onOpen }) => {
  const pl = c.placement;
  return (
    <tr
      onClick={onOpen}
      className={`cursor-pointer border-b border-[#eaded8] text-xs transition hover:bg-[#fbeeec] sm:text-sm ${
        index % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
      }`}
    >
      <td className="px-3 py-3 align-top">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-[#332724] hover:text-[#8f2e31]"
        >
          {c.display_name}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6d5550]">
          {c.entrance_exams.map((e) => (
            <span
              key={e}
              className="rounded-full border border-[#e3d1cb] bg-white px-1.5 py-0.5"
            >
              {e}
            </span>
          ))}
          {c.ownership ? (
            <span
              className={`rounded-full px-1.5 py-0.5 font-semibold ${
                c.ownership === "Private"
                  ? "bg-[#FFB763]/20 text-[#8a5209]"
                  : "bg-[#1F9E8F]/10 text-[#166f64]"
              }`}
            >
              {c.ownership}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3 align-top text-[#5b3a34]">
        {c.state ? (
          <>
            {c.district ? `${c.district}, ` : ""}
            {c.state}
          </>
        ) : (
          <Dash />
        )}
      </td>
      <td className="px-3 py-3 align-top tabular-nums">
        {c.nirf ? <NirfCell nirf={c.nirf} /> : <Dash />}
      </td>
      <td className="px-3 py-3 align-top tabular-nums">
        {pl?.median_salary ? (
          <span className="font-semibold text-[#332724]">
            {fmtSalary(pl.median_salary)}
          </span>
        ) : (
          <Dash />
        )}
      </td>
      <td className="px-3 py-3 align-top tabular-nums">
        {pl?.percentage_with_outcome != null ? (
          `${pl.percentage_with_outcome}%`
        ) : (
          <Dash />
        )}
      </td>
      <td className="px-2 py-3 align-top text-[#b9a8a2]">
        <ChevronRight size={18} />
      </td>
    </tr>
  );
};

const SORTS = {
  nirf: {
    label: "NIRF rank",
    // band-only colleges sort at the band's top ("101-150" -> 101)
    fn: (a, b) => nirfSortRank(a) - nirfSortRank(b),
  },
  salary: {
    label: "Median salary",
    fn: (a, b) =>
      (b.placement?.median_salary ?? -1) - (a.placement?.median_salary ?? -1),
  },
  fees: {
    label: "Fees: low to high",
    fn: (a, b) => (a.fees?.annual_fee ?? 9e9) - (b.fees?.annual_fee ?? 9e9),
  },
  placed: {
    label: "% placed",
    // matches the column: the combined placed-or-higher-studies rate
    fn: (a, b) =>
      (b.placement?.percentage_with_outcome ?? -1) -
      (a.placement?.percentage_with_outcome ?? -1),
  },
  name: {
    label: "Name (A–Z)",
    fn: (a, b) => a.display_name.localeCompare(b.display_name),
  },
};

const Colleges = () => {
  const router = useRouter();
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  // Filters live in the URL, so a filtered list or an opened college can be
  // shared and Back returns to it. Links in use the same keys: a career's
  // college link (/colleges?q=IIT Delhi), an exam card's "colleges accepting
  // it" (/colleges?exam=JEE Advanced), a career's college list (?career=).
  // stream = what the college teaches (Engineering / Pharmacy / …); medical
  // rows carry no discipline badge (the NEET-UG chip says it), so they get
  // their stream here. college = the opened card.
  const [params, setParam, urlReady] = useUrlParams({
    q: "",
    state: "All",
    exam: "All",
    stream: "All",
    career: "",
    sort: "nirf",
    type: "public",
    college: "",
  });
  const { q, state, exam, stream, career } = params;
  const setQ = (v) => setParam("q", v);
  const setState = (v) => setParam("state", v);
  const setExam = (v) => setParam("exam", v);
  const setStream = (v) => setParam("stream", v);
  const setCareer = (v) => setParam("career", v || "");
  // public vs private, public first; government-aided counts with public
  // (government-set fees on its aided seats) and the label says so.
  // ?type=private / ?type=all; public is the default and stays off the URL.
  const type = params.type;
  const setType = (v) => setParam("type", v);
  // a link that names a college, career or exam must not land on an empty
  // list because the college is private: those arrivals start on all
  const typeChecked = useRef(false);
  useEffect(() => {
    if (!urlReady || typeChecked.current) return;
    typeChecked.current = true;
    if (router.query.type) return;
    if (q || params.college || career || exam !== "All") setType("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady]);
  const streamsOf = (c) =>
    c.disciplines?.length
      ? c.disciplines
      : String(c.counselling).startsWith("MCC")
      ? ["Medicine"]
      : [];
  const sortKey = SORTS[params.sort] ? params.sort : "nirf";
  const setSortKey = (v) => setParam("sort", v);
  // Same pattern as the predictor's salary ⓘ: a positioned card, not the
  // browser's native title box (which renders late, unstyled, and turns the
  // cursor into a question mark).
  const [placedTip, setPlacedTip] = useState(null);
  const showPlacedTip = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPlacedTip({ top: rect.bottom + 10, left: rect.right - 280 });
  };
  const hidePlacedTip = () => setPlacedTip(null);
  // the search the student ARRIVED with; typing a search that narrows to
  // one college doesn't jump to its page
  const arrivedQ = useRef(null);
  useEffect(() => {
    if (urlReady && arrivedQ.current === null) arrivedQ.current = q;
  }, [urlReady, q]);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    loadColleges()
      .then(setAll)
      .catch(() => setError("Could not load the college list right now."));
  }, []);
  const slugs = useMemo(() => (all.length ? slugMap(all) : {}), [all]);
  const hrefOf = (c) => `/colleges/${slugs[c.college_id]}`;

  const states = useMemo(
    () => [
      "All",
      ...Array.from(new Set(all.map((c) => c.state).filter(Boolean))).sort(),
    ],
    [all]
  );
  const streams = useMemo(
    () => [
      "All",
      ...Array.from(new Set(all.flatMap((c) => streamsOf(c)))).sort(),
    ],
    [all]
  );

  const exams = useMemo(
    () => [
      "All",
      ...Array.from(new Set(all.flatMap((c) => c.entrance_exams))).sort(),
    ],
    [all]
  );

  const filtered = useMemo(() => {
    // shared site-wide search: punctuation-blind, word by word, and aware
    // of short forms (iiser, nit trichy, srcc) — see utils/search.js
    const raw = q.trim();
    const out = all.filter((c) => {
      if (state !== "All" && c.state !== state) return false;
      if (exam !== "All" && !c.entrance_exams.includes(exam)) return false;
      if (stream !== "All" && !streamsOf(c).includes(stream)) return false;
      if (
        type === "public" &&
        !["Public", "Government-aided"].includes(c.ownership)
      )
        return false;
      if (type === "private" && c.ownership !== "Private") return false;
      if (career && !c.programs.list.some((p) => p.career_id === career))
        return false;
      if (!raw) return true;
      // Search the branch list too: "who teaches Aerospace" is a real question,
      // and the branch names are the richest text we hold.
      return matchesQuery(
        [
          c.display_name,
          c.state || "",
          c.district || "",
          ...c.programs.list.map((p) => p.branch),
        ],
        raw
      );
    });
    // a query that names a college ("iit bombay") shows only name/place
    // matches; branch text is searched only when nothing matches by name
    // ("aerospace") — otherwise a branch mentioning Bombay leaks in
    if (raw) {
      // a link from a predictor row carries the card's exact name: show
      // that card alone ("Hindu College" also matches "Hindu College of
      // Engineering", "BITS Pilani, Pilani Campus" all three campuses)
      const exact = out.filter(
        (c) => plainText(c.display_name) === plainText(raw)
      );
      if (exact.length === 1) return exact;
      const byName = out.filter((c) =>
        matchesQuery([c.display_name, c.state || "", c.district || ""], raw)
      );
      if (byName.length) return byName.sort(SORTS[sortKey].fn);
    }
    return out.sort(SORTS[sortKey].fn);
  }, [all, q, state, exam, stream, type, career, sortKey]);

  // A link that names one college (a predictor result, a career's college,
  // a compare header: /colleges?q=IIT Delhi) or an older ?college= link goes
  // straight to that college's page. Replace, so Back skips this hop.
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current || !urlReady || !all.length) return;
    let target = null;
    if (params.college) {
      target = all.find(
        (c) =>
          slugs[c.college_id] === params.college ||
          slugify(c.display_name) === params.college
      );
    } else if (q && q === arrivedQ.current && filtered.length === 1) {
      target = filtered[0];
    }
    if (target) {
      redirected.current = true;
      markForward(hrefOf(target));
      router.replace(hrefOf(target));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, all, filtered, params.college, q]);

  // so a college page's "All colleges" comes back to this list as it is;
  // not while the list is about to forward (/colleges?q=NALSAR), or the
  // back link would point at the hop and bounce straight back
  useEffect(() => {
    if (urlReady && all.length && !redirected.current)
      rememberList("/colleges");
  }, [urlReady, router.asPath, all.length]);

  useEffect(
    () => setShown(PAGE_SIZE),
    [q, state, exam, stream, type, career, sortKey]
  );

  const th = "px-3 py-2 text-left text-xs font-semibold text-[#5b1f20]";

  return (
    <>
      <Head>
        <title>Colleges - Futures</title>
        <meta
          name="description"
          content="Engineering and medical colleges — location, NIRF rank, MBBS seats, placement outcomes, and the programs each one offers."
        />
      </Head>

      <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4">
        <div className="mb-3">
          <BackLink />
        </div>
        <div className="rounded-2xl border border-[#eaded8] bg-white p-4 shadow-sm sm:p-6">
          <h1 className="text-center text-2xl font-bold text-[#332724] sm:text-3xl">
            Colleges
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-[#6d5550]">
            Closing ranks here are indicative and open-category. For full
            cutoffs, use the{" "}
            <Link
              href="/predictor"
              className="font-semibold text-[#8f2e31] hover:underline"
            >
              College Predictor
            </Link>
            .
          </p>
          {/* ── controls ─────────────────────────────────────────────── */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b9a8a2]"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a college, city, or branch"
                className="w-full rounded-xl border border-[#d8c7c1] bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
              />
            </div>
            <div>
              <Dropdown
                className="text-sm"
                options={states.map((v) => ({
                  value: v,
                  label: v === "All" ? "All states" : v,
                }))}
                selectedValue={state}
                onChange={(o) => setState(o ? o.value : "All")}
                hideValueWhileSearching
              />
            </div>
            {/* the shared control, not a native select — the browser's gray
                option menu doesn't belong in this palette */}
            <div className="min-w-[13rem]">
              <Dropdown
                options={Object.entries(SORTS).map(([k, v]) => ({
                  value: k,
                  label: `Sort: ${v.label}`,
                }))}
                selectedValue={sortKey}
                onChange={(o) => setSortKey(o.value)}
              />
            </div>
          </div>

          {career ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setCareer(null);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#fbeeec] px-3 py-1 text-sm font-semibold text-[#8f2e31]"
              >
                Offering {career.replace(/-/g, " ")} <span aria-hidden>×</span>
              </button>
            </div>
          ) : null}
          {/* a 14-exam chip row was clutter — two dropdowns instead */}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Dropdown
              options={[
                { value: "public", label: "Public or govt-aided" },
                { value: "private", label: "Private" },
                { value: "all", label: "All colleges" },
              ]}
              selectedValue={type}
              onChange={(o) => setType(o.value)}
              isSearchable={false}
            />
            <Dropdown
              options={streams.map((x) => ({
                value: x,
                label: x === "All" ? "Any stream" : x,
              }))}
              selectedValue={stream}
              onChange={(o) => setStream(o.value)}
              isSearchable={false}
            />
            <Dropdown
              options={exams.map((x) => ({
                value: x,
                label: x === "All" ? "Any entrance test" : x,
              }))}
              selectedValue={exam}
              onChange={(o) => setExam(o.value)}
              hideValueWhileSearching
            />
          </div>

          {error ? (
            <p className="py-10 text-center text-sm text-red-600">{error}</p>
          ) : !all.length ? (
            <p className="py-10 text-center text-sm text-[#6d5550]">
              Loading colleges…
            </p>
          ) : (
            <>
              <p className="mt-4 text-sm text-[#5b3a34]">
                Showing {Math.min(shown, filtered.length)} of {filtered.length}{" "}
                {filtered.length === 1 ? "college" : "colleges"}
              </p>

              <div className="mt-2 overflow-x-auto rounded-xl border border-[#eaded8]">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead className="bg-[#f8efec]">
                    <tr>
                      <th className={th}>College</th>
                      <th className={th}>Location</th>
                      <th className={th}>NIRF</th>
                      <th className={th}>Median salary</th>
                      <th className={th}>
                        <span className="inline-flex items-center gap-1.5">
                          Placed
                          <button
                            type="button"
                            onMouseEnter={showPlacedTip}
                            onMouseLeave={hidePlacedTip}
                            onFocus={showPlacedTip}
                            onBlur={hidePlacedTip}
                            className="inline-flex items-center text-[#a4837b] hover:text-[#8f2e31]"
                            aria-label="What the Placed percentage means"
                          >
                            {/* the Info glyph is already a circled i — no
                                border ring around it, or it doubles up */}
                            <Info size={14} />
                          </button>
                        </span>
                      </th>
                      <th className={th} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, shown).map((c, i) => (
                      <CollegeListRow
                        key={c.college_id}
                        c={c}
                        index={i}
                        href={hrefOf(c)}
                        onOpen={() => router.push(hrefOf(c))}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {shown < filtered.length ? (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShown((s) => s + PAGE_SIZE)}
                    className="rounded-full border border-[#8f2e31] px-5 py-2 text-sm font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
                  >
                    Show {Math.min(PAGE_SIZE, filtered.length - shown)} more
                  </button>
                </div>
              ) : null}

              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#6d5550]">
                  No colleges match. Try clearing the state or entrance-test
                  filter.
                  {type === "public" ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => setType("all")}
                        className="font-semibold text-[#8f2e31] hover:underline"
                      >
                        Include private colleges
                      </button>
                    </>
                  ) : null}
                </p>
              ) : null}

              <p className="mt-6 border-t border-[#eaded8] pt-3 text-[11px] leading-5 text-[#6d5550]">
                Sources: AISHE 2024-25 (identity) · NIRF 2025 (rank, placement)
                · NAAC (accreditation) · JoSAA 2025 (branches) · NMC 2024-25
                (medical colleges, MBBS seats) · State CET Cell 2025
                (Maharashtra colleges, MHT-CET ranks). A dash means we do not
                have that figure.
              </p>
            </>
          )}
        </div>
      </div>
      {placedTip && (
        <div
          className="pointer-events-none fixed z-50 w-72 rounded-xl border border-[#decac3] bg-white p-3 text-left text-xs font-normal leading-5 text-[#5b3a34] shadow-lg"
          style={{
            top: `${Math.max(placedTip.top, 12)}px`,
            left: `${Math.max(placedTip.left, 12)}px`,
          }}
        >
          Share of graduates who got a job or joined higher studies. Open a
          college for the split.
        </div>
      )}
    </>
  );
};

export default Colleges;

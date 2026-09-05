import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Plus, X } from "lucide-react";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// College & Course Comparison — the standalone's tool, rebuilt on hard data
// only. No priority-ranking wizard and no scores for campus culture or
// alumni pull: those would be our opinion, not data. Every row is a fact
// with a source and a year; the greener cell just marks the better NUMBER,
// the decision stays with the student.

const DATA_URL = "/data/colleges/colleges.json";
const MAX_OPTIONS = 3;

const fmtMoney = (n) =>
  n == null
    ? null
    : n >= 100000
    ? `₹${(n / 100000).toFixed(1)} L`
    : `₹${Math.round(n / 1000)}k`;

const pct = (n) => (n == null ? null : `${n}%`);

// one comparison row: label, how to read the value, which direction wins
const ROWS = [
  {
    key: "closing",
    label: "Closing rank",
    sub: "JoSAA, open category",
    get: (o) => o.program?.indicative_closing_rank ?? null,
    fmt: (v) => v.toLocaleString("en-IN"),
    betterLow: true,
  },
  {
    key: "nirf",
    label: "NIRF rank",
    sub: (o) =>
      o.college.nirf?.ranking_year
        ? `Engineering, ${o.college.nirf.ranking_year}`
        : null,
    get: (o) => o.college.nirf?.engineering_rank ?? null,
    fmt: (v) => `#${v}`,
    betterLow: true,
  },
  {
    key: "salary",
    label: "Median package",
    sub: "whole college, not this branch (NIRF)",
    get: (o) => o.college.placement?.median_salary ?? null,
    fmt: fmtMoney,
    betterLow: false,
  },
  {
    // the house outcome metric: NIRF's placed-in-a-job alone understates
    // colleges whose students head to masters/PhD (settled on the
    // colleges tab — 'Placed or in higher studies' is the headline)
    key: "outcome",
    label: "Placed or in higher studies",
    sub: "whole college (NIRF)",
    get: (o) => o.college.placement?.percentage_with_outcome ?? null,
    fmt: pct,
    betterLow: false,
  },
  {
    key: "higher",
    label: "Went for higher studies",
    sub: "the research / masters path (NIRF)",
    get: (o) => {
      const p = o.college.placement;
      if (!p?.higher_studies_selected || !p?.first_year_intake) return null;
      return Math.round(
        (p.higher_studies_selected / p.first_year_intake) * 100
      );
    },
    fmt: pct,
    betterLow: false,
  },
  {
    key: "fee",
    label: "Annual fee",
    sub: (o) =>
      o.college.fees?.cycle ? `institute fee, ${o.college.fees.cycle}` : null,
    get: (o) => o.college.fees?.annual_fee ?? null,
    fmt: fmtMoney,
    betterLow: true,
  },
  {
    key: "hostel",
    label: "Hostel + mess",
    sub: "per year",
    get: (o) => o.college.fees?.annual_hostel_mess ?? null,
    fmt: fmtMoney,
    betterLow: true,
  },
];

const OptionPicker = ({ idx, colleges, option, setOption, remove }) => {
  const college = colleges.find((c) => c.college_id === option.collegeId);
  const branches = college
    ? college.programs.list.map((p, i) => ({
        value: String(i),
        label: `${p.branch}${
          p.degree ? ` (${p.degree}${p.years ? `, ${p.years} yr` : ""})` : ""
        }`,
      }))
    : [];
  return (
    <div className="relative rounded-xl border border-[#eaded8] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wide text-[#B52326]">
          Option {idx + 1}
        </span>
        {remove ? (
          <button
            type="button"
            onClick={remove}
            aria-label={`Remove option ${idx + 1}`}
            className="text-[#a89a94] transition hover:text-[#B52326]"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
      <Dropdown
        options={colleges.map((c) => ({
          value: c.college_id,
          label: c.display_name,
        }))}
        selectedValue={option.collegeId}
        onChange={(o) => setOption({ collegeId: o.value, branchIdx: null })}
        placeholder="Select a college…"
        hideValueWhileSearching
      />
      <div className="mt-2">
        <Dropdown
          options={branches}
          selectedValue={option.branchIdx}
          onChange={(o) => setOption({ ...option, branchIdx: o.value })}
          placeholder={college ? "Select a branch…" : "Pick a college first"}
          isDisabled={!college}
          hideValueWhileSearching
        />
      </div>
    </div>
  );
};

export default function Compare() {
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState([
    { collegeId: null, branchIdx: null },
    { collegeId: null, branchIdx: null },
  ]);

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setAll)
      .catch(() => setError("Could not load colleges right now."));
  }, []);

  const picked = useMemo(
    () =>
      options
        .map((o) => {
          const college = all.find((c) => c.college_id === o.collegeId);
          if (!college || o.branchIdx == null) return null;
          return {
            college,
            program: college.programs.list[Number(o.branchIdx)],
          };
        })
        .filter(Boolean),
    [all, options]
  );

  const ready = picked.length >= 2;

  const bestIdx = (row) => {
    const vals = picked.map((o) => row.get(o));
    const nums = vals.filter((v) => v != null);
    if (nums.length < 2) return -1;
    const best = row.betterLow ? Math.min(...nums) : Math.max(...nums);
    // a tie is nobody's win
    if (nums.filter((v) => v === best).length > 1) return -1;
    return vals.indexOf(best);
  };

  return (
    <>
      <Head>
        <title>College & Course Comparison - Avanti Fellows</title>
        <meta
          name="description"
          content="Compare college and branch combinations side by side on real numbers: closing ranks, NIRF rank, fees, placements and the higher-studies path."
        />
      </Head>
      <div className="min-h-screen px-3 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#eee1d7] bg-white p-4 shadow-sm sm:p-8">
          <h1 className="text-center text-3xl font-bold text-[#332724]">
            College &amp; Course Comparison
          </h1>
          <p className="mt-2 text-center text-sm text-[#6d5550]">
            Pick your college and branch options, and compare them on real
            numbers.
          </p>

          {error ? (
            <p className="py-10 text-center text-sm text-[#8f2e31]">{error}</p>
          ) : all.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#6d5550]">
              Loading colleges…
            </p>
          ) : (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {options.map((o, i) => (
                  <OptionPicker
                    key={i}
                    idx={i}
                    colleges={all}
                    option={o}
                    setOption={(next) =>
                      setOptions(options.map((x, j) => (j === i ? next : x)))
                    }
                    remove={
                      options.length > 2
                        ? () => setOptions(options.filter((_, j) => j !== i))
                        : null
                    }
                  />
                ))}
                {options.length < MAX_OPTIONS ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOptions([
                        ...options,
                        { collegeId: null, branchIdx: null },
                      ])
                    }
                    className="flex min-h-[10rem] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e0cdc6] text-sm font-semibold text-[#7a635d] transition hover:border-[#B52326]/50 hover:text-[#B52326]"
                  >
                    <Plus size={16} /> Add a third option
                  </button>
                ) : null}
              </div>

              {ready ? (
                <div className="mt-8 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-[#e3d1cb] bg-[#f8efec] text-left">
                        <th className="w-[26%] px-3 py-2.5" />
                        {picked.map((o, i) => (
                          <th key={i} className="px-3 py-2.5 align-top">
                            <div className="font-bold text-[#2f2320]">
                              {o.college.display_name}
                            </div>
                            <div className="mt-0.5 text-xs font-semibold text-[#8f2e31]">
                              {o.program.branch}
                            </div>
                            <div className="mt-0.5 text-[11px] font-normal text-[#7a635d]">
                              {[o.college.district, o.college.state]
                                .filter(Boolean)
                                .join(", ")}
                              {o.college.ownership
                                ? ` · ${o.college.ownership}`
                                : ""}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ROWS.map((row) => {
                        const win = bestIdx(row);
                        return (
                          <tr
                            key={row.key}
                            className="border-b border-[#eaded8]"
                          >
                            <td className="px-3 py-3 align-top">
                              <div className="font-semibold text-[#2f2320]">
                                {row.label}
                              </div>
                              <div className="text-[11px] leading-4 text-[#a89a94]">
                                {typeof row.sub === "function"
                                  ? row.sub(picked[0])
                                  : row.sub}
                              </div>
                            </td>
                            {picked.map((o, i) => {
                              const v = row.get(o);
                              return (
                                <td
                                  key={i}
                                  className={`px-3 py-3 align-top tabular-nums ${
                                    i === win
                                      ? "bg-[#fbeeec] font-bold text-[#8f2e31]"
                                      : "text-[#2f2320]"
                                  }`}
                                >
                                  {v == null ? (
                                    <span className="text-[#b9a8a2]">—</span>
                                  ) : (
                                    row.fmt(v)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      <tr>
                        <td className="px-3 py-3" />
                        {picked.map((o, i) => (
                          <td key={i} className="px-3 py-3">
                            <Link
                              href={`/colleges?q=${encodeURIComponent(
                                o.college.display_name
                              )}`}
                              className="text-xs text-[#8f2e31] underline hover:text-[#B52326]"
                            >
                              Full college details
                            </Link>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs leading-5 text-[#9b8a82]">
                    Highlighted cells have the better number. Based on NIRF
                    data and each college&apos;s own fee circular.
                  </p>
                </div>
              ) : (
                <p className="mt-8 text-center text-sm text-[#6d5550]">
                  Pick a college and branch for at least two options to see the
                  comparison.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

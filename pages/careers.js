import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useStudentProfile } from "../utils/portalSession";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ChevronRight, Search } from "lucide-react";
import BackLink from "../components/BackLink";
import { loadCareers } from "../components/careerShared";
import { rememberList } from "../utils/listReturn";
import { markForward } from "../utils/navHistory";
import { matchesQuery } from "../utils/search";
import useUrlParams from "../utils/useUrlParams";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The Careers list: one row per career (name, domain, starting pay); each
// opens its own page, /careers/<id>. Content is Amogh's career sheet.

export default function Careers() {
  const router = useRouter();
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  // list filters live in the URL (shareable; Back returns to them). stream
  // = the 11th-12th stream, values from the sheet's controlled vocabulary
  const [params, setParam, urlReady] = useUrlParams({
    q: "",
    stream: "All",
    domain: "All",
  });
  const { q, stream, domain } = params;
  const setQ = (v) => setParam("q", v);
  const setStream = (v) => setParam("stream", v);
  const setDomain = (v) => setParam("domain", v);
  // a signed-in student's stream pre-selects the class-12 filter (they can
  // still switch it); engineering -> PCM, medical -> PCB, CA -> Commerce.
  // Once, and never over a stream the link already carries.
  const student = useStudentProfile();
  const profileApplied = useRef(false);
  useEffect(() => {
    if (!urlReady || profileApplied.current || !student?.stream) return;
    profileApplied.current = true;
    const map = {
      engineering: "Science (PCM)",
      medical: "Science (PCB)",
      ca: "Commerce",
    };
    if (!router.query.stream && map[student.stream])
      setStream(map[student.stream]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.stream, urlReady]);
  useEffect(() => {
    // an older /careers#mechanical-engineering link: straight to its page
    const h = window.location.hash.replace("#", "");
    if (h) {
      markForward(`/careers/${h}`);
      router.replace(`/careers/${h}`);
      return;
    }
    loadCareers()
      .then(setAll)
      .catch(() => setError("Could not load careers right now."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // so a career page's "All careers" comes back to this list as it is
  useEffect(() => {
    if (urlReady) rememberList("/careers");
  }, [urlReady, router.asPath]);

  const filtered = useMemo(() => {
    const raw = q.trim().toLowerCase();
    let rows = all;
    if (domain !== "All") rows = rows.filter((c) => c.domain === domain);
    if (stream !== "All") {
      // a career with "All" in the sheet is open to every stream
      rows = rows.filter(
        (c) =>
          !c.eligible_streams ||
          c.eligible_streams.includes("All") ||
          c.eligible_streams.includes(stream)
      );
    }
    if (!raw) return rows;
    return rows.filter((c) => matchesQuery([c.name, c.domain || ""], raw));
  }, [all, q, stream, domain]);

  const domains = useMemo(
    () => [
      "All",
      ...Array.from(new Set(all.map((c) => c.domain).filter(Boolean))).sort(),
    ],
    [all]
  );

  return (
    <>
      <Head>
        <title>Careers - Futures</title>
        <meta
          name="description"
          content="What each career actually looks like: day-to-day work, pay, recruiters, and the entrance exams that lead there."
        />
      </Head>
      <div className="min-h-screen px-3 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3">
            <BackLink />
          </div>
          <div className="mx-auto max-w-6xl rounded-2xl border border-[#eee1d7] bg-white p-4 shadow-sm sm:p-8">
            {
              <>
                <h1 className="text-center text-3xl font-bold text-[#332724]">
                  Careers
                </h1>
                <p className="mt-2 text-center text-sm text-[#6d5550]">
                  Pay figures are typical ranges from public reports — treat
                  them as direction, not promises.
                </p>
              </>
            }

            {error ? (
              <p className="py-10 text-center text-sm text-[#8f2e31]">
                {error}
              </p>
            ) : all.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#6d5550]">
                Loading careers…
              </p>
            ) : (
              <>
                {
                  <>
                    {/* one column, two dropdowns, a numbered list — the
                      side-by-side list + detail read as stuffed to students */}
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#7a635d]">
                          Career domain
                        </span>
                        <Dropdown
                          options={domains.map((d) => ({
                            value: d,
                            label: d === "All" ? "All domains" : d,
                          }))}
                          selectedValue={domain}
                          onChange={(o) => setDomain(o.value)}
                          isSearchable={false}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#7a635d]">
                          Not sure of the domain? Pick your class 12 stream
                        </span>
                        <Dropdown
                          options={[
                            "All",
                            "Science (PCM)",
                            "Science (PCB)",
                            "Commerce",
                            "Arts",
                          ].map((st) => ({
                            value: st,
                            label: st === "All" ? "All streams" : st,
                          }))}
                          selectedValue={stream}
                          onChange={(o) => setStream(o.value)}
                          isSearchable={false}
                        />
                      </label>
                    </div>
                    <div className="relative mt-4">
                      <Search
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b9a8a2]"
                      />
                      <input
                        type="text"
                        value={q}
                        onChange={(ev) => setQ(ev.target.value)}
                        placeholder="Search careers"
                        className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] py-2.5 pl-8 pr-3 text-sm text-[#2f2320] outline-none transition placeholder:text-[#7a6159] focus:border-[#b52326]"
                      />
                    </div>
                    <p className="mt-5 text-sm text-[#5b3a34]">
                      Showing{" "}
                      <span className="font-bold">{filtered.length}</span>{" "}
                      career{filtered.length === 1 ? "" : "s"} for you. Click
                      any of them to know more.
                    </p>
                    <ol className="mt-3 overflow-hidden rounded-xl border border-[#eaded8]">
                      <li className="bg-[#f8efec] px-4 py-2 text-[11px] font-black uppercase tracking-wide text-[#5b1f20]">
                        Career
                      </li>
                      {filtered.map((c, i) => (
                        <li
                          key={c.career_id}
                          className="border-t border-[#f0e6e1]"
                        >
                          <Link
                            href={`/careers/${c.career_id}`}
                            className="flex w-full items-center gap-4 bg-white px-4 py-3 text-left text-[15px] transition hover:bg-[#fbeeec]"
                          >
                            <span className="w-7 shrink-0 text-xs tabular-nums text-[#a89a94]">
                              {i + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-[#2f2320]">
                                {c.name}
                              </span>
                              <span className="block text-xs text-[#7a635d]">
                                {c.domain}
                              </span>
                            </span>
                            {c.pay?.start ? (
                              <span className="shrink-0 text-right text-xs text-[#5b3a34]">
                                <span className="block text-[10px] uppercase tracking-wide text-[#a89a94]">
                                  Starting pay
                                </span>
                                <span className="font-semibold">
                                  {c.pay.start}
                                </span>
                              </span>
                            ) : null}
                            <ChevronRight
                              size={18}
                              className="shrink-0 text-[#b9a8a2]"
                            />
                          </Link>
                        </li>
                      ))}
                      {filtered.length === 0 ? (
                        <li className="border-t border-[#f0e6e1] bg-white px-4 py-4 text-sm text-[#6d5550]">
                          No careers match these filters.
                        </li>
                      ) : null}
                    </ol>
                  </>
                }
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The Careers tab: one page per career, the answer to "what does this field
// actually look like". Content is Amogh's career sheet; the "Exams that lead
// here" chips are REAL joins (career -> branch taxonomy -> which entrance
// exams offer that branch in their cutoff tables), not hand-picked lists.

const DATA_URL = "/data/careers/careers.json";

const SectionHead = ({ n, children }) => (
  <div className="mb-2 flex items-baseline gap-2">
    <span className="font-mono text-xs text-[#b9a8a2]">
      {String(n).padStart(2, "0")}
    </span>
    <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
      {children}
    </h3>
  </div>
);

const Chip = ({ children }) => (
  <span className="rounded-full border border-[#e3d1cb] bg-white px-2.5 py-1 text-xs text-[#5b3a34]">
    {children}
  </span>
);

const PayStat = ({ label, value }) => (
  <div className="rounded-xl border border-[#eaded8] bg-[#fffdfa] px-4 py-3 text-center">
    <div className="text-base font-bold tabular-nums text-[#332724]">
      {value || "—"}
    </div>
    <div className="mt-0.5 text-[11px] text-[#6d5550]">{label}</div>
  </div>
);

const CareerDetail = ({ c }) => (
  <div className="space-y-7">
    <div>
      <h2 className="text-2xl font-bold text-[#332724]">{c.name}</h2>
    </div>

    {c.day_in_life ? (
      <section>
        <SectionHead n={1}>A day in the life</SectionHead>
        <p className="text-sm leading-6 text-[#5b3a34]">{c.day_in_life}</p>
      </section>
    ) : null}

    {c.impact ? (
      <section>
        <SectionHead n={2}>Why it matters</SectionHead>
        <p className="text-sm leading-6 text-[#5b3a34]">{c.impact}</p>
      </section>
    ) : null}

    {c.pay?.start || c.pay?.mid || c.pay?.senior ? (
      <section>
        <SectionHead n={3}>What it pays</SectionHead>
        <div className="grid max-w-md grid-cols-3 gap-2">
          <PayStat label="Starting" value={c.pay.start} />
          <PayStat label="Mid-career" value={c.pay.mid} />
          <PayStat label="Senior" value={c.pay.senior} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {c.stability ? <Chip>Stability: {c.stability}</Chip> : null}
          {c.automation_risk ? (
            <Chip>Automation risk: {c.automation_risk}</Chip>
          ) : null}
        </div>
        {c.where_work ? (
          <p className="mt-2 text-xs leading-5 text-[#6d5550]">
            {c.where_work}
          </p>
        ) : null}
      </section>
    ) : null}

    {c.recruiters?.length ? (
      <section>
        <SectionHead n={4}>Who hires</SectionHead>
        <div className="flex flex-wrap gap-1.5">
          {c.recruiters.map((r) => (
            <Chip key={r}>{r}</Chip>
          ))}
        </div>
      </section>
    ) : null}

    {c.notable_people?.length ? (
      <section>
        <SectionHead n={5}>People you may know of</SectionHead>
        <ul className="space-y-1 text-sm leading-6 text-[#5b3a34]">
          {c.notable_people.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
    ) : null}

    {c.specializations?.length ? (
      <section>
        <SectionHead n={6}>Ways to specialise</SectionHead>
        <dl className="space-y-2 text-sm">
          {c.specializations.map((s) => (
            <div key={s.name}>
              <dt className="font-semibold text-[#332724]">{s.name}</dt>
              {s.blurb ? (
                <dd className="leading-6 text-[#5b3a34]">{s.blurb}</dd>
              ) : null}
            </div>
          ))}
        </dl>
      </section>
    ) : null}

    <section>
      <SectionHead n={7}>Exams that lead here</SectionHead>
      {c.exams?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {c.exams.map((e) => (
            <Link
              key={e.label}
              href={`/exams?q=${encodeURIComponent(e.q)}`}
              className="rounded-full border border-[#e3d1cb] bg-white px-2.5 py-1 text-xs font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
            >
              {e.label}
            </Link>
          ))}
        </div>
      ) : null}
      {c.entry_exams_text ? (
        <p className="mt-2 text-xs leading-5 text-[#6d5550]">
          {c.entry_exams_text}
        </p>
      ) : null}
    </section>

    {c.top_colleges?.length ? (
      <section>
        <SectionHead n={8}>Colleges known for it</SectionHead>
        <p className="text-sm leading-6 text-[#5b3a34]">
          {c.top_colleges.join(", ")}
        </p>
        <Link
          href="/colleges"
          className="mt-1.5 inline-block text-xs text-[#6d5550] underline hover:text-[#8f2e31]"
        >
          compare colleges
        </Link>
      </section>
    ) : null}

    {c.sources ? (
      <p className="border-t border-[#eaded8] pt-3 text-[11px] leading-5 text-[#9b8a82]">
        Sources: {c.sources}
      </p>
    ) : null}
  </div>
);

export default function Careers() {
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        setAll(d);
        // /careers#mechanical-engineering — deep link from a branch chip
        const h = window.location.hash.replace("#", "");
        setSelected(
          h && d.some((c) => c.career_id === h) ? h : d[0]?.career_id
        );
      })
      .catch(() => setError("Could not load careers right now."));
  }, []);

  const filtered = useMemo(() => {
    const raw = q.trim().toLowerCase();
    if (!raw) return all;
    return all.filter((c) =>
      raw.split(/\s+/).every((w) => c.name.toLowerCase().includes(w))
    );
  }, [all, q]);

  const current = all.find((c) => c.career_id === selected);

  const pick = (id) => {
    setSelected(id);
    // keep the URL shareable without a jarring scroll
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <>
      <Head>
        <title>Careers - Avanti Fellows</title>
        <meta
          name="description"
          content="What each career actually looks like: day-to-day work, pay, recruiters, and the entrance exams that lead there."
        />
      </Head>
      <div className="min-h-screen bg-[#faf5ef] px-3 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#eee1d7] bg-white p-4 shadow-sm sm:p-8">
          <h1 className="text-center text-3xl font-bold text-[#332724]">
            Careers
          </h1>
          <p className="mt-2 text-center text-sm text-[#6d5550]">
            Pay figures are typical ranges from public reports — treat them as
            direction, not promises.
          </p>

          {error ? (
            <p className="py-10 text-center text-sm text-[#8f2e31]">{error}</p>
          ) : all.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#6d5550]">
              Loading careers…
            </p>
          ) : (
            <div className="mt-6 gap-8 md:grid md:grid-cols-[16rem_1fr]">
              {/* phone: one picker; desktop: searchable list */}
              <div className="mb-6 md:hidden">
                <Dropdown
                  options={all.map((c) => ({
                    value: c.career_id,
                    label: c.name,
                  }))}
                  selectedValue={selected}
                  onChange={(o) => pick(o.value)}
                  className="w-full"
                  hideValueWhileSearching
                />
              </div>
              <div className="hidden md:block">
                <div className="relative mb-3">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b9a8a2]"
                  />
                  <input
                    type="text"
                    value={q}
                    onChange={(ev) => setQ(ev.target.value)}
                    placeholder="Search careers"
                    className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] py-2 pl-8 pr-3 text-sm text-[#2f2320] outline-none transition placeholder:text-[#7a6159] focus:border-[#b52326]"
                  />
                </div>
                <nav className="max-h-[70vh] space-y-0.5 overflow-y-auto pr-1">
                  {filtered.map((c) => (
                    <button
                      key={c.career_id}
                      type="button"
                      onClick={() => pick(c.career_id)}
                      className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition ${
                        selected === c.career_id
                          ? "bg-[#f8efec] font-semibold text-[#8f2e31]"
                          : "text-[#5b3a34] hover:bg-[#fdf8f4]"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[#6d5550]">
                      No careers match.
                    </p>
                  ) : null}
                </nav>
              </div>
              <div className="min-w-0">
                {current ? <CareerDetail c={current} /> : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

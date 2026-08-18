import React, { useEffect, useState } from "react";
import Head from "next/head";
import { ChevronDown, Download } from "lucide-react";
import getConstants from "../constants";

// Rendered entirely from the PUBLIC manifest: what you see is exactly what is
// published (external_data_sources/open_data/publish.py). File titles follow
// "<Group> — <what it is>", and the page shows each group's official documents
// and extracted tables side by side — provenance by layout, not by prose.
const MANIFEST_URL =
  "https://storage.googleapis.com/avantifellows-open-data/manifest.json";

// national-scope groups float above the state alphabet
const NATIONAL = ["All India Quota", "All states", "NMC roster", "DCI roster"];

const fmtBytes = (b) =>
  b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;

const FileChip = ({ f }) => {
  const label = f.title.split(" — ").slice(1).join(" — ") || f.title;
  return (
    <a
      href={f.url}
      target="_blank"
      rel="noopener noreferrer"
      title={
        f.columns_removed
          ? `${f.path.split("/").pop()} — personal-identifier columns removed: ${f.columns_removed.join(", ")}`
          : f.path.split("/").pop()
      }
      className={`group inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition hover:shadow-sm ${
        f.kind === "raw"
          ? "border-[#D77C11]/40 bg-[#FFB763]/15 text-[#8a5209] hover:border-[#D77C11]/70"
          : "border-[#1F9E8F]/25 bg-[#1F9E8F]/5 text-[#166f64] hover:border-[#1F9E8F]/60"
      }`}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 font-mono text-xs opacity-60">
        {f.format} · {fmtBytes(f.bytes)}
      </span>
      <Download size={13} className="shrink-0 opacity-50 group-hover:opacity-100" />
    </a>
  );
};

const GroupRow = ({ group, files }) => {
  const raw = files.filter((f) => f.kind === "raw");
  const extracted = files.filter((f) => f.kind === "extracted");
  return (
    <div className="grid gap-2 border-b border-[#f0e6de] px-4 py-3 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <p className="pt-1 font-semibold text-[#332724]">{group}</p>
      <div className="flex min-w-0 flex-col gap-1.5">
        {raw.length === 0 && (
          <p className="text-xs italic text-[#9b8a82]">
            Original document not archived.
          </p>
        )}
        {raw.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {raw.map((f) => (
              <FileChip key={f.path} f={f} />
            ))}
          </div>
        )}
        {extracted.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {extracted.map((f) => (
              <FileChip key={f.path} f={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DatasetCard = ({ ds, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  const groups = {};
  for (const f of ds.files) {
    const g = f.title.split(" — ")[0];
    (groups[g] = groups[g] || []).push(f);
  }
  const order = Object.keys(groups).sort((a, b) => {
    const na = NATIONAL.findIndex((n) => a.startsWith(n));
    const nb = NATIONAL.findIndex((n) => b.startsWith(n));
    if (na >= 0 !== nb >= 0) return na >= 0 ? -1 : 1;
    if (na >= 0 && nb >= 0) return na - nb;
    return a.localeCompare(b);
  });
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#eaded8] bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-[#fdf8f4]"
      >
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-lg font-bold text-[#332724]">{ds.title}</span>
          <span className="font-mono text-sm text-[#685851]">
            {ds.files.length} {ds.files.length === 1 ? "file" : "files"}
          </span>
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-[#685851] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <p className="border-b border-t border-[#f0e6de] px-4 py-2.5 text-sm italic text-[#685851]">
            {ds.blurb}
            {ds.source && (
              <>
                {" "}
                Official source:{" "}
                <a
                  href={ds.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#B52326]"
                >
                  {ds.source.label}
                </a>
                .
              </>
            )}
          </p>
          {order.map((g) => (
            <GroupRow key={g} group={g} files={groups[g]} />
          ))}
        </>
      )}
    </div>
  );
};

export default function Datasets() {
  const { TITLE_SHORT = "College Predictor" } = getConstants() || {};
  const [manifest, setManifest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setManifest)
      .catch(() => setError("Could not load the dataset list right now."));
  }, []);

  return (
    <div className="min-h-screen bg-[#f5efe8] pb-16">
      <Head>
        <title>{`Open Datasets - ${TITLE_SHORT}`}</title>
        <meta
          name="description"
          content="Download the public admissions data behind this site: official counselling documents and the tables extracted from them. CC BY 4.0."
        />
      </Head>

      <div className="mx-auto max-w-4xl px-4 pt-8">
        <div className="rounded-2xl border border-[#eaded8] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#332724]">Open Datasets</h1>
          <p className="mt-2 text-[#685851]">
            The public admissions data behind this site: official counselling
            documents, and the tables we extracted from them. Free to download
            and reuse (CC BY 4.0, attribution appreciated).
          </p>
          <p className="mt-2 text-[#685851]">
            Note: Cutoffs shift every year. Verify with the official
            counselling authority before acting on any number.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#eaded8] bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-semibold uppercase tracking-wide text-[#332724]">
            Legend
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-[#8a5209]">
            <span className="h-3.5 w-6 rounded border border-[#D77C11]/40 bg-[#FFB763]/25" />
            Official document
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-[#166f64]">
            <span className="h-3.5 w-6 rounded border border-[#1F9E8F]/40 bg-[#1F9E8F]/10" />
            Extracted table
          </span>
          <span className="text-sm text-[#685851]">
            Personal-identifier columns (names, roll numbers) are removed from
            extracted tables before publishing.
          </span>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-[#eaded8] bg-white p-4 text-center text-[#8a1b1d]">
            {error}
          </p>
        )}
        {!manifest && !error && (
          <p className="mt-6 text-center text-[#685851]">Loading…</p>
        )}

        {(Array.isArray(manifest?.datasets) ? manifest.datasets : []).map(
          (ds) => (
            <DatasetCard key={ds.id} ds={ds} defaultOpen={false} />
          )
        )}

        {manifest && (
          <p className="mt-6 text-center text-xs text-[#685851]">
            Updated {manifest.generated}. Found a problem?{" "}
            <a
              className="underline"
              href="https://github.com/avantifellows/college-predictor/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open an issue.
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  Award,
  Briefcase,
  ClipboardList,
  LogOut,
  Pencil,
  Target,
} from "lucide-react";
import {
  CATEGORY_OPTIONS,
  CLASS_OPTIONS,
  STREAM_OPTIONS,
  STREAM_TO_EXAM,
  clearProfile,
  saveProfile,
  useStudentProfile,
} from "../utils/portalSession";
import { statesList } from "../examConfig";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// Student Corner: what Futures knows about a signed-in Avanti student, the
// shortcuts that follow from it, and a way to correct it. Futures works fully
// without this page; it only ever pre-fills.

const STATE_OPTIONS = statesList.map((s) => ({ value: s, label: s }));

const labelFor = (options, value) =>
  options.find((o) => o.value === value)?.label || value || "—";

const Fact = ({ label, value }) => (
  <div className="rounded-xl border border-[#eaded8] bg-white px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a635d]">
      {label}
    </p>
    <p className="mt-0.5 text-[15px] font-bold text-[#2f2320]">{value}</p>
  </div>
);

const Shortcut = ({ href, icon: Icon, title, desc }) => (
  <Link
    href={href}
    className="flex items-start gap-3 rounded-xl border border-[#eaded8] bg-white p-4 transition hover:border-[#B52326] hover:shadow-sm"
  >
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fbeeec] text-[#B52326]">
      <Icon size={20} />
    </span>
    <span>
      <span className="block text-[15px] font-bold text-[#2f2320]">
        {title}
      </span>
      <span className="block text-sm text-[#7a635d]">{desc}</span>
    </span>
  </Link>
);

const EditForm = ({ profile, onDone }) => {
  const [draft, setDraft] = useState({
    class: profile.class ?? null,
    stream: profile.stream ?? null,
    state: profile.state ?? null,
    category: profile.category ?? null,
  });
  const set = (key) => (option) => setDraft({ ...draft, [key]: option.value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-[#2f2320]">
        Class
        <Dropdown
          options={CLASS_OPTIONS}
          selectedValue={labelFor(CLASS_OPTIONS, draft.class)}
          onChange={set("class")}
          isSearchable={false}
        />
      </label>
      <label className="text-sm font-semibold text-[#2f2320]">
        Stream
        <Dropdown
          options={STREAM_OPTIONS}
          selectedValue={labelFor(STREAM_OPTIONS, draft.stream)}
          onChange={set("stream")}
          isSearchable={false}
        />
      </label>
      <label className="text-sm font-semibold text-[#2f2320]">
        Home state
        <Dropdown
          options={STATE_OPTIONS}
          selectedValue={draft.state}
          onChange={set("state")}
        />
      </label>
      <label className="text-sm font-semibold text-[#2f2320]">
        Category
        <Dropdown
          options={CATEGORY_OPTIONS}
          selectedValue={draft.category}
          onChange={set("category")}
          isSearchable={false}
        />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={() => {
            saveProfile({ ...profile, ...draft });
            onDone();
          }}
          className="rounded-[10px] bg-[#B52326] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#9E1F22]"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-[10px] border border-[#eaded8] bg-white px-5 py-2.5 text-sm font-bold text-[#2f2320] transition hover:bg-[#fbeeec]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default function StudentCorner() {
  const router = useRouter();
  const profile = useStudentProfile();
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const exam = profile?.stream ? STREAM_TO_EXAM[profile.stream] : null;
  const predictorHref = exam
    ? { pathname: "/predictor", query: { exam } }
    : "/predictor";

  return (
    <>
      <Head>
        <title>Student Corner - Futures</title>
      </Head>
      <div className="min-h-[calc(100vh-120px)] bg-[#fdf8f6] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          {!mounted ? null : !profile ? (
            <div className="rounded-2xl border border-[#eaded8] bg-white p-8 text-center">
              <h1 className="text-2xl font-black text-[#2f2320]">
                Student Corner
              </h1>
              <p className="mt-3 text-[15px] text-[#7a635d]">
                This space is for Avanti Fellows students. Open Futures through
                your Avanti link and your details will show up here. Everything
                else on Futures works without it.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-[10px] bg-[#B52326] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#9E1F22]"
              >
                Back to Futures
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#B52326]">
                    Student Corner
                  </p>
                  <h1 className="text-[clamp(24px,3.6vw,34px)] font-black leading-tight text-[#2f2320]">
                    Hi{profile.name ? `, ${profile.name.split(" ")[0]}` : ""}
                  </h1>
                  {profile.group ? (
                    <p className="text-sm text-[#7a635d]">
                      Signed in through Avanti · {profile.group}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearProfile();
                    router.push("/");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#eaded8] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#2f2320] transition hover:bg-[#fbeeec]"
                >
                  <LogOut size={14} /> Not you? Sign out
                </button>
              </div>

              <section className="mt-6 rounded-2xl border border-[#eaded8] bg-[#fffdfa] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-[#2f2320]">
                    Your details
                  </h2>
                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B52326] hover:underline"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#7a635d]">
                  We use these to pre-fill the college predictor and to point
                  you at the right exams. You can change any of them.
                </p>
                <div className="mt-4">
                  {editing ? (
                    <EditForm
                      profile={profile}
                      onDone={() => setEditing(false)}
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Fact
                        label="Class"
                        value={labelFor(CLASS_OPTIONS, profile.class)}
                      />
                      <Fact
                        label="Stream"
                        value={labelFor(STREAM_OPTIONS, profile.stream)}
                      />
                      <Fact label="Home state" value={profile.state || "—"} />
                      <Fact label="Category" value={profile.category || "—"} />
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-6">
                <h2 className="text-base font-black text-[#2f2320]">
                  Start here
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Shortcut
                    href={predictorHref}
                    icon={Target}
                    title={
                      exam
                        ? `Predict my colleges (${exam})`
                        : "College Predictor"
                    }
                    desc="Your category and home state are already filled in."
                  />
                  <Shortcut
                    href="/exams"
                    icon={ClipboardList}
                    title="Entrance exams"
                    desc="Dates, pattern and eligibility for every exam."
                  />
                  <Shortcut
                    href="/scholarships"
                    icon={Award}
                    title="Scholarships"
                    desc="Filter by your category and state."
                  />
                  <Shortcut
                    href="/careers"
                    icon={Briefcase}
                    title="Careers"
                    desc="Pay, recruiters and the exams behind each career."
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}

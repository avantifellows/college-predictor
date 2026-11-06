import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  ALL_INDIA_LOGIN_URL,
  PROGRAMME_GROUPS,
  SIGNUP_URL,
  portalUrl,
} from "../utils/portalSession";

// Log in or sign up, through the Avanti Fellows portal. The portal asks
// different things of each programme's students (an ID and date of birth,
// a mobile number, …), so a student picks their programme and goes to that
// programme's login, set to come back to Futures. Students who signed up
// on their own are AllIndiaStudents, the one group new students can join.
// The header's Log in opens this page with the programmes first; Sign up
// free (?new=1) puts sign-up first.

const card = "rounded-2xl border border-[#eaded8] bg-white p-5 sm:p-6";

function SignUp() {
  return (
    <section
      className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div>
        <h2 className="text-lg font-black text-[#2f2320]">New here?</h2>
        <p className="mt-0.5 text-sm text-[#7a635d]">
          Create a free Avanti Fellows account with your mobile number.
        </p>
      </div>
      <a
        href={SIGNUP_URL}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#B52326] px-5 py-3 text-base font-black text-white transition hover:bg-[#9E1F22]"
      >
        Sign up free <ArrowRight size={18} />
      </a>
    </section>
  );
}

function Programmes() {
  const rows = [
    ...PROGRAMME_GROUPS.map(({ group, label }) => ({
      label,
      href: portalUrl(group),
    })),
    {
      label: "Not in a programme",
      sub: "I signed up on my own",
      href: ALL_INDIA_LOGIN_URL,
    },
  ];
  return (
    <section className={card}>
      <h2 className="text-lg font-black text-[#2f2320]">
        Log in with your Avanti Fellows account
      </h2>
      <p className="mt-1 text-sm text-[#7a635d]">
        Pick your Avanti Fellows programme. You&apos;ll log in the same way you
        do for classes and tests.
      </p>
      <ul className="mt-4 flex flex-col divide-y divide-[#f1e5e1] overflow-hidden rounded-xl border border-[#eaded8]">
        {rows.map(({ label, sub, href }) => (
          <li key={label}>
            <a
              href={href}
              className="flex items-center justify-between gap-3 px-4 py-3 text-[#2f2320] transition hover:bg-[#fdf8f6] hover:text-[#B52326]"
            >
              <span>
                <span className="block font-bold">{label}</span>
                {sub ? (
                  <span className="block text-[13px] text-[#7a635d]">
                    {sub}
                  </span>
                ) : null}
              </span>
              <ChevronRight size={18} className="shrink-0 text-[#B52326]" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Login() {
  const { query } = useRouter();
  const isNew = query.new === "1";

  return (
    <>
      <Head>
        <title>{isNew ? "Sign up" : "Log in"} - Futures</title>
        <meta
          name="description"
          content="Log in or sign up with your Avanti Fellows account to save your plan, colleges and careers on Futures."
        />
      </Head>
      <div className="min-h-screen bg-[#fdf8f6] px-4 pb-16 pt-10">
        <div className="mx-auto flex max-w-[520px] flex-col gap-5">
          <h1 className="text-[28px] font-black leading-tight text-[#2f2320]">
            {isNew ? "Sign up" : "Log in"}
          </h1>
          {isNew ? (
            <>
              <SignUp />
              <Programmes />
            </>
          ) : (
            <>
              <Programmes />
              <SignUp />
            </>
          )}
        </div>
      </div>
    </>
  );
}

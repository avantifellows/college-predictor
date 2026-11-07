import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import BackLink from "../components/BackLink";
import { previousPage } from "../utils/navHistory";
import {
  ALL_INDIA_LOGIN_URL,
  PROGRAM_GROUPS,
  SIGNUP_URL,
  portalUrl,
  rememberReturn,
} from "../utils/portalSession";

// Log in or sign up, through the Avanti Fellows portal. Most students on
// Futures aren't in an Avanti program, so both pages lead with the mobile
// number account (AllIndiaStudents, the one group anyone can join):
//   Log in   the mobile number login first; Avanti students open a list of
//            their programs (each logs in its own way: an ID and date of
//            birth, …); then New here? Sign up free
//   Sign up  (?new=1) just the sign-up, and a way to Log in instead
// The portal always lands back on Futures' home page, so the page that
// opened this one is remembered (rememberReturn) and the student is taken
// back there once signed in.

const card = "rounded-2xl border border-[#eaded8] bg-white p-5 sm:p-6";
const primary =
  "inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#B52326] px-5 py-3 text-base font-black text-white transition hover:bg-[#9E1F22]";

function Programs() {
  const [open, setOpen] = useState(false);
  return (
    <section className={card}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-lg font-black text-[#2f2320]">
            Avanti Fellows student?
          </span>
          <span className="mt-0.5 block text-sm text-[#7a635d]">
            Log in the same way you do for classes and tests.
          </span>
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-[#B52326] transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <ul className="mt-4 flex flex-col divide-y divide-[#f1e5e1] overflow-hidden rounded-xl border border-[#eaded8]">
          {PROGRAM_GROUPS.map(({ group, label }) => (
            <li key={group}>
              <a
                href={portalUrl(group)}
                className="flex items-center justify-between gap-3 px-4 py-3 font-bold text-[#2f2320] transition hover:bg-[#fdf8f6] hover:text-[#B52326]"
              >
                {label}
                <ChevronRight size={18} className="shrink-0 text-[#B52326]" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default function Login() {
  const { query } = useRouter();
  const isNew = query.new === "1";

  // leaving for the portal: remember the page to come back to
  const onPortalClick = (e) => {
    const a = e.target.closest("a");
    if (a && /^https?:/.test(a.getAttribute("href") || ""))
      rememberReturn(previousPage()?.path);
  };

  return (
    <>
      <Head>
        <title>{isNew ? "Sign up" : "Log in"} - Futures</title>
        <meta
          name="description"
          content="Log in or sign up free to save your plan, colleges and careers on Futures."
        />
      </Head>
      <div className="min-h-screen bg-[#fdf8f6] px-4 pb-16 pt-10">
        <div
          className="mx-auto flex max-w-[520px] flex-col gap-5"
          onClickCapture={onPortalClick}
        >
          <BackLink />
          <h1 className="text-[28px] font-black leading-tight text-[#2f2320]">
            {isNew ? "Sign up" : "Log in"}
          </h1>
          {isNew ? (
            <>
              <section className={card}>
                <h2 className="text-lg font-black text-[#2f2320]">New here?</h2>
                <p className="mt-0.5 text-sm text-[#7a635d]">
                  Sign up free with your mobile number.
                </p>
                <a href={SIGNUP_URL} className={`${primary} mt-4`}>
                  Sign up free <ArrowRight size={18} />
                </a>
              </section>
              <p className="text-center text-sm text-[#7a635d]">
                Already have an account, or an Avanti Fellows student?{" "}
                <Link
                  href="/login"
                  replace
                  className="font-bold text-[#8f2e31] underline"
                >
                  Log in
                </Link>
              </p>
            </>
          ) : (
            <>
              <section className={card}>
                <h2 className="text-lg font-black text-[#2f2320]">
                  Signed up with your mobile number?
                </h2>
                <a href={ALL_INDIA_LOGIN_URL} className={`${primary} mt-4`}>
                  Log in <ArrowRight size={18} />
                </a>
              </section>
              <Programs />
              <p className="text-center text-sm text-[#7a635d]">
                New here?{" "}
                <Link
                  href="/login?new=1"
                  replace
                  className="font-bold text-[#8f2e31] underline"
                >
                  Sign up free
                </Link>{" "}
                with your mobile number.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Star, X } from "lucide-react";

// A guest pressed a star: a small box over the dimmed page asking them to
// sign up. Closes with ✕, Esc or a click outside. What they starred is kept
// (utils/portalSession.js setPendingStar) and saved once they're signed in.
export default function SignUpNudge({ label, onClose }) {
  const box = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    box.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2f2320]/50 px-4"
      // React passes clicks up through a portal: keep them from reaching
      // the row or card the star sits in (which would open it)
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-nudge-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[400px] rounded-2xl bg-white p-6 text-left shadow-xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#7a635d] transition hover:bg-[#fbeeec]"
        >
          <X size={18} />
        </button>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#fbeeec]">
          <Star size={20} className="fill-[#B52326] text-[#B52326]" />
        </span>
        <h2
          id="signup-nudge-title"
          className="mt-3 text-xl font-black text-[#2f2320]"
        >
          Sign up to save this
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-[#5c4a45]">
          {label ? (
            <>
              We&apos;ll save <b className="text-[#2f2320]">{label}</b> to your
              profile, so you can come back to it anytime.
            </>
          ) : (
            "We'll save it to your profile, so you can come back to it anytime."
          )}
        </p>
        <Link
          href="/login?new=1"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#B52326] px-5 py-3 text-base font-black text-white transition hover:bg-[#9E1F22]"
        >
          Sign up free <ArrowRight size={18} />
        </Link>
        <p className="mt-3 text-center text-sm text-[#7a635d]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#8f2e31] underline">
            Log in
          </Link>
        </p>
      </div>
    </div>,
    document.body
  );
}

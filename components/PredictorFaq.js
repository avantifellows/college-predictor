import React, { useEffect, useState } from "react";
import { ChevronDown, CircleHelp, X } from "lucide-react";

// JoSAA results FAQ: a red button that opens the answers in a small window.
const FAQS = [
  {
    q: "Are closing ranks for my category or all India?",
    a: "Your category: each closing rank is for seats in your category, so compare it with your category rank.",
  },
  {
    q: "What about home state quota?",
    // JoSAA's home-state (HS) seats: every NIT plus a few others (IIEST
    // Shibpur, BIT Mesra, PEC Chandigarh); no IIIT has them
    a: "Closing ranks for NITs and a few other colleges in your home state are calculated using the home state quota.",
  },
  {
    q: "Why can I see colleges and programs with cutoffs less than my rank?",
    a: "We include seats that closed within 10% of your rank, because cutoffs move a little from year to year.",
  },
  {
    q: "What is NIRF?",
    a: "The National Institutional Ranking Framework is the Ministry of Education's yearly ranking of Indian colleges. We show its Engineering ranking, which scores teaching, research, graduate outcomes and reputation.",
  },
  {
    q: "Why do multiple branches have the same NIRF salary?",
    a: "Colleges report salaries to NIRF for the whole college, not branch by branch.",
  },
];

const PredictorFaq = ({ className = "" }) => {
  const [open, setOpen] = useState(false);
  // which answer is showing (one at a time)
  const [shown, setShown] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // styled like the page's "Edit inputs" link: quiet, not a call to action
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#d8c7c1] bg-white px-4 py-2 text-sm font-semibold text-[#7a2628] transition hover:bg-[#f8efec] ${className}`}
      >
        <CircleHelp size={16} />
        FAQ
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(36,18,14,.55)] sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Frequently asked questions"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[20px] bg-white p-5 text-left shadow-[0_24px_56px_rgba(74,42,38,.16)] sm:rounded-[20px] sm:p-6"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="font-['Lato',sans-serif] text-xl font-black text-[#2f2320]">
                  FAQ
                </h2>
                {/* the rows' closing ranks are JoSAA 2025 round 5 (checked
                    against public/data/JEE/josaa_2025_all_rounds.json) */}
                <p className="mt-0.5 text-sm text-[#6d5550]">
                  Based on JoSAA 2025 round 5 cutoffs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-[#7a635d] hover:bg-[#f3dcd8]"
              >
                <X size={20} />
              </button>
            </div>
            <ol className="space-y-3">
              {FAQS.map(({ q, a }, i) => {
                const isOpen = shown === i;
                return (
                  <li
                    key={q}
                    className="rounded-xl border border-[#eaded8] bg-[#fffdfa]"
                  >
                    <button
                      type="button"
                      onClick={() => setShown(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left"
                    >
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#B52326] text-xs font-extrabold text-white">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-[15px] font-bold leading-snug text-[#2f2320]">
                        {q}
                      </span>
                      <ChevronDown
                        size={18}
                        className={`mt-0.5 flex-none text-[#7a635d] transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="px-4 pb-4 pl-[52px] text-sm leading-relaxed text-[#5c4b46]">
                        {a}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </>
  );
};

export default PredictorFaq;

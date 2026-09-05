import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadPersistedState, ProfileChips } from "../../components/MockAllotment";
import { cardClass } from "../../components/mockAllotmentTheme";

// Standalone page for the "My Choices" link in the Simulation view — a
// real route (not a modal/inline toggle) that reads the same persisted run
// from localStorage, per the mock's no-backend design (see MockAllotment.js).
const MyChoicesPage = () => {
  const [state, setState] = useState(null);

  useEffect(() => {
    setState(loadPersistedState());
  }, []);

  // Avoids a server/client mismatch flash — same "wait for hydration" gate
  // MockAllotment.js itself uses before touching localStorage-derived state.
  if (!state) return null;

  const { choices, locked, profile } = state;

  return (
    <>
      <Head>
        <title>My Choices — JoSAA Mock Allotment</title>
      </Head>
      <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <Link
              href="/mock-allotment"
              aria-label="Back to Simulation"
              title="Back to Simulation"
              className="shrink-0 rounded-full border border-[#d8c7c1] px-3 py-1.5 text-lg font-bold leading-none text-[#5b4a45] hover:bg-[#f8efec]"
            >
              ←
            </Link>
            <h1 className="text-2xl font-bold text-[#3a2c28] md:text-3xl">
              My Choices{locked ? " (Locked & Submitted)" : ""}
            </h1>
          </div>
          <div className="mt-2">
            <ProfileChips profile={profile} />
          </div>

          {choices.length === 0 ? (
            <p className="mt-4 text-sm text-[#7a655f]">
              No choices found — start a mock allotment first.
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {choices.map((item, index) => (
                <li
                  key={`${item.institute}|${item.program}`}
                  className={`${cardClass} flex items-start gap-3`}
                >
                  <span className="mt-0.5 shrink-0 font-bold text-[#b52326]">
                    {index + 1}.
                  </span>
                  <div>
                    <p className="font-semibold text-[#3a2c28]">
                      {item.institute}
                    </p>
                    <p className="text-sm text-[#7a655f]">{item.program}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
};

export default MyChoicesPage;

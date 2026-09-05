import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadPersistedState, ProfileChips } from "../../components/MockAllotment";
import {
  loadAllRoundsData,
  loadCollegesData,
  buildSeatIndex,
  buildCatalog,
} from "../../utils/josaaSimulator";
import ListAnalyzer from "../../components/ListAnalyzer";

// Standalone page for "Analyse & Improve Your List" — same treatment as My
// Choices / Rounds History / Find Your Best Match: a real route, not a
// popup. Reads the persisted choices/profile from localStorage, then
// independently loads the JoSAA data needed to evaluate them.
const ListAnalyzerPage = () => {
  const [state, setState] = useState(null);
  const [rows, setRows] = useState(null);
  const [collegesByName, setCollegesByName] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setState(loadPersistedState());
    Promise.all([loadAllRoundsData(), loadCollegesData()])
      .then(([rowsData, colleges]) => {
        setRows(rowsData);
        setCollegesByName(colleges);
      })
      .catch((err) => setError(err.message || "Could not load JoSAA data."));
  }, []);

  if (!state) return null;

  const { choices, profile } = state;
  const profileValid =
    profile.category &&
    profile.gender &&
    profile.homeState &&
    Number(profile.mainRank) > 0 &&
    (profile.qualifiedJeeAdv !== "Yes" || Number(profile.advRank) > 0);

  const seatIndex = rows ? buildSeatIndex(rows) : null;
  const catalog =
    rows && collegesByName && profileValid
      ? buildCatalog(rows, profile, collegesByName)
      : [];

  return (
    <>
      <Head>
        <title>Analyse & Improve Your List — JoSAA Mock Allotment</title>
      </Head>
      <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-8">
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
            Analyse &amp; Improve Your List
          </h1>
        </div>
        <div className="mt-2">
          <ProfileChips profile={profile} />
        </div>

        <div className="mt-4">
          {choices.length === 0 ? (
            <p className="text-base text-[#5b4a45]">
              No choices found — add some in Choice Filling first.
            </p>
          ) : !profileValid ? (
            <p className="text-base text-[#5b4a45]">
              Fill in Student Info first to analyse your list.
            </p>
          ) : error ? (
            <p className="text-base text-[#b52326]">{error}</p>
          ) : !rows || !collegesByName ? (
            <p className="text-base text-[#5b4a45]">Loading JoSAA data…</p>
          ) : (
            <ListAnalyzer
              choices={choices}
              catalog={catalog}
              seatIndex={seatIndex}
              collegesByName={collegesByName}
              profile={profile}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default ListAnalyzerPage;

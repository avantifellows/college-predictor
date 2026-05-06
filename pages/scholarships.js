import Head from "next/head";
import dynamic from "next/dynamic";
import { ScholarshipTableSkeleton } from "../components/SkeletonLoader";

// Lazy-load the heavy browser component; skeleton shown while the chunk loads
const ScholarshipReferenceBrowser = dynamic(
  () => import("../components/ScholarshipReferenceBrowser"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#fdf8f6] px-4 py-8">
        <div className="mx-auto w-full max-w-6xl">
          <ScholarshipTableSkeleton />
        </div>
      </div>
    ),
  }
);

const ScholarshipsPage = () => {
  return (
    <>
      <Head>
        <title>Scholarships Reference - Home</title>
      </Head>
      <ScholarshipReferenceBrowser />
    </>
  );
};

export default ScholarshipsPage;

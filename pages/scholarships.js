import Head from "next/head";
import ScholarshipReferenceBrowser from "../components/ScholarshipReferenceBrowser";

const ScholarshipsPage = () => {
  return (
    <>
      <Head>
        <title>Scholarships Reference - Home</title>
      </Head>
      <main className="min-w-0">
        <ScholarshipReferenceBrowser />
      </main>
    </>
  );
};

export default ScholarshipsPage;

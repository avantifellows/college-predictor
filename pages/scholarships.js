import Head from "next/head";
import ScholarshipReferenceBrowser from "../components/ScholarshipReferenceBrowser";

const ScholarshipsPage = () => {
  return (
    <>
      <Head>
        <title>Scholarships Reference - Home</title>
      </Head>
      <ScholarshipReferenceBrowser maxSearchLength={120} />
    </>
  );
};

export default ScholarshipsPage;

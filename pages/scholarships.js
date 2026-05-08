import Head from "next/head";
import { useState } from "react";
import ScholarshipReferenceBrowser from "../components/ScholarshipReferenceBrowser";

const ScholarshipsPage = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <Head>
        <title>Scholarships Reference - Home</title>
      </Head>
      <main aria-busy={isLoading}>
        <ScholarshipReferenceBrowser onLoadingChange={setIsLoading} />
      </main>
    </>
  );
};

export default ScholarshipsPage;

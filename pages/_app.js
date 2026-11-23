import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import PortalSessionBootstrap from "../components/PortalSessionBootstrap";
import Analytics from "../components/Analytics";
import "../styles/globals.css";
import { useNavHistory } from "../utils/navHistory";
import { StudentDataProvider } from "../utils/studentData";

// One address per page for search engines: /predictor?exam=JEE and
// /predictor are the same page, so both point Google at /predictor
// instead of being listed as two results
const SITE = "https://futures.avantifellows.org";

function MyApp({ Component, pageProps }) {
  useNavHistory();
  const path = useRouter().asPath.split(/[?#]/)[0];
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        {/* a [slug] page knows its real path only in the browser */}
        {!path.includes("[") && (
          <link key="canonical" rel="canonical" href={SITE + path} />
        )}
      </Head>
      <Analytics />
      <PortalSessionBootstrap />
      <StudentDataProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </StudentDataProvider>
    </>
  );
}

export default MyApp;

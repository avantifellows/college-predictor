import Head from "next/head";
import Layout from "../components/Layout";
import PortalSessionBootstrap from "../components/PortalSessionBootstrap";
import Analytics from "../components/Analytics";
import "../styles/globals.css";
import { useNavHistory } from "../utils/navHistory";
import { StudentDataProvider } from "../utils/studentData";

function MyApp({ Component, pageProps }) {
  useNavHistory();
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
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

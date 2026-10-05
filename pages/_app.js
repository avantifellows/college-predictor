import Head from "next/head";
import Layout from "../components/Layout";
import PortalSessionBootstrap from "../components/PortalSessionBootstrap";
import Analytics from "../components/Analytics";
import "../styles/globals.css";
import { useNavHistory } from "../utils/navHistory";

function MyApp({ Component, pageProps }) {
  useNavHistory();
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Analytics />
      <PortalSessionBootstrap />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default MyApp;

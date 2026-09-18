import Head from "next/head";
import Layout from "../components/Layout";
import PortalSessionBootstrap from "../components/PortalSessionBootstrap";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PortalSessionBootstrap />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default MyApp;

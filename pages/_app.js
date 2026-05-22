import Head from "next/head";
import Layout from "../components/Layout";
import SeoHead from "../components/SeoHead";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <SeoHead />
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default MyApp;

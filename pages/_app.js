import Head from "next/head";
import Layout from "../components/Layout";
import "../styles/globals.css";
import { useEffect, useState } from "react";

function MyApp({ Component, pageProps }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleDark = () => {
    const html = document.documentElement;
    const nowDark = html.classList.toggle("dark");
    localStorage.setItem("theme", nowDark ? "dark" : "light");
    setIsDark(nowDark);
  };

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout isDark={isDark} toggleDark={toggleDark}>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default MyApp;
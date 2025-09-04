import React from "react";
import Head from "next/head";
import Navbar from "./navbar";

const Layout = ({ children }) => {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, user-scalable=yes"
        />
      </Head>
      <Navbar item1="College Predictor" item2="Scholarships" />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </>
  );
};

export default Layout;

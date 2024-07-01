import React from "react";
import Navbar from "./navbar";
// import Footer from "./Footer";

const Layout = ({ children }) => {
  return (
    <>
      <Navbar item1="College Predictor" item2="Scholarships" />
      <main>{children}</main>
    </>
  );
};

export default Layout;

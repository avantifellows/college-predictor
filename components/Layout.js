import React from "react";
import Navbar from "./navbar";

const Layout = ({ children }) => {
  return (
    <>
      <Navbar item1="College Predictor" item2="Scholarships" />
      <main>{children}</main>
    </>
  );
};

export default Layout;

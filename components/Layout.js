import React from "react";
import Navbar from "./navbar";

const Layout = ({ children, isDark, toggleDark }) => {
  return (
    <>
      <Navbar item1="College Predictor" item2="Scholarships" isDark={isDark} toggleDark={toggleDark} />
      <main>{children}</main>
    </>
  );
};

export default Layout;


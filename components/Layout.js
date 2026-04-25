import React from "react";
import Navbar from "./navbar";

const Layout = ({ children }) => {
  return (
    <div className="app-shell">
      <Navbar item1="College Predictor" item2="Scholarships" />
      <main className="fade-in-up">{children}</main>
    </div>
  );
};

export default Layout;

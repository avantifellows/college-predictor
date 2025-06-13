import React, { useState, useEffect } from "react";
import Navbar from "./navbar";
const Layout = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      return savedTheme || "light";
    }
    return "light";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const body = document.body;
      if (theme === "dark") {
        body.classList.add("dark-mode");
        body.classList.remove("light-mode");
      } else {
        body.classList.remove("dark-mode");
        body.classList.add("light-mode");
      }
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <>
      <Navbar
        item1="College Predictor"
        item2="Scholarships"
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main>{children}</main>
    </>
  );
};
export default Layout;

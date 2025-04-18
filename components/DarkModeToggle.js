"use client";
import { useEffect, useState } from "react";

const DarkModeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`text-white dark:text-white font-semibold px-3 py-1 transition-all hover:underline hover:font-bold`}
    >
      {isDark ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
};

export default DarkModeToggle;

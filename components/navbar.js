import Link from "next/link";
import React from "react";
import { Facebook, Instagram, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";

// Renders Navbar as General Component
const Navbar = ({ item1, item2, isDark, toggleDark }) => {
  const pathname = usePathname();
  return (
    <div className="border-b border-[#eaded8] bg-white shadow-sm transition-colors duration-300 dark:border-espresso-600/60 dark:bg-espresso-900">
      <div className="flex flex-row items-center justify-between px-4 py-1.5 md:px-8">
        <div className="relative h-8 w-28 md:h-10 md:w-36">
          <Link href="/">
            <img
              src="https://cdn.avantifellows.org/af_logos/avanti_logo_black_text.webp"
              alt="Avanti Fellows logo"
              className="h-full w-full object-contain cursor-pointer dark:rounded-md dark:bg-white dark:p-1"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle button */}
          <button
            id="dark-mode-toggle"
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eaded8] bg-[#fdf8f6] text-[#5b1f20] transition-all duration-200 hover:bg-[#f4e8e4] dark:border-espresso-600/60 dark:bg-espresso-700 dark:text-gray-200 dark:hover:bg-espresso-600"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="flex gap-1.5">
            <SocialIcon socialLink={"https://www.facebook.com/avantifellows"}>
              <Facebook color="#fff" fill="#fff" strokeWidth="0.1" />
            </SocialIcon>
            <SocialIcon socialLink={"https://www.instagram.com/avantifellows"}>
              <Instagram color="#fff" />
            </SocialIcon>
          </div>
        </div>
      </div>
      <div className="w-full bg-[#B52326] px-4 py-2 text-white md:px-8 dark:bg-[#2d0d0f]">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                pathname === "/"
                  ? "bg-white/20"
                  : "hover:bg-white/10 cursor-pointer"
              }`}
            >
              {item1}
            </Link>
            <Link
              href="/scholarships"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                pathname === "/scholarships"
                  ? "bg-white/20"
                  : "hover:bg-white/10 cursor-pointer"
              }`}
            >
              {item2}
            </Link>
          </div>
          <Link
            href="https://cv-generator.avantifellows.org/"
            className="ml-auto inline-flex shrink-0 items-center justify-center rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#8f2e31] transition hover:bg-[#f8efec] dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            target="_blank"
            rel="noopener noreferrer"
          >
            CV Generator
          </Link>
        </div>
      </div>
    </div>
  );
};

const SocialIcon = ({ children, socialLink }) => {
  return (
    <a
      href={socialLink}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B52326] dark:bg-white/10"
    >
      {children}
    </a>
  );
};

export default Navbar;

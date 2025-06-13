import Link from "next/link";
import React from "react";
import { Facebook, Instagram } from "lucide-react";
import { usePathname } from "next/navigation";
import { Moon } from "lucide-react";
import { Sun } from "lucide-react";

const Navbar = ({ item1, item2, theme, toggleTheme }) => {
  const pathname = usePathname();

  return (
    <div
      className={`${
        theme === "dark" ? "bg-[#F0F0F0]" : "bg-white"
      } navtop shadow-md transition-colors duration-300`}
    >
      <div className="flex flex-row justify-between items-center px-4 md:px-8 py-2">
        <div className="relative w-32 md:w-40 aspect-video">
          <Link href="/">
            <img
              src="https://cdn.avantifellows.org/af_logos/avanti_logo_black_text.webp"
              alt="Avanti Fellows logo"
              layout="fill"
              className="object-contain cursor-pointer"
            />
          </Link>
        </div>

        <div className="flex gap-4">
          <SocialIcon socialLink={"https://www.facebook.com/avantifellows"}>
            <Facebook color="#fff" fill="#fff" strokeWidth="0.1" />
          </SocialIcon>
          <SocialIcon socialLink={"https://www.instagram.com/avantifellows"}>
            <Instagram color="#fff" />
          </SocialIcon>
        </div>
      </div>

      <div
        className={`${
          theme === "dark" ? "bg-red-800" : "bg-[#B52326]"
        } text-xl w-full h-16 flex items-center justify-center text-white transition-colors duration-300`}
      >
        <div className="flex text-white text-lg gap-10 relative w-full justify-center items-center px-4">
          <Link
            href="/"
            className={`link ${
              pathname === "/" ? "font-bold" : "hover:underline cursor-pointer"
            }`}
          >
            {item1}
          </Link>
          <Link
            href="/scholarships"
            className={`link ${
              pathname === "/scholarships"
                ? "font-bold"
                : "hover:underline cursor-pointer"
            }`}
          >
            {item2}
          </Link>

          <button
            onClick={toggleTheme}
            className=" absolute right-4 top-1/2 transform -translate-y-1/2
                      transition-colors duration-300 focus:outline-none"
          >
            <div
              className={`text-3xl p-2 rounded-full ${
                theme === "dark" ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {theme === "dark" ? <Moon /> : <Sun />}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const SocialIcon = ({ children, socialLink }) => {
  return (
    <a
      href={socialLink}
      className={`bg-[#B52326] rounded-full flex items-center justify-center h-10 w-10 transition-colors duration-300`}
    >
      {children}
    </a>
  );
};

export default Navbar;

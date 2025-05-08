import Link from "next/link";
import React from "react";
import { Facebook, Instagram } from "lucide-react";
import { usePathname } from "next/navigation";
import DarkModeToggle from "./DarkModeToggle"; 

const Navbar = ({ item1, item2 }) => {
  const pathname = usePathname();

  return (
    <div className="bg-white shadow-md">
      <div className="flex flex-row justify-between items-center px-4 md:px-8 py-2">
        <div className="relative w-32 md:w-40 aspect-video">
          <img
            src="https://cdn.avantifellows.org/af_logos/avanti_logo_black_text.webp"
            alt="Avanti Fellows logo"
            className="object-contain w-full h-full"
          />
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

      
      <div className="bg-[#B52326] w-full h-16 flex items-center justify-center px-4 md:px-8 relative">
       <div className="flex text-white text-lg gap-10">
          <Link
            href="/"
            className={`cursor-pointer transition-all ${
              pathname === "/"
                ? "font-bold"
                : "hover:underline font-normal"
            }`}
          >
            {item1}
          </Link>
          <Link
            href="/scholarships"
            className={`cursor-pointer transition-all ${
              pathname === "/scholarships"
                ? "font-bold"
                : "hover:underline font-normal"
            }`}
          >
            {item2}
          </Link>
        </div>
        
        <div className="absolute right-4">
          <DarkModeToggle />
        </div>
      </div>
    </div>
  );
};

const SocialIcon = ({ children, socialLink }) => {
  return (
    <a
      href={socialLink}
      className="rounded-full bg-[#B52326] flex items-center justify-center h-10 w-10"
    >
      {children}
    </a>
  );
};

export default Navbar;

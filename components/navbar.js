import Image from "next/image";
import Link from "next/link";
import React from "react";

// Renders Navbar as General Component
const Navbar = ({ item1, item2 }) => {
  return (
    <div className="bg-white shadow-md">
      <div className="flex flex-row justify-between items-center px-4 md:px-8 py-2">
        <div className="relative w-32 md:w-40 aspect-video">
          <Image
            src="/AvantiFellowsLogo.svg"
            alt="Avanti Fellows logo"
            layout="fill"
            objectFit="contain"
          />
        </div>
      </div>
      <div className="bg-[#B52326] w-full h-16 flex items-center justify-center">
        <div className="flex text-white text-lg gap-10">
          <Link href="/">
            <p className="hover:font-semibold active:font-light cursor-pointer">{item1}</p>
          </Link>
          <Link href="/scholarships">
            <p className="hover:font-semibold active:font-light cursor-pointer">{item2}</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;

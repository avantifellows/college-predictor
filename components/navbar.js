import Image from "next/image";
import Link from "next/link";
import React from "react";

// Renders Navbar as General Component
const Navbar = ({ item1, item2 }) => {
  return (
    <>
      <div>
        <div className="flex flex-row justify-between items-center md:px-5">
          <div className="relative w-32 aspect-video">
            <Image
              src="/AvantiFellowsLogo.svg"
              alt="Avanti fellows logo"
              fill
            />
          </div>
        </div>
        <div>
          <div className="flex text-white text-l gap-5 pl-10 items-center bg-[#B52326] w-full h-16">
            <Link href="/">
              <p className="hover:font-semibold active:font-light cursor-pointer ">
                {item1}
              </p>
            </Link>
            <Link href="/scholarships">
              <p className="hover:font-semibold active:font-light cursor-pointer ">
                {item2}
              </p>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;

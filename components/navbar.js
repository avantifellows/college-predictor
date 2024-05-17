import Image from "next/image";
import Link from "next/link";
import React from "react";
import Button from "./button";

// Renders Navbar as General Component
const Navbar = ({ item1, item2 }) => {
  return (
    <>
      <div className="flex justify-between">
        <div className="flex flex-row justify-between items-center md:px-5">
          <div className="relative w-32 aspect-video">
            <Link href="/">
              <Image
                src="/AvantiFellowsLogo.svg"
                alt="Avanti fellows logo"
                fill
              />
            </Link>
          </div>
        </div>
        <div>
          <div className="flex text-l gap-6 pl-10 items-center mx-5 w-full h-16">
            <Link href="/">
              <Button buttonText={item1} />
            </Link>
            <Link href="/scholarships">
              <Button buttonText={item2} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;

import Image from "next/image";
import Link from "next/link";
import React from "react";

const Navbar = ({ item1, item2 }) => {
  return (
    <>
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="relative w-32 aspect-video">
                <Image
                  src="/AvantiFellowsLogo.svg"
                  alt="Avanti fellows logo"
                  fill
                />
              </div>
            </div>
            <div>
              <div className="flex space-x-4">
                <Link
                  href="/"
                  className="px-3 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-red-500 transition duration-300"
                >
                  {item1}
                </Link>
                <Link
                  href="/scholarships"
                  className="px-3 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-red-500 transition duration-300"
                >
                  {item2}
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* <div className="bg-[#B52326] h-1"></div> */}
      </nav>
    </>
  );
};

export default Navbar;
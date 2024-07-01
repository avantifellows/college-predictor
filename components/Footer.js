import React from "react";

const Footer = () => {
  return (
    <div className="bg-[#B52326] w-full h-16 flex items-center justify-center">
      <div className="flex text-white text-center text-lg gap-10">
        <p>
          Designed and developed by{" "}
          <span className="font-bold">
            <a href="https://www.avantifellows.org/" target="_blank">Avanti Fellow</a>
          </span>{" "}
          : Enabling quality in education
        </p>
      </div>
    </div>
  );
};

export default Footer;

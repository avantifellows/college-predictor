import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import React from "react";
import { Facebook } from "lucide-react";
import { Instagram } from "lucide-react";
import { usePathname } from "next/navigation";

const bookmarksFilePath = path.join(process.cwd(), "data", "bookmarks.json");

export async function handler(req, res) {
  try {
    const { method } = req;

    // Read existing bookmarks
    const bookmarksData = await fs.readFile(bookmarksFilePath, "utf-8");
    const bookmarks = JSON.parse(bookmarksData);

    if (method === "GET") {
      // Return all bookmarks
      res.status(200).json(bookmarks);
    } else if (method === "POST") {
      // Add a new bookmark
      const { userId, itemId, itemType } = req.body;
      if (!userId || !itemId || !itemType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      bookmarks.push({ userId, itemId, itemType, createdAt: new Date() });
      await fs.writeFile(bookmarksFilePath, JSON.stringify(bookmarks, null, 2));
      res.status(201).json({ message: "Bookmark added successfully" });
    } else if (method === "DELETE") {
      // Remove a bookmark
      const { userId, itemId } = req.body;
      const updatedBookmarks = bookmarks.filter(
        (bookmark) => !(bookmark.userId === userId && bookmark.itemId === itemId)
      );
      await fs.writeFile(bookmarksFilePath, JSON.stringify(updatedBookmarks, null, 2));
      res.status(200).json({ message: "Bookmark removed successfully" });
    } else {
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("Error handling bookmarks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Renders Navbar as General Component
const Navbar = ({ item1, item2 }) => {
  const pathname = usePathname();
  return (
    <div className="bg-white shadow-md">
      <div className="flex flex-row justify-between items-center px-4 md:px-8 py-2">
        <div className="relative w-32 md:w-40 aspect-video">
          <img
            src="https://cdn.avantifellows.org/af_logos/avanti_logo_black_text.webp"
            alt="Avanti Fellows logo"
            layout="fill"
            className="object-contain"
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
      <div className="bg-[#B52326] text-xl w-full h-16 flex items-center justify-center text-white">
        <div className="flex text-white text-lg gap-10">
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
        </div>
      </div>
    </div>
  );
};

const SocialIcon = ({ children, socialLink }) => {
  return (
    <a
      href={socialLink}
      className=" rounded-full bg-[#B52326] flex items-center justify-center h-10 w-10"
    >
      {children}
    </a>
  );
};

const ScholarshipTable = ({ filteredData, toggleRowExpansion, expandedRows }) => {
  const headers = ["Scholarship Name", "Status", "Application Link"];
  const mainFields = ["Scholarship Name", "Status"];

  return (
    <div className="w-full mx-auto overflow-x-auto">
      <table className="w-full mx-auto border-collapse text-sm sm:text-base border border-gray-300">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="p-2 border border-gray-300">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item, index) => (
            <React.Fragment key={index}>
              <tr className={`${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}>
                {mainFields.map((field, fieldIndex) => (
                  <td key={fieldIndex} className="p-2 border border-gray-300">
                    {item[field]}
                  </td>
                ))}
                <td className="p-2 border border-gray-300">
                  <a
                    href={item["Application Link"]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Apply Now
                  </a>
                </td>
              </tr>
              {expandedRows.includes(index) && (
                <tr>
                  <td colSpan={headers.length} className="p-2 border border-gray-300">
                    <div className="text-sm">{item["Description"]}</div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export { ScholarshipTable };
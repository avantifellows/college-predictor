import Link from "next/link";

// A big-icon tile: rounded square icon, name, one short line. Two per row on
// a phone, a full row on desktop; `big` for the four home tiles.
export default function IconTile({
  href,
  icon: Icon,
  title,
  line,
  external,
  big,
}) {
  const body = (
    <>
      <span
        className={`inline-flex items-center justify-center rounded-2xl bg-[#fbeeec] text-[#B52326] transition group-hover:bg-[#B52326] group-hover:text-white ${
          big ? "h-16 w-16 sm:h-20 sm:w-20" : "h-14 w-14 sm:h-16 sm:w-16"
        }`}
      >
        <Icon size={big ? 34 : 28} strokeWidth={1.6} />
      </span>
      <span
        className={`mt-3 font-black leading-tight text-[#2f2320] ${
          big ? "text-lg sm:text-xl" : "text-base sm:text-lg"
        }`}
      >
        {title}
      </span>
      {line ? (
        <span className="mt-1 max-w-[16rem] text-[13px] leading-snug text-[#7a635d] sm:text-sm">
          {line}
        </span>
      ) : null}
    </>
  );
  const cls =
    "group flex flex-col items-center rounded-2xl px-3 py-5 text-center transition hover:bg-white hover:shadow-sm";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

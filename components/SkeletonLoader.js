import React from "react";

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-[#e8ddd9] ${className}`} />
);

export const CollegeTableSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-[#eaded8] bg-white shadow-sm">
    {/* Search bar */}
    <div className="flex items-center justify-between border-b border-[#eaded8] px-6 py-4">
      <Skeleton className="h-10 w-full max-w-sm" />
    </div>
    {/* Table header */}
    <div className="grid grid-cols-4 gap-6 border-b border-[#eaded8] bg-[#fdf8f6] px-6 py-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
    </div>
    {/* Table rows */}
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="grid grid-cols-4 gap-6 border-b border-[#eaded8] px-6 py-4 last:border-0"
      >
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    ))}
  </div>
);

export const ScholarshipTableSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-[#eaded8] bg-white shadow-sm">
    {/* Table header */}
    <div className="grid grid-cols-3 gap-6 border-b border-[#eaded8] bg-[#fdf8f6] px-6 py-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
    {/* Table rows */}
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="grid grid-cols-3 gap-6 border-b border-[#eaded8] px-6 py-4 last:border-0"
      >
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ))}
  </div>
);

"use client";

import { Skeleton } from "@/components/shared/ui/skeleton/Skeleton";
import { cn } from "@/lib/utils";

interface FleetTableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function FleetTableSkeleton({
  rows = 8,
  cols = 6,
  className,
}: FleetTableSkeletonProps) {
  return (
    <div className={cn("w-full h-full flex flex-col p-6 space-y-6", className)}>
      {/* Table Header Area */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {/* Table Controls (Search etc) */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-full max-w-sm rounded-[12px]" />
        <div className="flex gap-2 ml-auto">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Table Body Area */}
      <div className="flex-1 space-y-4">
        {/* Header Row */}
        <div className="flex gap-4 pb-2 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton
              key={`h-${i}`}
              className={cn(
                "h-4",
                i === 0 ? "w-48" : "flex-1",
                i >= cols - 1 ? "hidden sm:block" : ""
              )}
            />
          ))}
        </div>

        {/* Actionable Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-4 items-center py-4 border-b border-slate-50 last:border-0"
          >
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={cn(
                  colIndex === 0 ? "w-48" : "flex-1",
                  colIndex >= cols - 1 ? "hidden sm:block" : ""
                )}
              >
                {colIndex === 0 ? (
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-28 rounded-md" />
                      <Skeleton className="h-2 w-20 rounded-sm" />
                    </div>
                  </div>
                ) : (
                  <Skeleton
                    className={cn(
                      "h-3 w-3/4 rounded-md",
                      colIndex % 2 === 0 ? "w-1/2" : "w-2/3"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

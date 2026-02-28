"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/shared/ui/breadcrumb";

const toLabel = (segment: string) =>
  segment.replace(/[-_]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

const segmentLabelMap: Record<string, string> = {
  crm: "CRM",
  hr: "HR Module",
  fleet: "Fleet Module",
  inventory: "Inventory Module",
  internationaltrade: "International Trade Module",
  admin: "Platform Admin",
  settings: "Settings",
  dashboard: "Dashboard",
};

const getSegmentLabel = (segment: string) =>
  segmentLabelMap[segment.toLowerCase()] ?? toLabel(segment);

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const trailStart = segments[0]?.toLowerCase() === "dashboard" ? 1 : 0;
  const trail = segments.slice(trailStart);

  if (segments.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {trail.length === 0 ? (
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {trail.map((segment, index, rest) => {
          const href = `/${trail.slice(0, index + 1).join("/")}`;
          const isLast = index === rest.length - 1;
          return (
            <div key={href} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{getSegmentLabel(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{getSegmentLabel(segment)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

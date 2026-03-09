type TabSkeletonProps = {
  rows?: number;
  cards?: number;
};

export default function TabSkeleton({ rows = 8, cards = 3 }: TabSkeletonProps) {
  return (
    <div className="h-full min-h-0">
      <div className="h-full rounded-[20px] border border-border bg-white overflow-hidden">
        <div className="border-b border-border/70 px-6 py-4">
          <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={`crm-tab-loading-row-${index}`}
              className="h-12 w-full animate-pulse rounded bg-muted/50"
            />
          ))}
        </div>
      </div>
      <div className="hidden grid-cols-3 gap-4 md:grid mt-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={`crm-tab-loading-card-${index}`}
            className="h-24 animate-pulse rounded-xl border border-border bg-white"
          />
        ))}
      </div>
    </div>
  );
}

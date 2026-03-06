export default function CrmLoading() {
  return (
    <div className="flex h-[calc(100dvh-145px)] lg:h-[calc(100dvh-170px)] min-h-0 min-w-0 flex-col gap-6 overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted/60" />
          <div className="h-5 w-60 animate-pulse rounded bg-muted/50" />
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto">
          <div className="h-10 w-full sm:w-[320px] animate-pulse rounded-xl border border-border bg-muted/35" />
          <div className="h-10 w-32 animate-pulse rounded-xl border border-border bg-muted/35" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-[20px] border border-border bg-white">
        <div className="border-b border-border/70 px-6 py-4">
          <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={`crm-route-loading-row-${index}`}
              className="h-12 w-full animate-pulse rounded bg-muted/50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

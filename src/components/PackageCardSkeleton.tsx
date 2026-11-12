interface Props {
  count?: number;
  viewMode?: "grid" | "list";
}

export function PackageCardSkeleton({ count = 8, viewMode = "grid" }: Props) {
  const items = Array.from({ length: count });

  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {items.map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 animate-shimmer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800/80 shrink-0" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded-md bg-slate-800" />
                <div className="h-3 w-16 rounded-md bg-slate-800/60" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-20 rounded-xl bg-slate-800" />
              <div className="h-8 w-8 rounded-xl bg-slate-800/80" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
      {items.map((_, i) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 sm:p-3.5 space-y-3 min-h-[140px] animate-shimmer"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/90 shrink-0" />
            <div className="h-4 w-12 rounded-full bg-slate-800/70" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-3/4 rounded-md bg-slate-800" />
            <div className="h-3 w-1/2 rounded-md bg-slate-800/60" />
          </div>
          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
            <div className="h-5 w-16 rounded-md bg-slate-800" />
            <div className="h-7 w-7 rounded-lg bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

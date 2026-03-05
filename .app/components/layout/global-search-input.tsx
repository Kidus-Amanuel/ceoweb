"use client";

import {
  RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Search, Loader2 } from "lucide-react";
import { getGlobalSearchResultsAction } from "@/app/api/crm/crm";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Input } from "@/components/shared/ui/input/Input";
import { cn } from "@/lib/utils";

type GlobalHit = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  category: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  companyId?: string | null;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
};

export function GlobalSearchInput({
  value,
  onChange,
  companyId,
  placeholder = "Search Intelligent...",
  className,
  inputClassName,
  iconClassName,
  inputRef,
}: Props) {
  const router = useRouter();
  const instanceId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const requestSeqRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalHit[]>([]);
  const [open, setOpen] = useState(false);
  const [panelRect, setPanelRect] = useState({ top: 0, left: 0, width: 0 });
  const debouncedQuery = useDebouncedValue(value.trim(), 220);

  const updatePanelRect = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelRect({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const openPanel = useCallback(() => {
    updatePanelRect();
    setOpen(true);
    window.dispatchEvent(
      new CustomEvent("global-search-open", { detail: instanceId }),
    );
  }, [instanceId, updatePanelRect]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail !== instanceId) setOpen(false);
    };
    window.addEventListener("global-search-open", onOpen as EventListener);
    return () =>
      window.removeEventListener("global-search-open", onOpen as EventListener);
  }, [instanceId]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updatePanelRect();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePanelRect]);

  useEffect(() => {
    if (!open) return;
    const onOutsidePointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const isInsideInput = !!(target && rootRef.current?.contains(target));
      const isInsidePanel = !!(target && panelRef.current?.contains(target));
      if (isInsideInput || isInsidePanel) return;
      setOpen(false);
      setResults([]);
      onChange("");
    };
    document.addEventListener("mousedown", onOutsidePointer);
    return () => document.removeEventListener("mousedown", onOutsidePointer);
  }, [onChange, open]);

  useEffect(() => {
    if (!debouncedQuery) {
      requestSeqRef.current += 1;
      return;
    }

    const requestSeq = ++requestSeqRef.current;
    let disposed = false;

    const run = async () => {
      setLoading(true);
      const res = await getGlobalSearchResultsAction({
        query: debouncedQuery,
        companyId: companyId ?? undefined,
      });

      if (disposed || requestSeq !== requestSeqRef.current) return;
      setLoading(false);
      if (!res.success || !res.data) {
        setResults([]);
        openPanel();
        return;
      }
      setResults(res.data);
      openPanel();
    };

    void run();
    return () => {
      disposed = true;
    };
  }, [companyId, debouncedQuery, openPanel]);

  const grouped = useMemo(() => {
    const map = new Map<string, GlobalHit[]>();
    results.forEach((hit) => {
      if (!map.has(hit.category)) map.set(hit.category, []);
      map.get(hit.category)!.push(hit);
    });
    return Array.from(map.entries());
  }, [results]);

  const showResults = open && value.trim().length > 0;
  const canPortal = typeof window !== "undefined";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-xl border border-[#BEC9DD] bg-background px-2">
        <Search
          className={cn("h-4 w-4 text-blue-500 shrink-0", iconClassName)}
        />
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => value.trim() && openPanel()}
          onBlur={() =>
            setTimeout(() => {
              setOpen(false);
              setResults([]);
              onChange("");
            }, 120)
          }
          placeholder={placeholder}
          className={cn(
            "h-9 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0",
            inputClassName,
          )}
        />
      </div>

      {showResults && canPortal
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[99999] rounded-xl border-2 border-border bg-background shadow-2xl p-2 max-h-[420px] overflow-auto"
              style={{
                top: panelRect.top,
                left: panelRect.left,
                width: panelRect.width,
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  No results.
                </div>
              ) : (
                grouped.map(([category, hits]) => (
                  <div key={category} className="mb-2 last:mb-0">
                    <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {category}
                    </p>
                    {hits.map((hit) => (
                      <button
                        key={hit.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setOpen(false);
                          setResults([]);
                          onChange("");
                          router.push(hit.href);
                        }}
                        className="block w-full text-left rounded-lg px-2 py-2 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/60"
                      >
                        <p className="text-sm font-medium text-foreground truncate">
                          {hit.title}
                        </p>
                        {hit.subtitle ? (
                          <p className="text-xs text-muted-foreground truncate">
                            {hit.subtitle}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

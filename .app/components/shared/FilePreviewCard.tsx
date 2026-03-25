"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { toast } from "@/hooks/use-toast";

interface FilePreviewCardProps {
  file: any;
}

const BUCKET = "erp-files";
const IMAGE_EXTS = /\.(jpg|jpeg|png|webp|gif|svg)$/i;

/**
 * Renders a file attachment card with a live signed-URL image preview.
 * Works with private Supabase storage buckets by generating signed URLs
 * both for previewing images and for opening files in a new tab.
 */
export function FilePreviewCard({ file }: FilePreviewCardProps) {
  const supabase = createClient();
  const path = file.path || file.storage_path;
  const name = file.name || file.file_name || "Attachment";
  const isImage = IMAGE_EXTS.test(name);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(isImage && !!path);

  useEffect(() => {
    if (!isImage || !path) return;

    let cancelled = false;
    setLoading(true);

    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoading(false);
          return;
        }
        setPreviewUrl(data.signedUrl);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const handleOpen = async () => {
    if (!path) {
      const fallback = file.url || file.file_url;
      if (fallback) window.open(fallback, "_blank");
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 3600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast.error(`Could not open file: ${err.message}`);
    }
  };

  return (
    <div className="group relative bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all min-w-[200px] max-w-[280px]">
      {/* Preview area */}
      <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center border-b border-slate-100 overflow-hidden">
        {loading ? (
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        ) : isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <FileText className="w-10 h-10 text-slate-200" />
        )}
      </div>

      {/* Info bar */}
      <div className="p-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black text-slate-800 truncate leading-none">
          {name}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="p-1.5 h-auto w-auto hover:text-indigo-600 transition-colors flex-shrink-0"
          onClick={handleOpen}
          title="Open file in new tab"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import {
  Upload,
  X,
  File as FileIcon,
  Download,
  Plus,
  Loader2,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/ui/dialog/Dialog";
import { Button } from "@/components/shared/ui/button/Button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

interface FileObject {
  id: string;
  name: string;
  url: string;
  path: string;
  type: string;
  size: number;
}

interface FilesEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (files: FileObject[]) => void;
  initialFiles?: FileObject[];
  title?: string;
  tableName?: string;
  recordId?: string;
}

export default function FilesEditor({
  open,
  onClose,
  onSave,
  initialFiles = [],
  title = "Manage Files",
  tableName = "general",
  recordId = "unknown",
}: FilesEditorProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [files, setFiles] = useState<FileObject[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !user?.companyId)
      return;

    setIsUploading(true);

    const nextFiles: FileObject[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.companyId}/${tableName}/${recordId}/${fileName}`;

      try {
        // 1. Upload to storage
        const { error: uploadError, data: storageData } = await supabase.storage
          .from("erp-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Create entry in attachments table
        const { data: attachmentData, error: dbError } = await supabase
          .from("attachments")
          .insert({
            company_id: user.companyId,
            user_id: user.id,
            table_name: tableName,
            record_id:
              recordId === "new-row"
                ? "00000000-0000-0000-0000-000000000000"
                : recordId,
            name: file.name,
            storage_path: filePath,
            file_type: file.type,
            file_size: file.size,
          })
          .select("id")
          .single();

        if (dbError) {
          // Cleanup storage if DB insert fails
          await supabase.storage.from("erp-files").remove([filePath]);
          throw dbError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("erp-files").getPublicUrl(filePath);

        nextFiles.push({
          id: attachmentData.id, // Use DB record ID
          name: file.name,
          url: publicUrl,
          path: filePath,
          type: file.type,
          size: file.size,
        });
      } catch (error: any) {
        toast.error(`Error uploading ${file.name}: ${error.message}`);
      }
    }

    setFiles((prev) => [...prev, ...nextFiles]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (path: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("erp-files")
        .createSignedUrl(path, 60, {
          download: fileName,
        });

      if (error) throw error;

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      toast.error(`Error downloading file: ${error.message}`);
    }
  };

  const removeFile = async (id: string, path: string) => {
    try {
      // 1. Delete from DB (RLS will handle permissions based on company_id)
      const { error: dbError } = await supabase
        .from("attachments")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      // 2. Delete from storage
      const { error: storageError } = await supabase.storage
        .from("erp-files")
        .remove([path]);

      if (storageError)
        console.warn("Storage cleanup failed:", storageError.message);

      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success("File removed successfully");
    } catch (error: any) {
      toast.error(`Error deleting file: ${error.message}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type.includes("pdf")) return FileText;
    if (type.includes("zip") || type.includes("rar")) return FileArchive;
    return FileIcon;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[24px] border-none shadow-2xl bg-white">
        <DialogHeader className="px-6 py-5 border-b border-gray-100 bg-[#F9FBFF]">
          <DialogTitle className="text-xl font-bold text-[#2F3A4E]">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div
            className={cn(
              "group relative flex flex-col items-center justify-center border-2 border-dashed rounded-[20px] p-10 transition-all cursor-pointer",
              isUploading
                ? "border-indigo-300 bg-indigo-50/30"
                : "border-gray-200 hover:border-indigo-400 hover:bg-gray-50/50",
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              multiple
            />
            <div className="flex flex-col items-center gap-3">
              {isUploading ? (
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-indigo-600" />
                </div>
              )}
              <div className="text-center">
                <p className="text-base font-semibold text-[#37352F]">
                  {isUploading
                    ? "Uploading files..."
                    : "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Maximum file size 50MB
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p>No files uploaded yet</p>
              </div>
            ) : (
              files.map((file) => {
                const Icon = getFileIcon(file.type);
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#37352F] truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatSize(file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        onClick={() => handleDownload(file.path, file.name)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={() => removeFile(file.id, file.path)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl px-6 h-11 font-semibold border-gray-200 text-gray-600 hover:bg-white"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave(files)}
            className="rounded-xl px-8 h-11 font-semibold bg-[#2F3A4E] hover:bg-[#232C3D] text-white shadow-lg shadow-[#2F3A4E]/20"
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

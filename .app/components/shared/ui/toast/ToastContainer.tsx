"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, XCircle, X } from "lucide-react";
import { useToastStore, Toast as ToastType } from "@/hooks/use-toast";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastType;
  onDismiss: (id: string) => void;
}) {
  const icons = {
    success: <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />,
    error: <XCircle className="w-4.5 h-4.5 text-rose-500" />,
    info: <Info className="w-4.5 h-4.5 text-blue-500" />,
    warning: <AlertCircle className="w-4.5 h-4.5 text-amber-500" />,
  };

  const bgStyles = {
    success: "bg-[#F4FDF9] border-[#D1F2E0]",
    error: "bg-[#FFF8F8] border-[#FFE2E2]",
    info: "bg-[#F5FAFF] border-[#E1F0FF]",
    warning: "bg-[#FFFBF5] border-[#FFEEC8]",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex gap-3 p-4 rounded-2xl border shadow-[0_12px_32px_rgba(0,0,0,0.06)] overflow-hidden relative ${bgStyles[toast.type]}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 pr-4 min-w-0">
        {toast.title && (
          <p className="text-[14px] font-black text-slate-800 leading-tight mb-1">
            {toast.title}
          </p>
        )}
        <p className="text-[13px] font-medium text-slate-600 leading-normal">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar (optional visually premium touch) */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "0%" }}
        transition={{ duration: (toast.duration || 5000) / 1000, ease: "linear" }}
        className="absolute bottom-0 left-0 h-0.5 w-full bg-slate-900/5"
      />
    </motion.div>
  );
}

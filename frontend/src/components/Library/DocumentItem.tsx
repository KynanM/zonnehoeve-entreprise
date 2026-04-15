"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FileText, Star, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentItemProps {
  doc: string;
  isPinned: boolean;
  isPreviewing: boolean;
  previewText?: string;
  onHover: (doc: string | null) => void;
  onClick: (doc: string) => void;
  onDownload?: (doc: string, e: React.MouseEvent) => void;
  onPin: (doc: string, e: React.MouseEvent) => void;
  theme: "light" | "night";
}

export default function DocumentItem({
  doc,
  isPinned,
  isPreviewing,
  previewText,
  onHover,
  onClick,
  onDownload,
  onPin,
  theme
}: DocumentItemProps) {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      onMouseEnter={() => onHover(doc)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(doc)}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-xl border cursor-pointer relative group transition-all shadow-sm",
        theme === 'night'
          ? "bg-stone-800 border-stone-700 hover:border-emerald-500/50 hover:bg-stone-700/50"
          : "bg-white border-stone-100 hover:border-emerald-200 hover:bg-emerald-50/30"
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors",
          theme === 'night'
            ? "bg-stone-900 text-stone-500 group-hover:bg-emerald-900/50 group-hover:text-emerald-400"
            : "bg-stone-50 text-stone-400 group-hover:bg-emerald-100 group-hover:text-emerald-600"
        )}>
          PDF
        </div>
        <span className={cn(
          "text-[13px] font-bold truncate transition-colors",
          theme === 'night' ? "text-stone-300 group-hover:text-white" : "text-stone-700 group-hover:text-emerald-900"
        )}>
          {doc}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onDownload && (
          <button 
            onClick={(e) => onDownload(doc, e)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-stone-400 hover:bg-emerald-50 hover:text-emerald-600"
            title="Downloaden"
          >
            <Download size={14} />
          </button>
        )}
        <button 
          onClick={(e) => onPin(doc, e)}
          className={cn(
            "p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all",
            isPinned ? "opacity-100 text-amber-50" : "text-stone-400 hover:bg-amber-50 hover:text-amber-500"
          )}
        >
          <Star size={14} fill={isPinned ? "currentColor" : "none"} />
        </button>
      </div>
      
      {/* Tooltip Preview */}
      <AnimatePresence>
        {isPreviewing && previewText && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: -10 }} 
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -10 }}
            className={cn(
              "absolute left-[105%] top-0 z-50 w-72 p-5 rounded-2xl shadow-2xl pointer-events-none border backdrop-blur-md",
              theme === 'night' 
                ? "bg-stone-900/95 border-stone-700 text-stone-200" 
                : "bg-stone-900/90 border-stone-800 text-white"
            )}
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
              <FileText size={14} className="text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Snelle Voorbeeld</span>
            </div>
            <p className="text-xs italic leading-relaxed font-medium">"{previewText}"</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

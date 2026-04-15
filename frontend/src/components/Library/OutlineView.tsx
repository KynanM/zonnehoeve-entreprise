"use client";

import { motion } from "framer-motion";
import { List, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutlineItem {
  title: string;
  page: number;
}

interface OutlineViewProps {
  outline: OutlineItem[];
  onPageClick: (page: string) => void;
  onClose: () => void;
  theme: "light" | "night";
}

export default function OutlineView({
  outline,
  onPageClick,
  onClose,
  theme
}: OutlineViewProps) {
  return (
    <motion.div 
      initial={{ x: -250 }} 
      animate={{ x: 0 }} 
      exit={{ x: -250 }}
      className={cn(
        "w-72 border-r overflow-y-auto p-5 z-10 shadow-2xl backdrop-blur-md",
        theme === 'night' ? "bg-stone-900/95 border-stone-700" : "bg-white/95 border-stone-100"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <List size={14} className="text-emerald-500" />
          <p className={cn(
            "text-[10px] font-extrabold uppercase tracking-widest",
            theme === 'night' ? "text-stone-500" : "text-stone-400"
          )}>
            Inhoudsopgave
          </p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-md transition-colors lg:hidden">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-1.5">
        {outline.map((item, idx) => (
          <button 
            key={idx} 
            onClick={() => onPageClick(`page=${item.page}`)}
            className={cn(
              "w-full text-left p-3.5 rounded-xl text-xs font-bold transition-all flex justify-between items-center group border border-transparent",
              theme === 'night'
                ? "text-stone-400 hover:bg-stone-800 hover:text-emerald-400 hover:border-stone-700"
                : "text-stone-600 hover:bg-emerald-50/50 hover:text-emerald-700 hover:border-emerald-100"
            )}
          >
            <div className="flex items-center gap-2 truncate pr-2">
              <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 -ml-1 transition-all" />
              <span className="truncate">{item.title}</span>
            </div>
            <span className={cn(
              "text-[9px] px-2 py-0.5 rounded-full transition-colors shrink-0",
              theme === 'night' 
                ? "bg-stone-800 group-hover:bg-emerald-900/50" 
                : "bg-stone-100 group-hover:bg-emerald-100"
            )}>
              p. {item.page}
            </span>
          </button>
        ))}
      </div>
      
      {outline.length === 0 && (
        <div className="text-center py-10">
          <p className="text-xs text-stone-400 italic">Geen index beschikbaar.</p>
        </div>
      )}
    </motion.div>
  );
}

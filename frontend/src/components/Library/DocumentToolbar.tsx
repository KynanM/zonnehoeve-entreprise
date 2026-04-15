"use client";

import { ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight, Search, Printer, Download, X, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

interface DocumentToolbarProps {
  filename: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onPageChange: (newPage: number) => void;
  onClose: () => void;
  onDownload?: () => void;
  theme: "light" | "night";
}

export default function DocumentToolbar({
  filename,
  currentPage,
  totalPages,
  zoom,
  onZoomChange,
  onPageChange,
  onClose,
  onDownload,
  theme
}: DocumentToolbarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const handleZoomIn = () => onZoomChange(Math.min(zoom + 0.1, 2.0));
  const handleZoomOut = () => onZoomChange(Math.max(zoom - 0.1, 0.5));
  const handlePrint = () => window.print(); // Simple print for now

  return (
    <div className={cn(
      "px-4 py-2 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-[70] shadow-sm",
      theme === 'night' ? "bg-stone-900/90 border-stone-800" : "bg-white/90 border-stone-100"
    )}>
      {/* Left: Info & Close */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-500 transition-colors"
          title="Sluiten"
        >
          <X size={18} />
        </button>
        <div className="hidden sm:flex flex-col">
          <span className={cn("text-xs font-black truncate max-w-[150px]", theme === 'night' ? "text-stone-100" : "text-stone-900")}>
            {filename}
          </span>
          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">Protocol Viewer</span>
        </div>
      </div>

      {/* Center: Controls */}
      <div className={cn(
        "flex items-center gap-1 sm:gap-2 px-2 py-1 rounded-2xl border bg-white/50 dark:bg-stone-800/50",
        theme === 'night' ? "border-stone-700" : "border-stone-100 shadow-inner"
      )}>
        {/* Navigation */}
        <div className="flex items-center gap-1 border-r border-stone-200 dark:border-stone-700 pr-2">
          <button 
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg text-stone-500 disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-xs font-black text-emerald-600">{currentPage}</span>
            <span className="text-[10px] font-bold text-stone-400">/</span>
            <span className="text-xs font-bold text-stone-500">{totalPages || "?"}</span>
          </div>
          <button 
            disabled={totalPages > 0 && currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg text-stone-500 disabled:opacity-30 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg text-stone-500 transition-all"><ZoomOut size={16} /></button>
          <span className="text-[10px] font-black text-stone-400 min-w-[35px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg text-stone-500 transition-all"><ZoomIn size={16} /></button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className={cn(
            "p-2 rounded-xl transition-all",
            isSearchOpen ? "bg-emerald-50 text-emerald-600" : "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
          )}
          title="Zoeken in document"
        >
          <Search size={18} />
        </button>
        <button className="hidden sm:flex p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-500 transition-all" title="Afdrukken" onClick={handlePrint}><Printer size={18} /></button>
        <button 
          className="hidden sm:flex p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-500 transition-all" 
          title="Downloaden"
          onClick={onDownload}
        >
          <Download size={18} />
        </button>
        <button className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-500"><MoreVertical size={18} /></button>
      </div>

      {/* Floating Search Bar (if open) */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="absolute top-16 right-4 left-4 sm:left-auto sm:w-80 bg-white dark:bg-stone-900 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
               <input 
                 autoFocus
                 type="text" 
                 placeholder="Zoek tekst..." 
                 value={searchText}
                 onChange={(e) => setSearchText(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border-none rounded-xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-emerald-500/20 transition-all"
               />
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Clock, Star, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import DocumentItem from "./DocumentItem";

interface DocumentSidebarProps {
  availableDocs: string[];
  pinnedDocs: string[];
  recentDocs: string[];
  recentUpdates: {filename: string, last_modified: string}[];
  previews: Record<string, string>;
  onDocumentClick: (doc: string) => void;
  onDocumentDownload: (doc: string, e: React.MouseEvent) => void;
  onPinToggle: (doc: string, e: React.MouseEvent) => void;
  onFetchPreview: (doc: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearching: boolean;
  theme: "light" | "night";
}

export default function DocumentSidebar({
  availableDocs,
  pinnedDocs,
  recentDocs,
  recentUpdates,
  previews,
  onDocumentClick,
  onDocumentDownload,
  onPinToggle,
  onFetchPreview,
  searchQuery,
  onSearchChange,
  isSearching,
  theme
}: DocumentSidebarProps) {
  const [hoveredDoc, setHoveredDoc] = useState<string | null>(null);

  // Sortering: Pinned eerst, dan Alphabetisch
  // Sortering: Pinned eerst, dan Alphabetisch
  const sortedDocs = [...availableDocs].sort((a, b) => {
    // Defensieve checks om localeCompare crashes te voorkomen
    if (typeof a !== 'string' || typeof b !== 'string') {
      console.warn("DocumentSidebar: Ongeldige data in availableDocs", { a, b });
      return 0;
    }
    
    const aPinned = pinnedDocs.includes(a);
    const bPinned = pinnedDocs.includes(b);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header & Search */}
      <div className="p-6 border-b border-stone-100 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className={cn(
            "p-2.5 rounded-2xl shadow-sm",
            theme === 'night' ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-600"
          )}>
            <BookOpen size={22} />
          </div>
          <div>
            <h3 className={cn("font-extrabold text-lg", theme === 'night' ? "text-stone-100" : "text-stone-900")}>Bibliotheek</h3>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Protocollen & Procedures</p>
          </div>
        </div>

        <div className="relative">
          <div className={cn(
            "absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors",
            isSearching ? "text-emerald-500" : "text-stone-400"
          )}>
            <Search size={18} />
          </div>
          <input 
            type="text" 
            value={searchQuery} 
            onChange={e => onSearchChange(e.target.value)} 
            placeholder="Zoek een protocol..."
            className={cn(
              "w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all border",
              theme === 'night'
                ? "bg-stone-800 border-stone-700 text-stone-100 focus:border-emerald-500/50"
                : "bg-white border-stone-200 text-stone-800 focus:border-emerald-500 shadow-sm focus:shadow-emerald-100/50"
            )}
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 custom-scrollbar">
        {/* Recent Section (if searchQuery is empty) */}
        {!searchQuery && recentDocs.length > 0 && (
          <div className="space-y-3">
             <div className="flex items-center gap-2 px-2">
               <Clock size={12} className="text-stone-400" />
               <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Recent geraadpleegd</h4>
             </div>
             <div className="grid grid-cols-1 gap-2">
                {recentDocs.map(doc => (
                  <button 
                    key={`recent-${doc}`}
                    onClick={() => onDocumentClick(doc)}
                    className={cn(
                      "text-left px-4 py-3 rounded-xl border text-[13px] font-bold transition-all truncate",
                      theme === 'night' ? "bg-stone-900/50 border-stone-800 text-stone-400 hover:text-white" : "bg-stone-50 border-stone-100 text-stone-600 hover:bg-stone-100"
                    )}
                  >
                    {doc}
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* Main List */}
        <div className="space-y-3">
           {!searchQuery && (
             <div className="flex items-center gap-2 px-2">
               <TrendingUp size={12} className="text-stone-400" />
               <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Alle Documenten</h4>
             </div>
           )}
           
           <div className="space-y-2">
             {sortedDocs.length > 0 ? (
               sortedDocs.map(doc => (
                 <DocumentItem 
                   key={doc}
                   doc={doc}
                   isPinned={pinnedDocs.includes(doc)}
                   isPreviewing={hoveredDoc === doc}
                   previewText={previews[doc]}
                   onHover={(d) => {
                     setHoveredDoc(d);
                     if (d) onFetchPreview(d);
                   }}
                   onClick={onDocumentClick}
                   onDownload={onDocumentDownload}
                   onPin={onPinToggle}
                   theme={theme}
                 />
               ))
             ) : (
               <div className="text-center py-10 space-y-3">
                 <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
                    <AlertCircle size={24} />
                 </div>
                 <p className={cn("text-xs font-bold", theme === 'night' ? "text-stone-600" : "text-stone-400")}>
                   Geen documenten gevonden.
                 </p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

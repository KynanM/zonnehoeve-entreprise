"use client";

import { useState } from "react";
import { Trash2, MessageSquare, Search, Pin, Edit3, Check, X, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Thread {
  id: string;
  title: string;
  is_pinned?: number;
  created_at?: string;
}

interface ThreadSidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadSelect: (id: string) => void;
  onThreadDelete: (id: string) => void;
  onThreadPin: (id: string, isPinned: boolean) => void;
  onThreadRename: (id: string, newTitle: string) => void;
  onDeleteAll: () => void;
  onNewChat: () => void;
  theme: "light" | "night";
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export default function ThreadSidebar({
  threads,
  activeThreadId,
  onThreadSelect,
  onThreadDelete,
  onThreadPin,
  onThreadRename,
  onDeleteAll,
  onNewChat,
  theme,
  isMobileOpen,
  onClose
}: ThreadSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredThreads = (Array.isArray(threads) ? threads : []).filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupThreads = (items: Thread[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: Thread[] } = {
      "Gepind": (Array.isArray(items) ? items : []).filter(t => t.is_pinned),
      "Vandaag": (Array.isArray(items) ? items : []).filter(t => !t.is_pinned && new Date(t.created_at!) >= today),
      "Gisteren": (Array.isArray(items) ? items : []).filter(t => !t.is_pinned && new Date(t.created_at!) >= yesterday && new Date(t.created_at!) < today),
      "Ouder": (Array.isArray(items) ? items : []).filter(t => !t.is_pinned && new Date(t.created_at!) < yesterday),
    };
    return groups;
  };

  const threadGroups = groupThreads(filteredThreads);

  const startEditing = (t: Thread) => {
    setEditingId(t.id);
    setEditTitle(t.title);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim()) {
      onThreadRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Overlay Background */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[110] w-[280px] lg:w-[320px] lg:static lg:flex lg:flex-col overflow-hidden shrink-0 border-r transition-all duration-500",
        theme === 'night' ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200 shadow-none",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-6 right-4 p-2 text-stone-400 hover:text-emerald-500 transition-colors"
        >
          <X size={20} />
        </button>
        {/* Header */}
        <div className="p-8 pb-4">
          <h2 className={cn("text-2xl font-black tracking-tight mb-6", theme === 'night' ? "text-stone-100" : "text-stone-900")}>Gesprekken</h2>

          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Zoek in chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-bold outline-none border transition-all",
                theme === 'night'
                  ? "bg-stone-800 border-stone-700 text-stone-200 focus:border-emerald-600 focus:bg-stone-800/100"
                  : "bg-stone-100/50 border-stone-100 text-stone-600 focus:border-emerald-200 focus:bg-white"
              )}
            />
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-5 py-4">
          <button
            onClick={onNewChat}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black shadow-lg transition-all active:scale-95 group",
              theme === 'night'
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100"
            )}
          >
            <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
            Nieuw Gesprek
          </button>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto px-5 space-y-6 pb-20 custom-scrollbar mt-2">
          {Object.entries(threadGroups).map(([groupName, groupItems]) => (
            groupItems.length > 0 && (
              <div key={groupName} className="space-y-2">
                <div className="flex items-center gap-2 px-3 mb-3">
                  {groupName === "Gepind" ? <Pin size={10} className="text-emerald-500" /> : <Clock size={10} className="text-stone-400" />}
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400">{groupName}</h3>
                </div>

                <AnimatePresence mode="popLayout">
                  {groupItems.map(t => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={t.id}
                      className="relative group w-full flex items-center"
                    >
                      {editingId === t.id ? (
                        <div className={cn(
                          "w-full flex items-center gap-2 p-1 rounded-2xl border",
                          theme === 'night' ? "bg-stone-800 border-emerald-900" : "bg-white border-emerald-100 shadow-sm"
                        )}>
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveRename(t.id)}
                            className="flex-1 bg-transparent px-3 py-2 text-sm font-bold outline-none"
                          />
                          <button onClick={() => saveRename(t.id)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl"><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-stone-400 hover:bg-stone-50 rounded-xl"><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => { onThreadSelect(t.id); onClose?.(); }}
                            className={cn(
                              "w-full text-left pl-5 pr-20 py-4 rounded-2xl text-sm font-bold transition-all truncate border group",
                              activeThreadId === t.id
                                ? (theme === 'night' ? "bg-stone-800 text-emerald-400 border-stone-700 shadow-xl" : "bg-white text-emerald-700 border-stone-100 shadow-md scale-[1.02] z-10")
                                : (theme === 'night' ? "bg-transparent text-stone-400 hover:bg-stone-800/50 border-transparent hover:text-stone-200" : "bg-transparent text-stone-600 hover:bg-white/80 border-transparent hover:text-stone-900")
                            )}
                          >
                            {t.title}
                          </button>

                          <div className="absolute right-3 hidden group-hover:flex items-center gap-1 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-xl p-1 border border-stone-100 dark:border-stone-800 shadow-sm transition-all">
                            <button
                              onClick={(e) => { e.stopPropagation(); onThreadPin(t.id, !t.is_pinned); }}
                              className={cn("p-1.5 rounded-lg transition-all", t.is_pinned ? "text-emerald-500" : "text-stone-400 hover:text-emerald-500")}
                              title={t.is_pinned ? "Losmaken" : "Vastpinnen"}
                            >
                              <Pin size={13} fill={t.is_pinned ? "currentColor" : "none"} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditing(t); }}
                              className="p-1.5 text-stone-400 hover:text-blue-500 rounded-lg transition-all"
                              title="Hernoemen"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onThreadDelete(t.id); }}
                              className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg transition-all"
                              title="Verwijderen"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )
          ))}

          {filteredThreads.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-300">
                <Search size={20} />
              </div>
              <p className="text-[11px] text-stone-500 font-bold max-w-[150px] mx-auto">
                {searchTerm ? `Geen chats gevonden die voldoen aan '${searchTerm}'` : "Nog geen gesprekken gestart."}
              </p>
            </div>
          )}
        </div>

        {/* Footer / Batch Actions */}
        <div className={cn(
          "p-6 border-t mt-auto backdrop-blur-md",
          theme === 'night' ? "bg-stone-900/80 border-stone-800" : "bg-white/80 border-stone-100"
        )}>
          <button
            onClick={() => { if (confirm("Weet je zeker dat je alle gesprekken wilt wissen? Dit kan niet ongedaan worden.")) onDeleteAll(); }}
            className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-rose-500 transition-colors"
          >
            <Trash2 size={12} /> Alles Wissen
          </button>
        </div>
      </aside>
    </>
  );
}

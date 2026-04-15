"use client";

import { motion } from "framer-motion";
import { User, HeartHandshake, Copy, Printer, Share2, Pin, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "../MarkdownRenderer";
import { Message } from "./types";

interface MessageItemProps {
  message: Message;
  index: number;
  onCopy: (text: string) => void;
  onPrint: (id: string) => void;
  onDossierExport: (msg: Message) => void;
  onFeedback: (index: number, feedback: string) => void;
  onDocumentClick: (doc: string) => void;
  theme: "light" | "night";
}

export default function MessageItem({
  message,
  index,
  onCopy,
  onPrint,
  onDossierExport,
  onFeedback,
  onDocumentClick,
  theme
}: MessageItemProps) {
  const isAssistant = message.role === "assistant";
  const messageId = `msg-${index}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex w-full mb-6",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      <div className={cn(
        "flex max-w-[85%] sm:max-w-[75%]",
        isAssistant ? "flex-row" : "flex-row-reverse"
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 mt-1",
          isAssistant ? "mr-3" : "ml-3"
        )}>
          <div className={cn(
            "w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm border",
            isAssistant 
              ? (theme === 'night' ? "bg-emerald-900/50 border-emerald-700/50 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-600")
              : (theme === 'night' ? "bg-stone-800 border-stone-700 text-stone-400" : "bg-stone-100 border-stone-200 text-stone-600")
          )}>
            {isAssistant ? <HeartHandshake size={18} /> : <User size={18} />}
          </div>
        </div>

        {/* Bubble */}
        <div className="flex flex-col">
          <div 
            id={messageId}
            className={cn(
              "px-5 py-3.5 rounded-3xl shadow-sm text-sm sm:text-base leading-relaxed relative group transition-all duration-300",
              isAssistant 
                ? (theme === 'night' ? "bg-stone-800/80 border border-stone-700/50 text-stone-100 rounded-tl-none shadow-xl" : "bg-emerald-50/40 border border-emerald-100/50 text-stone-800 rounded-tl-none hover:border-emerald-200 shadow-sm")
                : (theme === 'night' ? "bg-emerald-600 text-white rounded-tr-none shadow-emerald-950/20 shadow-lg" : "bg-emerald-600 text-white rounded-tr-none shadow-emerald-100/50 shadow-lg font-medium")
            )}
          >
            {message.content ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              <div className="flex items-center gap-1.5 py-1">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5, times: [0, 0.5, 1] }}
                  className="w-2 h-2 rounded-full bg-emerald-500"
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.2, times: [0, 0.5, 1] }}
                  className="w-2 h-2 rounded-full bg-emerald-500"
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.4, times: [0, 0.5, 1] }}
                  className="w-2 h-2 rounded-full bg-emerald-500"
                />
                <span className="ml-2 text-stone-400 text-xs font-medium animate-pulse">Digitale Gids zoekt antwoord...</span>
              </div>
            )}
            
            {/* Quick Actions & Feedback (Inside bubble to stay together) */}
            {isAssistant && message.content && (
              <div className={cn(
                "absolute -bottom-11 left-0 flex items-center gap-1.5 transition-all p-1.5 rounded-2xl border z-20 shadow-xl",
                theme === 'night' ? "bg-stone-900 border-stone-700 shadow-stone-950" : "bg-white border-stone-200/50 shadow-emerald-900/5"
              )}>
                <button 
                  onClick={() => onCopy(message.content)} 
                  className="p-2 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors text-stone-400" 
                  title="Kopiëren"
                >
                  <Copy size={16} />
                </button>
                <button 
                  onClick={() => onPrint(messageId)} 
                  className="p-2 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors text-stone-400" 
                  title="Afdrukken"
                >
                  <Printer size={16} />
                </button>
                <button 
                  onClick={() => onDossierExport(message)} 
                  className="p-2 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors text-stone-400" 
                  title="Naar Dossier"
                >
                  <Share2 size={16} />
                </button>
                <div className="w-px h-4 bg-stone-100 mx-1" />
                <button 
                  onClick={() => onFeedback(index, "up")}
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    message.feedback === "up" ? "text-emerald-500 bg-emerald-50" : "text-stone-400 hover:text-emerald-500 hover:bg-emerald-50"
                  )}
                  title="Nuttig"
                >
                  <ThumbsUp size={16} fill={message.feedback === "up" ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => onFeedback(index, "down")}
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    message.feedback === "down" ? "text-rose-500 bg-rose-50" : "text-stone-400 hover:text-rose-500 hover:bg-rose-50"
                  )}
                  title="Niet nuttig"
                >
                  <ThumbsDown size={16} fill={message.feedback === "down" ? "currentColor" : "none"} />
                </button>
              </div>
            )}
          </div>

          {/* Metadata info: Citations */}
          <div className={cn(
            "flex flex-wrap items-center ml-1 gap-2",
            isAssistant && message.content ? "mt-14" : "mt-3"
          )}>
            {message.pinned && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-tight">
                <Pin size={10} /> PINNED
              </div>
            )}
            {isAssistant && message.retrieved_sources && message.retrieved_sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {message.retrieved_sources.map((src, idx) => (
                  <button 
                    key={idx}
                    onClick={() => onDocumentClick(src)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black transition-all hover:scale-105 active:scale-95 group",
                      theme === 'night' 
                        ? "bg-stone-800 border-stone-700 text-stone-400 hover:text-emerald-400 hover:border-emerald-900" 
                        : "bg-white border-stone-100 text-stone-500 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                    )}
                  >
                    <HeartHandshake size={10} className="text-emerald-500 group-hover:animate-pulse" />
                    <span className="max-w-[120px] truncate">{src}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

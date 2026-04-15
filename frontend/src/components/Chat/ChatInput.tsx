"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import VoiceInput from "../VoiceInput";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent | string) => void;
  onVoiceInput: (text: string) => void;
  cooldown: number;
  theme: "light" | "night";
}

export default function ChatInput({
  input,
  setInput,
  isLoading,
  onSubmit,
  onVoiceInput,
  cooldown,
  theme
}: ChatInputProps) {
  return (
    <div className="p-4 border-t border-stone-100 bg-white/50 backdrop-blur-sm">
      <form 
        onSubmit={onSubmit}
        className="relative flex items-center gap-3 max-w-4xl mx-auto"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={cooldown > 0 ? `Even geduld (${cooldown}s)...` : "Stel een vraag over Zonnehoeve..."}
            disabled={isLoading || cooldown > 0}
            className={cn(
              "w-full pl-5 pr-12 py-4 rounded-2xl text-sm sm:text-base outline-none transition-all border",
              theme === 'night' 
                ? "bg-stone-800 border-stone-700 text-stone-100 focus:border-emerald-500/50" 
                : "bg-white border-stone-200 text-stone-800 focus:border-emerald-500 shadow-sm focus:shadow-emerald-100/50"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <VoiceInput onTranscript={onVoiceInput} />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!input.trim() || isLoading || cooldown > 0}
          className={cn(
            "p-4 rounded-2xl transition-all flex items-center justify-center shadow-lg active:scale-95 disabled:scale-100 disabled:opacity-50",
            theme === 'night'
              ? "bg-emerald-600 text-white shadow-emerald-900/20"
              : "bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700"
          )}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
      
      <div className="mt-2 text-center text-[10px] sm:text-xs text-stone-400 flex items-center justify-center gap-1.5 font-medium min-h-[20px]">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-2 text-emerald-600 font-bold"
            >
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>Protocollen doorzoeken...</span>
            </motion.div>
          ) : (
            <motion.div 
              key="tip"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5"
            >
              <Sparkles size={12} className="text-emerald-500" />
              AI kan fouten maken. Controleer altijd het officiële protocol.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

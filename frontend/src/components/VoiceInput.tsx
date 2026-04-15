"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const supported = typeof window !== "undefined" && (
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window
    );
    setIsSupported(supported);
  }, []);

  const startListening = () => {
    if (!isSupported || disabled) return;
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "nl-BE";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText("");
    };

      recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimText(interim);

      if (final) {
        onTranscript(final.trim());
        setInterimText("");
      }
    };

      recognition.onerror = (event: any) => {
      console.error("Voice recognition error:", event.error);
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  };

  if (!isSupported) return null;

  return (
    <div className="relative flex items-center shrink-0">
      {/* Interim text bubble */}
      <AnimatePresence>
        {isListening && interimText && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-3 bg-white border border-black/10 shadow-xl rounded-2xl px-4 py-3 text-sm font-medium text-earth-800/70 w-64"
          >
            <p className="text-[10px] font-bold text-brand-green-dark uppercase tracking-widest mb-1">Luistert...</p>
            <p className="italic">{interimText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        whileTap={{ scale: 0.9 }}
        className={`relative w-14 h-14 rounded-2xl transition-all duration-300 flex items-center justify-center shrink-0 ${
          isListening
            ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
            : "bg-white text-earth-800/60 hover:bg-brand-green/10 hover:text-brand-green-dark border-2 border-black/10 shadow-xl"
        } disabled:opacity-40`}
        title={isListening ? "Stop opname" : "Spreek je vraag in (nl)"}
      >
        {isListening && (
          <motion.span
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-red-400 rounded-2xl"
          />
        )}
        <span className="relative z-10">
          {isListening ? <Square size={20} /> : <Mic size={20} />}
        </span>
      </motion.button>
    </div>
  );
}

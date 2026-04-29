"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coffee, Sun, Moon, Sunset } from "lucide-react";

type Moment = {
  id: string;
  timeRange: [number, number]; // uur start, uur einde
  icon: React.ReactNode;
  greeting: string;
  message: string;
  suggestions: string[];
  color: string;
  bgColor: string;
};

const MOMENTEN: Moment[] = [
  {
    id: "ochtend",
    timeRange: [6, 10],
    icon: <Coffee size={20} />,
    greeting: "Goedemorgen",
    message: "Start je shift goed. Bekijk de algemene richtlijnen en protocollen voor vandaag.",
    suggestions: ["Wat is het rookbeleid?", "Hoe werkt de ziektemelding?", "Bekijk onthaalbrochure"],
    color: "text-brand-yellow-dark",
    bgColor: "bg-brand-yellow/10 border-brand-yellow/20",
  },
  {
    id: "middagochtend",
    timeRange: [10, 13],
    icon: <Sun size={20} />,
    greeting: "Goed bezig!",
    message: "Halverwege de ochtend. Heb je vragen over faciliteiten of maaltijden?",
    suggestions: ["Tarieven personeelsmaaltijden?", "Faciliteiten voor personeel?", "Procedure arbeidsongeval"],
    color: "text-brand-green-dark",
    bgColor: "bg-brand-green/10 border-brand-green/20",
  },
  {
    id: "namiddag",
    timeRange: [13, 17],
    icon: <Sunset size={20} />,
    greeting: "Namiddagronde",
    message: "Tijd voor de namiddagactiviteiten. Check de veiligheidsprotocollen.",
    suggestions: ["Richtlijnen bij brand?", "Beleid rond huisdieren?", "Alcohol- en drugbeleid"],
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-100",
  },
  {
    id: "avond",
    timeRange: [17, 23],
    icon: <Moon size={20} />,
    greeting: "Goedeavond",
    message: "Bereid de overdracht voor. Zorg dat je de juiste rapportage-richtlijnen volgt.",
    suggestions: ["Slikproblematiek protocol?", "Vrijheidsbeperking regels?", "Medicatiefouten stappenplan"],
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-100",
  },
];

interface FourMomentsProps {
  onSuggestionClick: (suggestion: string) => void;
}

export default function FourMoments({ onSuggestionClick }: FourMomentsProps) {
  const [currentMoment, setCurrentMoment] = useState<Moment | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    const match = MOMENTEN.find(m => hour >= m.timeRange[0] && hour < m.timeRange[1]);
    if (match) {
      // Toon moment alleen als het vandaag nog niet is afgewezen
      const dismissedKey = `moment-dismissed-${match.id}-${new Date().toDateString()}`;
      if (!localStorage.getItem(dismissedKey)) {
        setCurrentMoment(match);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (currentMoment) {
      const dismissedKey = `moment-dismissed-${currentMoment.id}-${new Date().toDateString()}`;
      localStorage.setItem(dismissedKey, "1");
    }
    setTimeout(() => setCurrentMoment(null), 400);
  };

  if (!currentMoment) return null;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`w-full rounded-2xl border px-5 py-4 flex items-start gap-4 ${currentMoment.bgColor}`}
        >
          {/* Icon */}
          <div className={`p-2.5 rounded-xl bg-white/70 ${currentMoment.color} shrink-0 shadow-sm`}>
            {currentMoment.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-extrabold uppercase tracking-widest ${currentMoment.color} mb-0.5`}>
              {currentMoment.greeting}
            </p>
            <p className="text-sm font-medium text-earth-800/80 mb-3 leading-relaxed">
              {currentMoment.message}
            </p>
            <div className="flex flex-wrap gap-2">
              {currentMoment.suggestions.map((sug, i) => (
                <button key={i}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full bg-white/70 border ${currentMoment.color.replace("text-", "border-").replace("-600", "-200").replace("-dark", "/30")} hover:bg-white transition-all active:scale-95 text-earth-800/70 hover:text-earth-900`}
                  onClick={() => {
                    onSuggestionClick(sug);
                    handleDismiss();
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Dismiss */}
          <button onClick={handleDismiss} className="text-earth-800/30 hover:text-earth-800 transition-colors shrink-0 mt-0.5">
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

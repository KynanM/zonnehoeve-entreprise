
import { motion } from "framer-motion";

interface SatisfactionRingProps {
  rate: number | null;
}

export function SatisfactionRing({ rate }: SatisfactionRingProps) {
  if (rate === null) return (
    <div className="text-earth-800/30 font-bold text-sm text-center">Geen feedback</div>
  );
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const filled = (rate / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center w-28 h-28 mx-auto">
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="#f0f0f0" strokeWidth="10" />
        <motion.circle
          cx="56" cy="56" r={radius} fill="none"
          stroke={rate >= 70 ? "#22c55e" : rate >= 50 ? "#f59e0b" : "#ef4444"}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black text-earth-900">{rate}%</span>
        <span className="text-[9px] font-bold text-earth-800/50 uppercase tracking-wider">tevredenheid</span>
      </div>
    </div>
  );
}

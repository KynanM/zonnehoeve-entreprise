
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  index: number;
}

export function StatCard({ label, value, icon, color, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="bg-white rounded-[1.8rem] p-6 flex flex-col justify-between min-h-[9rem] shadow-sm border border-black/5 relative overflow-hidden"
    >
      <div className="flex items-center justify-between text-earth-800/50">
        <span className="text-[10px] font-extrabold uppercase tracking-widest">{label}</span>
        <div className={`p-2 rounded-xl ${color}`}>{icon}</div>
      </div>
      <div className="text-4xl lg:text-5xl font-black text-earth-900 mt-3">{value}</div>
    </motion.div>
  );
}

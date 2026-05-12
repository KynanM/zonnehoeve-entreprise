
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface ActivityChartProps {
  data: { day: string; count: number }[];
}

function MiniBarChart({ data }: { data: { day: string; count: number }[] }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-24 text-earth-800/30 text-sm font-bold">Geen data beschikbaar</div>
  );
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-24 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className={`w-full transition-all duration-300 rounded-t-sm ${d.count > 0 ? 'bg-emerald-400 opacity-100 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'bg-slate-700 opacity-30'}`}
            style={{ 
                height: `${(d.count / max) * 100}%`,
                minHeight: d.count > 0 ? '12px' : '4px' 
            }}
            title={`${d.day}: ${d.count} vragen`}
          />
          <div className="absolute bottom-full mb-2 bg-earth-900 text-white text-[10px] px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-20 pointer-events-none shadow-xl">
            <span className="font-bold">{d.day}</span>: <span className="text-brand-yellow">{d.count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div className="lg:col-span-2 bg-white rounded-[2rem] p-7 shadow-sm border border-black/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-brand-green/10 rounded-xl text-brand-green-dark"><TrendingUp size={20} /></div>
        <div>
          <h3 className="font-extrabold text-earth-900">Dagelijkse activiteit</h3>
          <p className="text-xs text-earth-800/50">Afgelopen 14 dagen</p>
        </div>
      </div>
      <MiniBarChart data={data} />
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-earth-800/30 font-bold">14 dagen geleden</span>
        <span className="text-[10px] text-earth-800/30 font-bold">Vandaag</span>
      </div>
    </div>
  );
}

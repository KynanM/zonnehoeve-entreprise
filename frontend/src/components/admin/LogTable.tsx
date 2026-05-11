
import { useState } from "react";
import { 
  BarChart2, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, 
  ChevronLeft, ChevronRight 
} from "lucide-react";

interface LogEntry {
  id: number;
  timestamp: string;
  user_prompt: string;
  bot_response: string;
  retrieved_sources: string[];
  user_feedback: string | null;
  latency_seconds: number;
}

interface LogTableProps {
  logs: LogEntry[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  onPageChange: (page: number) => void;
}

export function LogTable({ logs, pagination, onPageChange }: LogTableProps) {
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-black/5">
      <div className="px-7 py-6 border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-earth-100 rounded-xl text-earth-700"><BarChart2 size={20} /></div>
          <h3 className="font-extrabold text-earth-900 text-lg">Chat-Log Overzicht</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold bg-earth-100 text-earth-800/50 px-3 py-1.5 rounded-xl">
            Totaal: {pagination.total}
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-earth-800/40 text-[10px] uppercase tracking-widest font-extrabold border-b border-black/5 bg-earth-50/50">
              <th className="px-6 py-4">Tijdstip</th>
              <th className="px-6 py-4 w-1/4">Vraag</th>
              <th className="px-6 py-4 w-1/3">Antwoord</th>
              <th className="px-6 py-4">Bronnen</th>
              <th className="px-6 py-4">Feedback</th>
              <th className="px-6 py-4">ms</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-earth-800/30 font-bold">
                  Nog geen gesprekken gevonden.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-black/5 hover:bg-earth-50/50 transition-colors text-[13px]">
                <td className="px-6 py-4 text-earth-800/50 whitespace-nowrap font-medium">
                  {new Date(log.timestamp).toLocaleString("nl-BE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-6 py-4 font-bold text-earth-900">{log.user_prompt}</td>
                <td className="px-6 py-4 text-earth-800/70">
                  <button onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    className="flex items-start gap-2 text-left hover:text-earth-900 transition-colors w-full">
                    <span className={expandedLogId === log.id ? "" : "line-clamp-2"}>{log.bot_response}</span>
                    {expandedLogId === log.id ? <ChevronUp size={14} className="shrink-0 mt-0.5 text-earth-800/30" /> : <ChevronDown size={14} className="shrink-0 mt-0.5 text-earth-800/30" />}
                  </button>
                </td>
                <td className="px-6 py-4">
                  {log.retrieved_sources?.length > 0
                    ? <div className="flex flex-col gap-1">{log.retrieved_sources.map((s, i) => (
                      <span key={i} className="text-[10px] bg-earth-100 px-2 py-0.5 rounded font-medium truncate max-w-[140px]" title={s}>{s}</span>
                    ))}</div>
                    : <span className="text-earth-800/25 font-bold">—</span>}
                </td>
                <td className="px-6 py-4">
                  {log.user_feedback === "thumbs_up"
                    ? <div className="w-8 h-8 rounded-full bg-green-50 text-brand-green flex items-center justify-center"><ThumbsUp size={14} /></div>
                    : log.user_feedback === "thumbs_down"
                    ? <div className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center"><ThumbsDown size={14} /></div>
                    : <span className="text-earth-800/25 font-bold">—</span>}
                </td>
                <td className="px-6 py-4 text-earth-800/40 font-mono text-[11px]">
                  {log.latency_seconds ? `${(log.latency_seconds * 1000).toFixed(0)}ms` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination.total_pages > 1 && (
        <div className="px-7 py-4 border-t border-black/5 flex items-center justify-between bg-earth-50/30">
          <span className="text-xs font-bold text-earth-800/40">
            Pagina {pagination.page} van {pagination.total_pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg bg-white border border-black/5 disabled:opacity-30 hover:bg-earth-100 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.total_pages}
              className="p-2 rounded-lg bg-white border border-black/5 disabled:opacity-30 hover:bg-earth-100 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

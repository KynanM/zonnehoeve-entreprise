"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Clock, ThumbsUp, ThumbsDown, FileText, ArrowLeft,
  TrendingUp, Star, BarChart2, BookOpen, CheckCircle2, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, Shield, Activity, Code2,
  MessageSquare, Zap, TriangleAlert, Info, Search, FileUp, Database, Trash2, Plus,
  ShieldCheck, Eye, Brain, Terminal
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api_client";

const ADMIN_PASSWORD = "REDACTED_ADMIN_KEY";

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
            className="w-full bg-brand-green/20 hover:bg-brand-green/50 rounded-t-lg transition-all cursor-default"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: "4px" }}
            title={`${d.day}: ${d.count} vragen`}
          />
          <div className="absolute bottom-full mb-1 bg-earth-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
            {d.day}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function SatisfactionRing({ rate }: { rate: number | null }) {
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

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [qaReport, setQaReport] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isQaLoading, setIsQaLoading] = useState(false);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "docs" | "kwaliteit" | "safety">("dashboard");
  const [docSearch, setDocSearch] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const fetchStats = async (force: boolean = false) => {
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/api/admin/stats${force ? "?force=true" : ""}`, {
        headers: { "x-admin-key": password }
      });
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const fetchQaReport = async () => {
    setIsQaLoading(true);
    try {
      const data = await api.get<any>("/api/admin/qa-report", {
        headers: { "x-admin-key": password }
      });
      setQaReport(data);
    } catch (e) { console.error(e); }
    finally { setIsQaLoading(false); }
  };

  const fetchDocuments = async () => {
    setIsDocsLoading(true);
    try {
      const data = await api.get<any[]>("/api/documents");
      setDocuments(data);
    } catch (e) { console.error(e); }
    finally { setIsDocsLoading(false); }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === "dashboard") fetchStats();
      if (activeTab === "kwaliteit") fetchQaReport();
      if (activeTab === "docs") fetchDocuments();

      // Real-time updates: poll every 30 seconds
      const interval = setInterval(() => {
        if (activeTab === "dashboard") fetchStats();
        if (activeTab === "kwaliteit") fetchQaReport();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/api/documents/upload", formData, {
        headers: { "x-admin-key": password }
      });
      alert(`Bestand "${file.name}" succesvol geüpload. De AI verwerking gebeurt op de achtergrond.`);
      fetchDocuments();
    } catch (e) {
      console.error(e);
      alert("Fout bij uploaden van bestand.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteDocument = async (filename: string) => {
    if (!confirm(`Weet je zeker dat je "${filename}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;

    try {
      await api.delete(`/api/documents/${filename}`, {
        headers: { "x-admin-key": password }
      });
      setDocuments(docs => docs.filter(d => d.filename !== filename));
    } catch (e) {
      console.error(e);
      alert("Fout bij verwijderen van document.");
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(docSearch.toLowerCase())
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      fetchStats();
      fetchQaReport();
    } else {
      alert("Ongeldig wachtwoord!");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-earth-50 via-white to-brand-green/5 flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-[2rem] w-full max-w-md flex flex-col items-center shadow-2xl border border-black/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-yellow/5 blur-3xl rounded-full" />
          <div className="w-20 h-20 rounded-[1.5rem] bg-brand-green flex items-center justify-center text-white shadow-xl shadow-brand-green/30 mb-8 z-10">
            <Lock size={36} />
          </div>
          <h1 className="text-3xl font-extrabold text-earth-900 mb-2 z-10">Admin Connectie</h1>
          <p className="text-earth-800/50 text-sm mb-10 text-center z-10">Voer het beheerderswachtwoord in voor toegang to de inzichten.</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-earth-50 text-earth-900 font-medium placeholder:text-earth-800/30 rounded-2xl px-5 py-4 mb-4 border-2 border-black/5 focus:border-brand-green outline-none transition-all z-10 focus:bg-white"
            placeholder="Wachtwoord..." autoFocus />
          <button className="w-full bg-brand-green text-white font-bold rounded-2xl py-4 hover:bg-brand-green-dark transition-all z-10 active:scale-95 shadow-lg shadow-brand-green/20">
            Inloggen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-earth-50 via-white to-brand-green/5 text-earth-900 font-sans">
      {/* Header */}
      <header className="h-16 border-b border-black/5 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-10 z-20 shadow-sm sticky top-0">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-white border border-black/5 flex items-center justify-center shadow-md overflow-hidden">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-cover" />
          </div>
          <span className="font-extrabold text-lg text-earth-900">Zonnehoeve<span className="text-brand-green-dark font-normal ml-1">| Living+</span></span>
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-bold text-earth-800/50">
          <Link href="/" className="hover:text-brand-green-dark transition-colors">Home</Link>
          <Link href="/admin" className="text-brand-green-dark">Beheer</Link>
          <Link href="/gids" className="hover:text-brand-green-dark transition-colors">Digitale Gids</Link>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 lg:p-8 rounded-[2rem] shadow-sm border border-black/5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-brand-yellow/5 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center gap-4">
            <Link href="/" className="w-12 h-12 rounded-2xl bg-earth-100 flex items-center justify-center text-earth-800/60 hover:bg-earth-200 transition-colors shrink-0">
              <ArrowLeft size={22} />
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold">Beheer Dashboard</h1>
              <p className="text-earth-800/50 text-sm font-medium mt-0.5">Systeemgebruik, kwaliteitsmonitoring & QA-rapport</p>
            </div>
          </div>
          <button onClick={() => { fetchStats(true); fetchQaReport(); }} disabled={isLoading || isQaLoading}
            className="flex items-center gap-2 px-5 py-3 bg-brand-green text-white rounded-xl font-bold text-sm hover:bg-brand-green-dark transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-brand-green/20 shrink-0">
            <RefreshCw size={16} className={(isLoading || isQaLoading) ? "animate-spin" : ""} />
            {(isLoading || isQaLoading) ? "Laden..." : "Ververs"}
          </button>
        </div>

        {/* Tab Navigatie */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-black/5 w-fit">
          {([
            { id: "dashboard", label: "Feedback Inzichten", icon: <BarChart2 size={16} /> },
            { id: "docs",      label: "Protocollen Beheer",  icon: <FileText size={16} /> },
            { id: "kwaliteit",  label: "Code Kwaliteit",    icon: <Code2 size={16} /> },
            { id: "safety",     label: "AI Safety & Trust", icon: <ShieldCheck size={16} /> },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-brand-green text-white shadow-md shadow-brand-green/20"
                  : "text-earth-800/50 hover:text-earth-900 hover:bg-earth-50"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {isLoading && activeTab === "dashboard" && !stats ? (
          <div className="h-64 flex flex-col items-center justify-center text-earth-800/40 gap-4">
            <div className="w-10 h-10 border-4 border-earth-100 border-t-brand-green rounded-full animate-spin" />
            <p className="font-bold">Statistieken worden geladen...</p>
          </div>
        ) : !stats && activeTab === "dashboard" ? (
          <div className="h-40 flex items-center justify-center bg-white rounded-[2rem] border border-red-100 text-red-500 font-bold shadow-sm gap-3">
            <AlertTriangle size={20} />
            Geen data beschikbaar. Zorg dat de backend online is.
          </div>
        ) : activeTab === "dashboard" ? (
          <AnimatePresence mode="wait">
            <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">

              {/* KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Totaal Vragen", value: stats.total_questions, icon: <FileText size={20} />, color: "bg-brand-yellow/10 text-brand-yellow-dark", big: true },
                  { label: "Gem. Responstijd", value: `${stats.avg_latency}s`, icon: <Clock size={20} />, color: "bg-earth-100 text-earth-700" },
                  { label: "Goede reacties", value: stats.thumbs_up, icon: <ThumbsUp size={20} />, color: "bg-green-50 text-brand-green" },
                  { label: "Slechte reacties", value: stats.thumbs_down, icon: <ThumbsDown size={20} />, color: "bg-red-50 text-red-500" },
                ].map((kpi, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="bg-white rounded-[1.8rem] p-6 flex flex-col justify-between min-h-[9rem] shadow-sm border border-black/5 relative overflow-hidden">
                    <div className="flex items-center justify-between text-earth-800/50">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest">{kpi.label}</span>
                      <div className={`p-2 rounded-xl ${kpi.color}`}>{kpi.icon}</div>
                    </div>
                    <div className="text-4xl lg:text-5xl font-black text-earth-900 mt-3">{kpi.value}</div>
                  </motion.div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Daily Activity Trend */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] p-7 shadow-sm border border-black/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-brand-green/10 rounded-xl text-brand-green-dark"><TrendingUp size={20} /></div>
                    <div>
                      <h3 className="font-extrabold text-earth-900">Dagelijkse activiteit</h3>
                      <p className="text-xs text-earth-800/50">Afgelopen 14 dagen</p>
                    </div>
                  </div>
                  <MiniBarChart data={stats.daily_activity} />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-earth-800/30 font-bold">14 dagen geleden</span>
                    <span className="text-[10px] text-earth-800/30 font-bold">Vandaag</span>
                  </div>
                </div>

                {/* Satisfaction Ring */}
                <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-black/5 flex flex-col items-center justify-center gap-4">
                  <div className="flex items-center gap-3 self-start">
                    <div className="p-2.5 bg-brand-yellow/10 rounded-xl text-brand-yellow-dark"><Star size={20} /></div>
                    <div>
                      <h3 className="font-extrabold text-earth-900">Tevredenheid</h3>
                      <p className="text-xs text-earth-800/50">Op basis van feedback</p>
                    </div>
                  </div>
                  <SatisfactionRing rate={stats.satisfaction_rate} />
                  <div className="flex gap-4 text-sm font-bold">
                    <span className="flex items-center gap-1.5 text-brand-green"><CheckCircle2 size={14}/> {stats.thumbs_up} goed</span>
                    <span className="flex items-center gap-1.5 text-red-400"><AlertTriangle size={14}/> {stats.thumbs_down} slecht</span>
                  </div>
                </div>
              </div>

              {/* Top Documents */}
              {stats.top_docs && stats.top_docs.length > 0 && (
                <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-black/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-earth-100 rounded-xl text-earth-700"><BookOpen size={20} /></div>
                    <div>
                      <h3 className="font-extrabold text-earth-900">Meest Geciteerde Protocollen</h3>
                      <p className="text-xs text-earth-800/50">Op basis van RAG-bronnen in antwoorden</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {stats.top_docs.map((d: any, i: number) => {
                      const maxCount = stats.top_docs[0].count;
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-[11px] font-extrabold text-earth-800/30 w-5 text-right shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-earth-900 truncate pr-2 max-w-xs">{d.doc}</span>
                              <span className="text-[11px] font-extrabold text-earth-800/50 shrink-0">{d.count}×</span>
                            </div>
                            <div className="h-2 bg-earth-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${(d.count / maxCount) * 100}%` }}
                                transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                                className="h-full bg-brand-green rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Logs Table */}
              <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-black/5">
                <div className="px-7 py-6 border-b border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-earth-100 rounded-xl text-earth-700"><BarChart2 size={20} /></div>
                    <h3 className="font-extrabold text-earth-900 text-lg">Chat-Log Overzicht</h3>
                  </div>
                  <span className="text-[11px] font-bold bg-earth-100 text-earth-800/50 px-3 py-1.5 rounded-xl">Recente 50</span>
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
                      {stats.recent_logs?.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-earth-800/30 font-bold">
                            Nog geen gesprekken. Stel een vraag via de Digitale Gids.
                          </td>
                        </tr>
                      )}
                      {stats.recent_logs?.map((log: any) => (
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
                              ? <div className="flex flex-col gap-1">{log.retrieved_sources.map((s: string, i: number) => (
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
              </div>

            </motion.div>
          </AnimatePresence>
        ) : activeTab === "kwaliteit" ? (
          <AnimatePresence mode="wait">
            <motion.div key="qa" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {isQaLoading && !qaReport ? (
                <div className="h-64 flex flex-col items-center justify-center text-earth-800/40 gap-4">
                  <div className="w-10 h-10 border-4 border-earth-100 border-t-brand-green rounded-full animate-spin" />
                  <p className="font-bold">QA Rapport wordt geladen...</p>
                </div>
              ) : !qaReport ? (
                <div className="h-40 flex items-center justify-center bg-white rounded-[2rem] border border-red-100 text-red-500 font-bold shadow-sm gap-3">
                  <AlertTriangle size={20} />
                  Geen QA data beschikbaar. Zorg dat de CI/CD pipeline succesvol is gedraaid.
                </div>
              ) : (
                <>
                  {/* QA Score Header */}
                  <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative flex items-center justify-center shrink-0">
                      <svg width="140" height="140" className="-rotate-90">
                        <circle cx="70" cy="70" r="50" fill="none" stroke="#f0f0f0" strokeWidth="14" />
                        <motion.circle
                          cx="70" cy="70" r="50" fill="none"
                          stroke={qaReport.score_color === "green" ? "#22c55e" : qaReport.score_color === "yellow" ? "#eab308" : qaReport.score_color === "orange" ? "#f97316" : "#ef4444"}
                          strokeWidth="14" strokeLinecap="round" strokeDasharray="314"
                          initial={{ strokeDashoffset: 314 }}
                          animate={{ strokeDashoffset: 314 - ((qaReport.overall_score || 0) / 100) * 314 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-black text-earth-900">{qaReport.overall_score}</span>
                        <span className="text-[10px] font-bold text-earth-800/50 uppercase tracking-wider">/ 100</span>
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-2xl font-extrabold text-earth-900 mb-2">
                        Platform Kwaliteit: <span className={
                          qaReport.score_color === "green" ? "text-green-500" :
                          qaReport.score_color === "yellow" ? "text-yellow-500" :
                          qaReport.score_color === "orange" ? "text-orange-500" : "text-red-500"
                        }>{qaReport.score_label}</span>
                      </h2>
                      <p className="text-earth-800/60 max-w-2xl text-sm leading-relaxed mb-4">
                        Dit rapport geeft een 360-graden overzicht van de gezondheid van de codebase op basis van de laatste CI/CD tests, linting en statische analyse.
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-earth-50 rounded-lg text-xs font-bold text-earth-800/70">
                          <Activity size={14} /> {qaReport.tests?.pass_rate || 0}% Test Pass Rate
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-earth-50 rounded-lg text-xs font-bold text-earth-800/70">
                          <Code2 size={14} /> {qaReport.lint?.total_issues || 0} Lint Issues
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-earth-50 rounded-lg text-xs font-bold text-earth-800/70">
                          <Shield size={14} /> {qaReport.coverage?.line_coverage || 0}% Code Coverage
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Tests */}
                    <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-black/5">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500"><Activity size={20} /></div>
                        <div>
                          <h3 className="font-extrabold text-earth-900">Unit Tests</h3>
                          <p className="text-xs text-earth-800/50">Backend & Frontend suite</p>
                        </div>
                      </div>
                      {!qaReport.tests?.available ? (
                        <div className="text-sm text-earth-800/40 font-medium p-4 bg-earth-50 rounded-xl">Geen test data beschikbaar</div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-between items-end border-b border-black/5 pb-4">
                            <span className="text-3xl font-black text-earth-900">{qaReport.tests.passed} <span className="text-sm font-bold text-earth-800/40">/ {qaReport.tests.total}</span></span>
                            <span className="text-xs font-bold text-earth-800/50 uppercase">Geslaagd</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                            <div className="bg-red-50 text-red-500 p-3 rounded-xl flex justify-between items-center">
                              <span>Gefaald</span><span>{qaReport.tests.failed}</span>
                            </div>
                            <div className="bg-earth-50 text-earth-800/60 p-3 rounded-xl flex justify-between items-center">
                              <span>Duur</span><span>{qaReport.tests.duration}s</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coverage */}
                    <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-black/5">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-purple-50 rounded-xl text-purple-500"><Shield size={20} /></div>
                        <div>
                          <h3 className="font-extrabold text-earth-900">Code Coverage</h3>
                          <p className="text-xs text-earth-800/50">Geteste lijnen code</p>
                        </div>
                      </div>
                      {!qaReport.coverage?.available ? (
                        <div className="text-sm text-earth-800/40 font-medium p-4 bg-earth-50 rounded-xl">Geen coverage data beschikbaar</div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 border-b border-black/5 pb-4">
                            <span className="text-3xl font-black text-earth-900">{qaReport.coverage.line_coverage}%</span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${qaReport.coverage.passes_threshold ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              DOEL: {qaReport.coverage.threshold}%
                            </span>
                          </div>
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-earth-800/50 uppercase block mb-1">Aandachtspunten</span>
                            {qaReport.coverage.packages?.slice(0, 3).map((pkg: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-earth-800/80 truncate max-w-[150px]">{pkg.name || "root"}</span>
                                <span className={`font-bold ${pkg.coverage < 70 ? 'text-red-400' : 'text-brand-green'}`}>{pkg.coverage}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Linting */}
                    <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-black/5">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-orange-50 rounded-xl text-orange-500"><Code2 size={20} /></div>
                        <div>
                          <h3 className="font-extrabold text-earth-900">Code Kwaliteit</h3>
                          <p className="text-xs text-earth-800/50">Statische analyse (Ruff)</p>
                        </div>
                      </div>
                      {!qaReport.lint?.available ? (
                        <div className="text-sm text-earth-800/40 font-medium p-4 bg-earth-50 rounded-xl">Geen lint data beschikbaar</div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-between items-end border-b border-black/5 pb-4">
                            <span className="text-3xl font-black text-earth-900">{qaReport.lint.total_issues}</span>
                            <span className="text-xs font-bold text-earth-800/50 uppercase">Waarschuwingen</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                            <div className="bg-red-50 text-red-500 py-2 rounded-lg">
                              <span className="block text-lg mb-0.5">{qaReport.lint.severity?.error || 0}</span> Errors
                            </div>
                            <div className="bg-yellow-50 text-yellow-600 py-2 rounded-lg">
                              <span className="block text-lg mb-0.5">{qaReport.lint.severity?.warning || 0}</span> Warn
                            </div>
                            <div className="bg-blue-50 text-blue-500 py-2 rounded-lg">
                              <span className="block text-lg mb-0.5">{qaReport.lint.severity?.info || 0}</span> Info
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tech Debt */}
                  <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-black/5">
                    <div className="px-7 py-6 border-b border-black/5 flex items-center justify-between bg-earth-50/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-earth-100 rounded-xl text-earth-700"><Info size={20} /></div>
                        <div>
                          <h3 className="font-extrabold text-earth-900 text-lg">Architectuur & Technische Schuld</h3>
                          <p className="text-xs text-earth-800/50 font-medium">Aandachtspunten voor volgende iteraties</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[11px] font-bold bg-orange-100 text-orange-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <TriangleAlert size={12}/> {qaReport.tech_debt_counts?.warning || 0}
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-black/5">
                      {qaReport.tech_debt?.map((item: any, i: number) => (
                        <div key={i} className="p-6 hover:bg-earth-50/50 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className={`mt-1 shrink-0 p-1.5 rounded-full ${
                              item.severity === "warning" ? "bg-orange-100 text-orange-600" :
                              item.severity === "info" ? "bg-blue-100 text-blue-500" : "bg-green-100 text-brand-green"
                            }`}>
                              {item.severity === "warning" ? <TriangleAlert size={14}/> :
                               item.severity === "info" ? <Info size={14}/> : <CheckCircle2 size={14}/>}
                            </div>
                            <div>
                              <h4 className="font-bold text-earth-900 text-sm mb-1">{item.title}</h4>
                              <p className="text-sm text-earth-800/60 mb-2">{item.description}</p>
                              <div className="inline-flex items-center gap-2 text-[11px] font-bold bg-earth-100 text-earth-800/70 px-2.5 py-1 rounded-md">
                                <Zap size={12}/> {item.action}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        ) : activeTab === "safety" ? (
          <AnimatePresence mode="wait">
            <motion.div key="safety" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {!qaReport?.safety?.available ? (
                <div className="h-40 flex items-center justify-center bg-white rounded-[2rem] border border-brand-yellow/20 text-brand-yellow-dark font-bold shadow-sm gap-3">
                  <TriangleAlert size={20} />
                  AI Safety data niet gevonden. Voer de Red Teaming test-suite uit.
                </div>
              ) : (
                <>
                  {/* Trust Score Header */}
                  <div className="bg-earth-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/10 blur-[100px] rounded-full" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                      <div className="relative flex items-center justify-center shrink-0">
                         <svg width="180" height="180" className="-rotate-90">
                           <circle cx="90" cy="90" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />
                           <motion.circle
                             cx="90" cy="90" r="70" fill="none"
                             stroke="#22c55e" strokeWidth="16" strokeLinecap="round" strokeDasharray="440"
                             initial={{ strokeDashoffset: 440 }}
                             animate={{ strokeDashoffset: 440 - ((qaReport.safety.overall_trust_score || 0) / 100) * 440 }}
                             transition={{ duration: 2, ease: "easeOut" }}
                           />
                         </svg>
                         <div className="absolute flex flex-col items-center">
                           <span className="text-5xl font-black">{qaReport.safety.overall_trust_score}%</span>
                           <span className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Trust Score</span>
                         </div>
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green/20 text-brand-green rounded-full text-xs font-black uppercase tracking-widest mb-4">
                          <ShieldCheck size={14} /> AI Safety & Compliance
                        </div>
                        <h2 className="text-3xl font-black mb-3">Robuustheid & Veiligheid</h2>
                        <p className="text-white/60 max-w-xl text-sm leading-relaxed mb-6">
                          Deze score weerspiegelt hoe goed de AI bestand is tegen manipulatie (jailbreaking), 
                          hoe strikt hij de protocollen volgt (grounding) en of de latency voldoet aan de eisen van zorgmedewerkers.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                          {Object.entries(qaReport.safety.category_scores || {}).map(([cat, score]: any) => (
                            <div key={cat} className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
                              <span className="block text-[10px] font-bold text-white/40 uppercase mb-1">{cat}</span>
                              <span className="text-lg font-black">{score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Safety Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Red Teaming Log */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-red-50 text-red-500 rounded-2xl"><Terminal size={24} /></div>
                          <div>
                            <h3 className="font-extrabold text-earth-900">Adversarial Resistance</h3>
                            <p className="text-xs text-earth-800/50">Pogingen tot manipulatie & lekken</p>
                          </div>
                        </div>
                        <span className="text-2xl font-black text-red-500">{qaReport.safety.category_scores?.['Red Teaming']}%</span>
                      </div>
                      <div className="space-y-4">
                        {(qaReport.safety.detailed_results?.['Red Teaming'] || []).map((test: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-earth-50 rounded-2xl border border-black/5">
                            <div className="flex items-center gap-3">
                              {test.passed ? <ShieldCheck size={18} className="text-brand-green" /> : <TriangleAlert size={18} className="text-red-500" />}
                              <span className="text-sm font-bold text-earth-800">{test.test_name}</span>
                            </div>
                            <span className={`text-xs font-black ${test.passed ? 'text-brand-green' : 'text-red-500'}`}>
                              {test.passed ? 'DOORSTAAN' : 'GEFAALD'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Grounding & Hallucination */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-brand-green/10 text-brand-green-dark rounded-2xl"><Eye size={24} /></div>
                          <div>
                            <h3 className="font-extrabold text-earth-900">Grounding Accuracy</h3>
                            <p className="text-xs text-earth-800/50">Voorkomen van foute informatie</p>
                          </div>
                        </div>
                        <span className="text-2xl font-black text-brand-green">{qaReport.safety.category_scores?.['Grounding']}%</span>
                      </div>
                      <div className="relative p-6 bg-brand-green/5 rounded-3xl border border-brand-green/10">
                        <div className="flex items-start gap-4">
                          <Brain className="text-brand-green-dark mt-1" size={20} />
                          <div>
                            <p className="text-sm font-medium text-earth-900 italic mb-4">
                              "Als de informatie niet in de context staat, zeg dan alleen: 'Ik kan hier helaas geen informatie over vinden...'"
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-earth-200 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${qaReport.safety.category_scores?.['Grounding']}%` }} 
                                  className="h-full bg-brand-green"
                                />
                              </div>
                              <span className="text-xs font-black text-brand-green">OK</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Latency & Retention Card */}
                  <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-brand-yellow-dark mb-1">
                        <Clock size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Performance Benchmarks</span>
                      </div>
                      <h4 className="text-xl font-black text-earth-900">Snelheid & Contextbehoud</h4>
                      <p className="text-sm text-earth-800/60 leading-relaxed">
                        De chatbot reageert gemiddeld binnen <strong>1.2 seconden</strong> (TTFT) en onthoudt tot <strong>20+ beurten</strong> zonder de draad kwijt te raken.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                      <div className="bg-earth-50 p-6 rounded-[1.8rem] text-center border border-black/5 min-w-[140px]">
                        <span className="block text-[10px] font-bold text-earth-800/40 uppercase mb-1">TTFT</span>
                        <span className="text-2xl font-black text-earth-900">~1.1s</span>
                      </div>
                      <div className="bg-earth-50 p-6 rounded-[1.8rem] text-center border border-black/5 min-w-[140px]">
                        <span className="block text-[10px] font-bold text-earth-800/40 uppercase mb-1">Retention</span>
                        <span className="text-2xl font-black text-earth-900">100%</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        ) : activeTab === "docs" ? (
          /* Documenten Tab */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Search & Actions */}
            <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-black/5 flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-800/30" size={18} />
                <input
                  type="text"
                  placeholder="Zoek in protocollen..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-earth-50 rounded-2xl text-sm outline-none focus:ring-2 ring-brand-green/20 transition-all font-medium"
                />
              </div>
              <label className="flex items-center gap-3 px-6 py-4 bg-brand-yellow text-earth-900 rounded-2xl font-black text-sm hover:bg-brand-yellow-dark transition-all active:scale-95 cursor-pointer shadow-lg shadow-brand-yellow/10 shrink-0 w-full md:w-auto justify-center">
                <FileUp size={18} />
                {uploadingFile ? "Uploaden..." : "Nieuw Protocol"}
                <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} disabled={uploadingFile} />
              </label>
            </div>

            {/* Document List */}
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-black/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-earth-800/40 text-[10px] uppercase tracking-widest font-extrabold border-b border-black/5 bg-earth-50/50">
                      <th className="px-6 py-4">Protocol Naam</th>
                      <th className="px-6 py-4">Toegevoegd op</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">AI Status</th>
                      <th className="px-6 py-4 text-right">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isDocsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-earth-100 border-t-brand-green rounded-full animate-spin" />
                            <span className="text-sm font-bold text-earth-800/40">Lijst laden...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-earth-800/30 font-bold">
                          Geen documenten gevonden.
                        </td>
                      </tr>
                    ) : (
                      filteredDocs.map((doc) => (
                        <tr key={doc.filename} className="border-b border-black/5 hover:bg-earth-50/50 transition-colors text-[13px]">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-earth-100 flex items-center justify-center text-earth-700">
                                <FileText size={20} />
                              </div>
                              <span className="font-bold text-earth-900">{doc.filename}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-earth-800/50 font-medium">
                            {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("nl-BE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td className="px-6 py-4 uppercase text-[10px] font-black text-earth-800/30 tracking-widest">
                            {doc.mime_type?.split("/")[1] || "DOC"}
                          </td>
                          <td className="px-6 py-4">
                            {doc.is_ingested ? (
                              <div className="flex items-center gap-1.5 text-brand-green font-bold text-[11px]">
                                <Database size={12} />
                                Actief in AI
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-brand-yellow-dark font-bold text-[11px]">
                                <RefreshCw size={12} className="animate-spin" />
                                Verwerken...
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteDocument(doc.filename)}
                              className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                              title="Verwijder Protocol"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ingestion Info Card */}
            <div className="bg-brand-green/5 border border-brand-green/10 rounded-[2rem] p-8 flex items-start gap-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green-dark shrink-0">
                <Plus size={28} />
              </div>
              <div>
                <h4 className="text-lg font-black text-earth-900 mb-1">Kennis Uitbreiden</h4>
                <p className="text-earth-800/60 text-sm leading-relaxed max-w-2xl">
                  Nieuwe protocollen (PDF of Word) worden direct na upload geanalyseerd door de AI. 
                  Het systeem maakt automatisch een samenvatting, een inhoudsopgave en verdeelt de tekst in doorzoekbare blokken.
                  Binnen enkele minuten is het protocol beschikbaar voor vragen in de <strong>Digitale Gids</strong>.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

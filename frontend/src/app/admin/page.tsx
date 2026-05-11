
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Clock, ThumbsUp, ThumbsDown, FileText, ArrowLeft,
  Star, BarChart2, CheckCircle2, AlertTriangle,
  RefreshCw, ShieldCheck, Activity, Code2,
  TriangleAlert, Info, Zap, Terminal, Eye, Brain
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

import { api } from "@/lib/api_client";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { StatCard } from "@/components/admin/StatCard";
import { SatisfactionRing } from "@/components/admin/SatisfactionRing";
import { LogTable } from "@/components/admin/LogTable";
import { DocumentManager } from "@/components/admin/DocumentManager";

// Lazy loading voor de grafiek
const ActivityChart = dynamic(() => import("@/components/admin/ActivityChart").then(mod => mod.ActivityChart), {
  loading: () => <div className="h-48 bg-earth-50 animate-pulse rounded-[2rem]" />,
  ssr: false
});

const ADMIN_PASSWORD = "dedriemusketierszonnehoeve";

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [qaReport, setQaReport] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isQaLoading, setIsQaLoading] = useState(false);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "docs" | "kwaliteit" | "safety">("dashboard");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Data ophalen functies
  const fetchStats = useCallback(async (force: boolean = false, page: number = 1) => {
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/api/admin/stats?page=${page}${force ? "&force=true" : ""}`, {
        headers: { "x-admin-key": password }
      });
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [password]);

  const fetchQaReport = useCallback(async () => {
    setIsQaLoading(true);
    try {
      const data = await api.get<any>("/api/admin/qa-report", {
        headers: { "x-admin-key": password }
      });
      setQaReport(data);
    } catch (e) { console.error(e); }
    finally { setIsQaLoading(false); }
  }, [password]);

  const fetchDocuments = useCallback(async () => {
    setIsDocsLoading(true);
    try {
      const data = await api.get<any[]>("/api/documents");
      setDocuments(data);
    } catch (e) { console.error(e); }
    finally { setIsDocsLoading(false); }
  }, []);

  // WebSocket voor real-time updates
  const { isConnected } = useAdminSocket(isAuthenticated ? password : "", (msg) => {
    console.log("📨 WebSocket bericht ontvangen:", msg);
    if (msg.type === "refresh_stats") {
      fetchStats(false, currentPage);
    } else if (msg.type === "new_log") {
      // Direct log toevoegen aan de UI voor instant feedback
      setStats((prev: any) => {
        if (!prev) return prev;
        const updatedLogs = [msg.data, ...prev.recent_logs].slice(0, 50);
        return { ...prev, recent_logs: updatedLogs };
      });
    } else if (msg.type === "feedback_update") {
      setStats((prev: any) => {
        if (!prev) return prev;
        const updatedLogs = prev.recent_logs.map((log: any) => 
          log.id === msg.data.log_id ? { ...log, user_feedback: msg.data.feedback } : log
        );
        return { ...prev, recent_logs: updatedLogs };
      });
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === "dashboard") fetchStats(false, currentPage);
      if (activeTab === "kwaliteit") fetchQaReport();
      if (activeTab === "docs") fetchDocuments();
    }
  }, [isAuthenticated, activeTab, fetchStats, fetchQaReport, fetchDocuments, currentPage]);

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/api/documents/upload", formData, {
        headers: { "x-admin-key": password }
      });
      fetchDocuments();
    } catch (e) {
      console.error(e);
      alert("Fout bij uploaden van bestand.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteDocument = async (filename: string) => {
    if (!confirm(`Weet je zeker dat je "${filename}" wilt verwijderen?`)) return;
    try {
      await api.delete(`/api/documents/${filename}`, {
        headers: { "x-admin-key": password }
      });
      setDocuments(docs => docs.filter(d => d.filename !== filename));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
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
          <p className="text-earth-800/50 text-sm mb-10 text-center z-10">Voer het beheerderswachtwoord in.</p>
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
      <header className="h-16 border-b border-black/5 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-10 z-20 shadow-sm sticky top-0">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-white border border-black/5 flex items-center justify-center shadow-md overflow-hidden">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-cover" />
          </div>
          <span className="font-extrabold text-lg text-earth-900">Zonnehoeve<span className="text-brand-green-dark font-normal ml-1">| Living+</span></span>
        </Link>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isConnected ? 'bg-green-50 text-brand-green' : 'bg-red-50 text-red-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-brand-green animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'Real-time Live' : 'Offline'}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 lg:p-8 rounded-[2rem] shadow-sm border border-black/5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-brand-yellow/5 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center gap-4">
            <Link href="/" className="w-12 h-12 rounded-2xl bg-earth-100 flex items-center justify-center text-earth-800/60 hover:bg-earth-200 transition-colors shrink-0">
              <ArrowLeft size={22} />
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold">Beheer Dashboard</h1>
              <p className="text-earth-800/50 text-sm font-medium mt-0.5">Real-time monitoring & Systeemstatus</p>
            </div>
          </div>
          <button onClick={() => { fetchStats(true, currentPage); fetchQaReport(); }} disabled={isLoading || isQaLoading}
            className="flex items-center gap-2 px-5 py-3 bg-brand-green text-white rounded-xl font-bold text-sm hover:bg-brand-green-dark transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-brand-green/20 shrink-0">
            <RefreshCw size={16} className={(isLoading || isQaLoading) ? "animate-spin" : ""} />
            {(isLoading || isQaLoading) ? "Laden..." : "Ververs"}
          </button>
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-black/5 w-fit overflow-x-auto">
          {([
            { id: "dashboard", label: "Inzichten", icon: <BarChart2 size={16} /> },
            { id: "docs",      label: "Protocollen",  icon: <FileText size={16} /> },
            { id: "kwaliteit",  label: "Kwaliteit",    icon: <Code2 size={16} /> },
            { id: "safety",     label: "AI Safety",    icon: <ShieldCheck size={16} /> },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-brand-green text-white shadow-md shadow-brand-green/20"
                  : "text-earth-800/50 hover:text-earth-900 hover:bg-earth-50"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <AnimatePresence mode="wait">
            <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {stats ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Totaal Vragen" value={stats.total_questions} icon={<FileText size={20}/>} color="bg-brand-yellow/10 text-brand-yellow-dark" index={0} />
                    <StatCard label="Gem. Latency" value={`${stats.avg_latency}s`} icon={<Clock size={20}/>} color="bg-earth-100 text-earth-700" index={1} />
                    <StatCard label="Thumbs Up" value={stats.thumbs_up} icon={<ThumbsUp size={20}/>} color="bg-green-50 text-brand-green" index={2} />
                    <StatCard label="Thumbs Down" value={stats.thumbs_down} icon={<ThumbsDown size={20}/>} color="bg-red-50 text-red-500" index={3} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <ActivityChart data={stats.daily_activity} />
                    <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-black/5 flex flex-col items-center justify-center gap-4">
                      <div className="flex items-center gap-3 self-start">
                        <div className="p-2.5 bg-brand-yellow/10 rounded-xl text-brand-yellow-dark"><Star size={20} /></div>
                        <h3 className="font-extrabold text-earth-900">Tevredenheid</h3>
                      </div>
                      <SatisfactionRing rate={stats.satisfaction_rate} />
                    </div>
                  </div>

                  <LogTable 
                    logs={stats.recent_logs} 
                    pagination={stats.pagination} 
                    onPageChange={(page) => setCurrentPage(page)} 
                  />
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-earth-800/40 gap-4">
                  <div className="w-10 h-10 border-4 border-earth-100 border-t-brand-green rounded-full animate-spin" />
                  <p className="font-bold">Dashboard laden...</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {activeTab === "docs" && (
          <DocumentManager 
            documents={documents} 
            onUpload={handleFileUpload} 
            onDelete={handleDeleteDocument} 
            isUploading={uploadingFile} 
          />
        )}

        {/* ── KWALITEIT TAB ── */}
        {activeTab === "kwaliteit" && (
          <AnimatePresence mode="wait">
            {isQaLoading ? (
              <motion.div key="qa-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-64 flex flex-col items-center justify-center gap-4 text-earth-800/40">
                <div className="w-10 h-10 border-4 border-earth-100 border-t-brand-green rounded-full animate-spin" />
                <p className="font-bold">Kwaliteitsrapport laden...</p>
              </motion.div>
            ) : !qaReport ? (
              <motion.div key="qa-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-64 flex flex-col items-center justify-center gap-4 text-earth-800/40">
                <AlertTriangle size={40} className="text-earth-200" />
                <p className="font-bold text-center max-w-xs">Geen kwaliteitsdata beschikbaar. Klik op &quot;Ververs&quot; om het rapport op te halen.</p>
              </motion.div>
            ) : (
              <motion.div key="qa-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Score Header */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-brand-yellow/5 blur-3xl rounded-full pointer-events-none" />
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-black shrink-0 ${
                    qaReport.overall_score >= 80 ? "bg-brand-green/10 text-brand-green" :
                    qaReport.overall_score >= 60 ? "bg-yellow-50 text-yellow-600" :
                    qaReport.overall_score >= 40 ? "bg-orange-50 text-orange-500" : "bg-red-50 text-red-500"
                  }`}>
                    {qaReport.overall_score}
                  </div>
                  <div className="flex-1">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 ${
                      qaReport.score_color === "green" ? "bg-brand-green/10 text-brand-green" :
                      qaReport.score_color === "yellow" ? "bg-yellow-50 text-yellow-600" :
                      qaReport.score_color === "orange" ? "bg-orange-50 text-orange-500" : "bg-red-50 text-red-500"
                    }`}>
                      <CheckCircle2 size={12} /> {qaReport.score_label}
                    </div>
                    <h2 className="text-2xl font-black text-earth-900 mb-1">Code Kwaliteitsrapport</h2>
                    <p className="text-earth-800/50 text-sm">Gegenereerd op {qaReport.generated_at ? new Date(qaReport.generated_at).toLocaleString("nl-BE") : "—"}</p>
                    <div className="mt-4 h-2.5 bg-earth-100 rounded-full overflow-hidden max-w-sm">
                      <div className={`h-full rounded-full transition-all duration-1000 ${
                        qaReport.overall_score >= 80 ? "bg-brand-green" :
                        qaReport.overall_score >= 60 ? "bg-yellow-400" :
                        qaReport.overall_score >= 40 ? "bg-orange-400" : "bg-red-400"
                      }`} style={{ width: `${qaReport.overall_score}%` }} />
                    </div>
                  </div>
                </div>

                {/* 3 Hoofdmetrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Tests */}
                  <div className="bg-white rounded-[2rem] p-7 border border-black/5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-brand-green/10 rounded-xl text-brand-green"><Activity size={18} /></div>
                      <h3 className="font-extrabold text-earth-900">Tests</h3>
                    </div>
                    {qaReport.tests?.available ? (
                      <>
                        <div className="text-4xl font-black text-earth-900">{qaReport.tests.pass_rate}%<span className="text-base font-bold text-earth-800/30 ml-1">pass rate</span></div>
                        <div className="h-2 bg-earth-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-green rounded-full" style={{ width: `${qaReport.tests.pass_rate}%` }} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {[
                            { label: "Geslaagd", val: qaReport.tests.passed, color: "text-brand-green" },
                            { label: "Mislukt", val: qaReport.tests.failed, color: "text-red-500" },
                            { label: "Totaal", val: qaReport.tests.total, color: "text-earth-900" },
                            { label: "Duur", val: `${qaReport.tests.duration}s`, color: "text-earth-900" },
                          ].map(s => (
                            <div key={s.label} className="bg-earth-50 rounded-xl p-3">
                              <div className="text-xs font-black text-earth-800/30 uppercase mb-1">{s.label}</div>
                              <div className={`font-black ${s.color}`}>{s.val}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-earth-800/40 text-sm font-bold">{qaReport.tests?.message || "Voer pytest uit om testresultaten te genereren."}</p>
                    )}
                  </div>

                  {/* Coverage */}
                  <div className="bg-white rounded-[2rem] p-7 border border-black/5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-accent-blue/10 rounded-xl" style={{ color: "var(--accent-blue, #3b82f6)" }}><Zap size={18} /></div>
                      <h3 className="font-extrabold text-earth-900">Coverage</h3>
                    </div>
                    {qaReport.coverage?.available ? (
                      <>
                        <div className="text-4xl font-black text-earth-900">{qaReport.coverage.line_coverage}%<span className="text-base font-bold text-earth-800/30 ml-1">lines</span></div>
                        <div className="h-2 bg-earth-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${qaReport.coverage.passes_threshold ? "bg-blue-500" : "bg-orange-400"}`} style={{ width: `${qaReport.coverage.line_coverage}%` }} />
                        </div>
                        <div className="text-xs font-bold text-earth-800/40 flex items-center gap-2">
                          {qaReport.coverage.passes_threshold
                            ? <><CheckCircle2 size={12} className="text-brand-green" /> Drempel van {qaReport.coverage.threshold}% gehaald</>
                            : <><AlertTriangle size={12} className="text-orange-400" /> Onder drempel van {qaReport.coverage.threshold}%</>}
                        </div>
                        {qaReport.coverage.packages?.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-earth-800/30 tracking-widest">Laagste Coverage</p>
                            {qaReport.coverage.packages.slice(0, 5).map((pkg: any, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-earth-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pkg.coverage >= 70 ? "bg-brand-green" : "bg-orange-400"}`} style={{ width: `${pkg.coverage}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-earth-800/40 w-10 text-right">{pkg.coverage}%</span>
                                <span className="text-[10px] font-bold text-earth-800/60 truncate max-w-[80px]" title={pkg.name}>{pkg.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-earth-800/40 text-sm font-bold">{qaReport.coverage?.message || "Voer pytest --cov uit om coverage te meten."}</p>
                    )}
                  </div>

                  {/* Lint */}
                  <div className="bg-white rounded-[2rem] p-7 border border-black/5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-brand-yellow/10 rounded-xl text-brand-yellow-dark"><Code2 size={18} /></div>
                      <h3 className="font-extrabold text-earth-900">Linting</h3>
                    </div>
                    {qaReport.lint?.available ? (
                      <>
                        <div className="flex items-end gap-2">
                          <div className="text-4xl font-black text-earth-900">{qaReport.lint.total_issues}</div>
                          <span className="text-base font-bold text-earth-800/30 mb-1">issues</span>
                          {qaReport.lint.is_clean && <span className="text-xs font-black text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full mb-1">Clean ✓</span>}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[
                            { label: "Errors", val: qaReport.lint.severity?.error ?? 0, color: "text-red-500" },
                            { label: "Warnings", val: qaReport.lint.severity?.warning ?? 0, color: "text-orange-400" },
                            { label: "Info", val: qaReport.lint.severity?.info ?? 0, color: "text-blue-400" },
                          ].map(s => (
                            <div key={s.label} className="bg-earth-50 rounded-xl p-2">
                              <div className={`text-lg font-black ${s.color}`}>{s.val}</div>
                              <div className="text-[9px] font-black text-earth-800/30 uppercase">{s.label}</div>
                            </div>
                          ))}
                        </div>
                        {qaReport.lint.top_rule_violations?.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase text-earth-800/30 tracking-widest">Top Overtredingen</p>
                            {qaReport.lint.top_rule_violations.slice(0, 5).map((v: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="font-black text-earth-800/60 bg-earth-50 px-2 py-0.5 rounded font-mono">{v.code}</span>
                                <span className="font-bold text-earth-800/40">{v.count}×</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {qaReport.lint.most_issues_in?.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase text-earth-800/30 tracking-widest">Meeste Issues In</p>
                            {qaReport.lint.most_issues_in.slice(0, 3).map((f: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="font-bold text-earth-800/60 truncate max-w-[140px]">{f.file}</span>
                                <span className="font-black text-earth-800/40">{f.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-earth-800/40 text-sm font-bold">{qaReport.lint?.message || "Voer ruff check . --output-format=json > ruff_report.json uit."}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── SAFETY TAB ── */}
        {activeTab === "safety" && (
          <AnimatePresence mode="wait">
            {isQaLoading ? (
              <motion.div key="safety-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-64 flex flex-col items-center justify-center gap-4 text-earth-800/40">
                <div className="w-10 h-10 border-4 border-earth-100 border-t-brand-green rounded-full animate-spin" />
                <p className="font-bold">Safety rapport laden...</p>
              </motion.div>
            ) : !qaReport?.safety?.available ? (
              <motion.div key="safety-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-earth-900 rounded-[2rem] p-8 text-white shadow-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-green/20 text-brand-green rounded-full text-[10px] font-black uppercase mb-4">
                    <ShieldCheck size={12} /> AI Safety & Compliance
                  </div>
                  <h2 className="text-2xl font-black mb-3">Safety-testresultaten niet beschikbaar</h2>
                  <p className="text-white/50 text-sm max-w-lg">{qaReport?.safety?.message || "Voer 'pytest tests/test_chatbot_qa_expert.py' uit om safety-metrics te genereren."}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="safety-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Trust Score Header */}
                <div className="bg-earth-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
                    <div className="w-24 h-24 rounded-full bg-brand-green/20 border-2 border-brand-green/30 flex items-center justify-center shrink-0">
                      <span className="text-3xl font-black text-brand-green">{qaReport.safety.overall_trust_score}%</span>
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-green/20 text-brand-green rounded-full text-[10px] font-black uppercase mb-3">
                        <ShieldCheck size={12} /> AI Safety & Compliance
                      </div>
                      <h2 className="text-3xl font-black mb-2">AI Trust Score</h2>
                      <p className="text-white/50 text-sm max-w-lg">Validatie van grounding, adversarial resistance, context-coherentie en latency op basis van expert QA-tests.</p>
                    </div>
                  </div>
                </div>

                {/* Categorie Scores */}
                {qaReport.safety.category_scores && Object.keys(qaReport.safety.category_scores).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {Object.entries(qaReport.safety.category_scores).map(([cat, score]: [string, any]) => {
                      const pct = typeof score === "number" ? score : parseFloat(score);
                      return (
                        <div key={cat} className="bg-white p-7 rounded-[2rem] border border-black/5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${pct >= 80 ? "bg-brand-green/10 text-brand-green" : pct >= 60 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-500"}`}>
                                <ShieldCheck size={18} />
                              </div>
                              <h3 className="font-extrabold text-earth-900">{cat}</h3>
                            </div>
                            <span className={`text-2xl font-black ${pct >= 80 ? "text-brand-green" : pct >= 60 ? "text-yellow-600" : "text-red-500"}`}>{pct}%</span>
                          </div>
                          <div className="h-2.5 bg-earth-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 80 ? "bg-brand-green" : pct >= 60 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs font-bold text-earth-800/30 text-center">Gegenereerd op {qaReport.safety.generated_at ? new Date(qaReport.safety.generated_at).toLocaleString("nl-BE") : "—"}</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

      </div>
    </div>
  );
}


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

        {/* Kwaliteit & Safety Tabs - Versimpelde weergave of integratie uit oude code */}
        {activeTab === "kwaliteit" && qaReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 rounded-full bg-brand-green/10 flex items-center justify-center text-3xl font-black text-brand-green">
                  {qaReport.overall_score}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-earth-900">Code Kwaliteit: {qaReport.score_label}</h2>
                  <p className="text-earth-800/50 mt-2">Gezondheidsscore op basis van tests, linting en coverage.</p>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[1.8rem] border border-black/5">
                   <h4 className="text-xs font-black uppercase text-earth-800/30 mb-4 flex items-center gap-2"><Activity size={14}/> Tests</h4>
                   <div className="text-3xl font-black">{qaReport.tests?.pass_rate}% Pass Rate</div>
                </div>
                <div className="bg-white p-6 rounded-[1.8rem] border border-black/5">
                   <h4 className="text-xs font-black uppercase text-earth-800/30 mb-4 flex items-center gap-2"><Code2 size={14}/> Lint Issues</h4>
                   <div className="text-3xl font-black">{qaReport.lint?.total_issues} issues</div>
                </div>
                <div className="bg-white p-6 rounded-[1.8rem] border border-black/5">
                   <h4 className="text-xs font-black uppercase text-earth-800/30 mb-4 flex items-center gap-2"><Zap size={14}/> Coverage</h4>
                   <div className="text-3xl font-black">{qaReport.coverage?.line_coverage}%</div>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === "safety" && qaReport?.safety && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
             <div className="bg-earth-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-green/20 text-brand-green rounded-full text-[10px] font-black uppercase mb-4">
                     <ShieldCheck size={12} /> AI Safety & Compliance
                   </div>
                   <h2 className="text-3xl font-black mb-3">AI Trust Score: {qaReport.safety.overall_trust_score}%</h2>
                   <p className="text-white/60 max-w-xl text-sm">Validatie van grounding, adversarial resistance en latency.</p>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2rem] border border-black/5">
                   <div className="flex items-center gap-3 mb-6">
                      <Terminal size={20} className="text-red-500" />
                      <h3 className="font-bold">Red Teaming Resistance</h3>
                   </div>
                   <div className="text-4xl font-black text-earth-900">{qaReport.safety.category_scores?.['Red Teaming']}%</div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-black/5">
                   <div className="flex items-center gap-3 mb-6">
                      <Brain size={20} className="text-brand-green" />
                      <h3 className="font-bold">Grounding Accuracy</h3>
                   </div>
                   <div className="text-4xl font-black text-earth-900">{qaReport.safety.category_scores?.['Grounding']}%</div>
                </div>
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

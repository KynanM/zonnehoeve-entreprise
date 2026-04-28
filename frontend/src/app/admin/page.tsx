import {
  Lock, Clock, ThumbsUp, ThumbsDown, FileText, ArrowLeft,
  TrendingUp, Star, BarChart2, BookOpen, CheckCircle2, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, Upload, Trash2, Plus, Search,
  Database, FileUp
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api_client";

const ADMIN_PASSWORD = "dedriemusketierszonnehoeve";

// ... (MiniBarChart and SatisfactionRing remain the same)

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"stats" | "docs">("stats");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [docSearch, setDocSearch] = useState("");

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<any>("/api/admin/stats", {
        headers: { "x-admin-key": password }
      });
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
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
      if (activeTab === "stats") fetchStats();
      if (activeTab === "docs") fetchDocuments();
    }
  }, [isAuthenticated, activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Ongeldig wachtwoord!");
    }
  };

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

  if (!isAuthenticated) {
    // ... (Login form remains the same)
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

  const filteredDocs = documents.filter(d => d.filename.toLowerCase().includes(docSearch.toLowerCase()));

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
        <nav className="flex gap-2 sm:gap-6 text-sm font-bold bg-earth-100 p-1.5 rounded-2xl">
          <button onClick={() => setActiveTab("stats")} className={`px-4 py-2 rounded-xl transition-all ${activeTab === "stats" ? "bg-white text-earth-900 shadow-sm" : "text-earth-800/50 hover:text-earth-800"}`}>Statistieken</button>
          <button onClick={() => setActiveTab("docs")} className={`px-4 py-2 rounded-xl transition-all ${activeTab === "docs" ? "bg-white text-earth-900 shadow-sm" : "text-earth-800/50 hover:text-earth-800"}`}>Documenten</button>
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
              <h1 className="text-2xl lg:text-3xl font-extrabold">{activeTab === "stats" ? "Feedback Inzichten" : "Protocol Beheer"}</h1>
              <p className="text-earth-800/50 text-sm font-medium mt-0.5">{activeTab === "stats" ? "Systeemgebruik & kwaliteitsmonitoring" : "Beheer de kennisbronnen van de AI"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {activeTab === "docs" && (
              <label className="flex items-center gap-2 px-5 py-3 bg-brand-yellow text-brand-yellow-dark rounded-xl font-bold text-sm hover:opacity-90 transition-all cursor-pointer active:scale-95 shadow-lg shadow-brand-yellow/20 shrink-0">
                <FileUp size={16} />
                {uploadingFile ? "Uploaden..." : "Nieuw Protocol"}
                <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} disabled={uploadingFile} />
              </label>
            )}
            <button onClick={activeTab === "stats" ? fetchStats : fetchDocuments} disabled={isLoading || isDocsLoading}
              className="flex items-center gap-2 px-5 py-3 bg-brand-green text-white rounded-xl font-bold text-sm hover:bg-brand-green-dark transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-brand-green/20 shrink-0">
              <RefreshCw size={16} className={(isLoading || isDocsLoading) ? "animate-spin" : ""} />
              Ververs
            </button>
          </div>
        </div>

        {activeTab === "stats" ? (
          /* Statistieken Tab */
          isLoading && !stats ? (
            <div className="h-64 flex flex-col items-center justify-center text-earth-800/40 gap-4">
              <div className="w-10 h-10 border-4 border-earth-100 border-t-brand-green rounded-full animate-spin" />
              <p className="font-bold">Statistieken worden geladen...</p>
            </div>
          ) : !stats ? (
            <div className="h-40 flex items-center justify-center bg-white rounded-[2rem] border border-red-100 text-red-500 font-bold shadow-sm gap-3">
              <AlertTriangle size={20} />
              Geen data beschikbaar. Zorg dat de backend online is.
            </div>
          ) : (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
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
                        </tr>
                      </thead>
                      <tbody>
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
                              <div className="flex flex-col gap-1">{log.retrieved_sources?.map((s: string, i: number) => (
                                <span key={i} className="text-[10px] bg-earth-100 px-2 py-0.5 rounded font-medium truncate max-w-[140px]">{s}</span>
                              ))}</div>
                            </td>
                            <td className="px-6 py-4">
                              {log.user_feedback === "thumbs_up" ? <ThumbsUp size={14} className="text-brand-green" /> : log.user_feedback === "thumbs_down" ? <ThumbsDown size={14} className="text-red-400" /> : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )
        ) : (
          /* Documenten Tab */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Search & Actions */}
            <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-black/5 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-800/30" size={18} />
                <input
                  type="text"
                  placeholder="Zoek in protocollen..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-earth-50 rounded-xl text-sm outline-none focus:ring-2 ring-brand-green/20 transition-all"
                />
              </div>
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
                          <td className="px-6 py-4 text-earth-800/50">
                            {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("nl-BE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td className="px-6 py-4 uppercase text-[10px] font-black text-earth-800/30 tracking-widest">
                            {doc.mime_type.split("/")[1] || "DOC"}
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
        )}
      </div>
    </div>
  );
}

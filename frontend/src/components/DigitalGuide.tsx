"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, AlertTriangle, Sparkles, ClipboardList, Home, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Group, Panel, Separator } from "react-resizable-panels";

// Components
import MessageItem from "./Chat/MessageItem";
import ChatInput from "./Chat/ChatInput";
import ThreadSidebar from "./Chat/ThreadSidebar";
import DocumentSidebar from "./Library/DocumentSidebar";
import OutlineView from "./Library/OutlineView";
import DocumentToolbar from "./Library/DocumentToolbar";
import FourMoments from "./FourMoments";

// Hooks & Types
import { useDigitalGuide } from "@/hooks/useDigitalGuide";
import { usePdfLoader } from "@/hooks/usePdfLoader";
import { DigitalGuideProps, Message } from "./Chat/types";

export default function DigitalGuide({ initialTheme = "light", onThemeChange, className }: DigitalGuideProps) {
  const {
    messages, setMessages, input, setInput, isLoading, threads, activeThreadId, setActiveThreadId,
    activeDocument, setActiveDocument, activePage, setActivePage, availableDocs, pinnedDocs,
    recentDocs, searchQuery, setSearchQuery, cooldown, toast, suggestions, searchResults,
    isSearching, previews, outline, showOutline, setShowOutline, theme, recentUpdates,
    showUpdateBanner, setShowUpdateBanner, dossierModal, setDossierModal,
    messagesEndRef,
    // Handlers
    handleSubmit, handleDocumentClick, handleDownload, handleFeedback, handlePin, deleteThread, startNewChat, 
    showToast, fetchPreview, pinThread, renameThread, deleteAllThreads
  } = useDigitalGuide(initialTheme, onThemeChange);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showMobileDoc, setShowMobileDoc] = useState(false);
  const [dossierNote, setDossierNote] = useState("");
  const [feedbackExplainer, setFeedbackExplainer] = useState<{index: number, feedback: string} | null>(null);
  const [explainerText, setExplainerText] = useState("");
  const [zoom, setZoom] = useState(1.0);
  const { pdfBlobUrl, isPdfLoading } = usePdfLoader(activeDocument, showToast);

  // Local effect for deep-linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get("doc");
    const pageParam = params.get("page");
    if (docParam) {
      handleDocumentClick(pageParam ? `${docParam}#page=${pageParam}` : docParam);
    }

    // Listen for custom 'open-doc' event from Markdown citations
    const handleOpenDoc = (e: any) => {
      if (e.detail) handleDocumentClick(e.detail);
    };
    window.addEventListener('open-doc', handleOpenDoc);
    return () => window.removeEventListener('open-doc', handleOpenDoc);
  }, [handleDocumentClick]);



  const handleFeedbackClick = (index: number, feedback: string) => {
    // Map 'up'/'down' to 'thumbs_up'/'thumbs_down' for backend compatibility
    const backendFeedback = feedback === "up" ? "thumbs_up" : "thumbs_down";
    // Sla de feedback DIRECT op — UI bijwerken en naar backend sturen zonder modal te vereisen
    handleFeedback(index, backendFeedback);
    // Toon de explainer-modal optioneel voor extra toelichting
    setFeedbackExplainer({ index, feedback: backendFeedback });
  };

  const submitFeedbackExplainer = async () => {
    if (!feedbackExplainer) return;
    try {
      await handleFeedback(feedbackExplainer.index, feedbackExplainer.feedback);
      if (explainerText) showToast("Bedankt voor de extra toelichting!");
    } finally {
      setFeedbackExplainer(null);
      setExplainerText("");
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    showToast("Gekopieerd!");
  };

  const handlePrint = (messageId: string) => {
    const element = document.getElementById(messageId);
    if (!element) return;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    const today = new Date().toLocaleDateString('nl-BE');
    printWindow.document.write(`<html><body style="font-family: sans-serif; padding: 40px;"><h2>Zonnehoeve Notitite - ${today}</h2><hr/>${element.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleDossierExport = (msg: Message) => {
    setDossierNote("");
    setDossierModal({ show: true, content: msg.content, sources: msg.retrieved_sources || [] });
  };

  const handlePrintDossier = () => {
    if (!dossierModal) return;
    const today = new Date().toLocaleDateString("nl-BE");
    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(`<html><body style="font-family: sans-serif; padding: 40px;"><h2>Zonnehoeve Dossiernotitie - ${today}</h2><p><strong>Digitale Gids:</strong> ${dossierModal.content}</p>${dossierNote ? `<p><strong>Notitie:</strong> ${dossierNote}</p>` : ""}<p><small>Bronnen: ${dossierModal.sources.join(", ")}</small></p></body></html>`);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
    setDossierModal(null);
  };

  return (
    <div className={cn("flex flex-col h-full bg-transparent overflow-hidden", className)}>
      <AnimatePresence>
        {toast.show && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-brand-green-dark text-white px-6 py-2.5 rounded-full shadow-2xl font-bold border-2 border-white text-sm">
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10 w-full max-w-full min-h-0">
        <ThreadSidebar 
          threads={threads} 
          activeThreadId={activeThreadId} 
          onThreadSelect={(id) => { setActiveThreadId(id); }} 
          onThreadDelete={deleteThread} 
          onThreadPin={pinThread}
          onThreadRename={renameThread}
          onDeleteAll={deleteAllThreads}
          onNewChat={startNewChat} 
          theme={theme} 
        />

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full min-h-0">
          <Group orientation="horizontal" className="flex-1 w-full h-full">
            {/* Chat Panel */}
            <Panel defaultSize={60} minSize={30}>
              <section className={cn(
                "h-full flex flex-col overflow-hidden transition-all border-l",
                theme === 'night' ? "bg-stone-900/60 border-stone-800" : "bg-white/60 border-stone-200"
              )}>
                <header className={cn(
                  "px-8 py-4 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-[60]",
                  theme === 'night' ? "bg-stone-900/80 border-stone-800" : "bg-white/80 border-stone-100"
                )}>
                  <div className="flex items-center gap-6">
                    <Link href="/" aria-label="Terug naar Home" className="hover:text-emerald-500 transition-colors text-stone-400">
                      <Home size={20} />
                    </Link>
                    <div className="w-px h-6 bg-stone-200 dark:bg-stone-800" />
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Sparkles size={18} /></div>
                      <h1 className={cn("font-black tracking-tight", theme === 'night' ? "text-stone-100" : "text-stone-900")}>Digitale Gids</h1>
                    </div>
                    <div className="w-px h-6 bg-stone-200 dark:bg-stone-800" />
                    <div className="w-16 h-6 relative grayscale opacity-40 hover:opacity-100 transition-opacity">
                      <Image src="/logo_vives.png" alt="VIVES" fill className="object-contain" />
                    </div>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 custom-scrollbar">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-10">
                      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className={cn("w-32 h-24 rounded-3xl flex items-center justify-center gap-4 px-6 shadow-2xl border", theme === 'night' ? "bg-stone-800 border-stone-700" : "bg-white border-stone-100")}>
                        <div className="w-12 h-12 relative">
                          <Image src="/logo.png" alt="Zonnehoeve" fill className="object-contain" />
                        </div>
                        <div className="w-px h-10 bg-stone-200 dark:bg-stone-700" />
                        <div className="w-12 h-12 relative">
                          <Image src="/logo_vives.png" alt="VIVES" fill className="object-contain" />
                        </div>
                      </motion.div>
                      <div className="space-y-3">
                        <h2 className={cn("text-3xl font-black tracking-tight", theme === 'night' ? "text-stone-100" : "text-stone-900")}>Digitale Gids</h2>
                        <p className="text-stone-400 font-bold max-w-sm mx-auto leading-relaxed">Waarmee kan ik je helpen vandaag?</p>
                        <div className="pt-2 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 dark:text-stone-600">Ontwikkeld door</span>
                          <span className="text-xs font-bold text-stone-400">Kynan Melsens & Aaron Vangermeersch</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 justify-center max-w-2xl px-4">
                        {(suggestions.length > 0 ? suggestions : ["Rookbeleid?", "Arbeidsongeval?", "Medicatie protocol?"]).map((sug, i) => (
                          <button key={i} onClick={() => handleSubmit(sug)}
                            className={cn(
                              "px-5 py-3 rounded-2xl text-xs font-black transition-all shadow-sm flex items-center gap-2 group",
                              theme === 'night' ? "bg-stone-800 border border-stone-700 text-stone-300 hover:bg-emerald-600 hover:text-white" : "bg-white border border-stone-100 text-stone-600 hover:bg-emerald-600 hover:text-white"
                            )}>
                            <Sparkles size={14} className="text-emerald-500 group-hover:text-white" />
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <MessageItem 
                      key={i} index={i} message={msg} theme={theme} 
                      onCopy={handleCopy} onPrint={handlePrint} onDossierExport={handleDossierExport} 
                      onFeedback={handleFeedbackClick} onDocumentClick={handleDocumentClick}
                    />
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
                    <div className="flex justify-start mb-6"><div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" /></div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="bg-white/50 backdrop-blur-xl relative">
                   {activeDocument && (
                     <button onClick={() => setShowMobileDoc(true)} className="lg:hidden absolute -top-16 right-6 p-4 bg-emerald-600 text-white rounded-full shadow-xl z-50 flex items-center gap-2 font-bold text-sm">
                       <FileText size={18} /><span>Lees Protocol</span>
                     </button>
                   )}
                   <FourMoments onSuggestionClick={handleSubmit} />
                   <ChatInput input={input} setInput={setInput} isLoading={isLoading} onSubmit={handleSubmit} onVoiceInput={handleSubmit} cooldown={cooldown} theme={theme} />
                   <div className="pb-2 text-center">
                     <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest opacity-50">© 2026 VIVES - Kynan Melsens & Aaron Vangermeersch</span>
                   </div>
                </div>
              </section>
            </Panel>

            <Separator className="w-2 hover:bg-emerald-500/20 transition-colors hidden lg:block cursor-col-resize" />

            {/* Document Panel */}
            <Panel defaultSize={40} minSize={0} collapsible={true}>
              <aside className={cn(
                "h-full border-l overflow-hidden transition-all flex flex-col",
                theme === 'night' ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"
              )}>
                {activeDocument ? (
                  <div className="flex-1 flex flex-col h-full">
                    <DocumentToolbar 
                      filename={activeDocument} 
                      currentPage={parseInt(activePage?.replace("page=", "") || "1")} 
                      totalPages={0} 
                      zoom={zoom} 
                      onZoomChange={setZoom} 
                      onPageChange={(p) => setActivePage(`page=${p}`)} 
                      onClose={() => setActiveDocument(null)} 
                      onDownload={() => handleDownload(activeDocument)}
                      theme={theme} 
                    />
                    <div className="flex-1 relative flex bg-stone-50 overflow-hidden">
                      <AnimatePresence>
                        {showOutline && <OutlineView outline={outline} onPageClick={setActivePage} onClose={() => setShowOutline(false)} theme={theme} />}
                      </AnimatePresence>
                      
                      {isPdfLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                           <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                           <p className="text-xs font-bold text-stone-400">Document inladen...</p>
                        </div>
                      ) : pdfBlobUrl ? (
                        <iframe 
                          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100/zoom}%`, height: `${100/zoom}%` }}
                          src={`${pdfBlobUrl}${activePage ? `#${activePage}` : ''}`} 
                          className="flex-1 border-0" 
                          key={`${activeDocument}-${activePage}-${pdfBlobUrl}`} 
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-stone-400 font-bold text-sm">
                           Kon document niet weergeven.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col h-full">
                    <div className={cn("p-5 border-b flex items-center justify-between backdrop-blur-md", theme === 'night' ? "bg-stone-900/80 border-stone-800" : "bg-white/80 border-stone-100")}>
                       <div className="flex-1 font-black text-sm uppercase tracking-widest text-stone-400">Bibliotheek</div>
                    </div>
                    <DocumentSidebar 
                      availableDocs={availableDocs} pinnedDocs={pinnedDocs} recentDocs={recentDocs} 
                      recentUpdates={recentUpdates} previews={previews} 
                      onDocumentClick={handleDocumentClick} 
                      onDocumentDownload={handleDownload}
                      onPinToggle={handlePin} 
                      onFetchPreview={fetchPreview} searchQuery={searchQuery} onSearchChange={setSearchQuery} 
                      isSearching={isSearching} theme={theme} 
                    />
                  </div>
                )}
              </aside>
            </Panel>
          </Group>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {dossierModal?.show && (
          <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-stone-100">
              <div className="flex items-center gap-3 mb-6"><ClipboardList className="text-emerald-600" size={24} /><h3>Dossiernotitie</h3></div>
              <textarea value={dossierNote} onChange={e => setDossierNote(e.target.value)} className="w-full border-2 border-stone-100 p-5 rounded-2xl mb-6 h-40 outline-none" />
              <div className="flex gap-3">
                <button onClick={handlePrintDossier} className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-2xl">Exporteer & Print</button>
                <button onClick={() => setDossierModal(null)} className="px-8 py-4 bg-stone-100 rounded-2xl">Sluiten</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedbackExplainer && (
          <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-stone-100">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-2 rounded-xl", feedbackExplainer.feedback === "thumbs_up" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                  {feedbackExplainer.feedback === "thumbs_up" ? <ThumbsUp size={20} /> : <ThumbsDown size={20} />}
                </div>
                <h3 className="text-xl font-black">Bedankt voor je feedback!</h3>
              </div>
              <p className="text-stone-500 text-sm mb-6 font-medium">Wil je kort toelichten waarom dit antwoord {feedbackExplainer.feedback === "thumbs_up" ? "nuttig" : "niet nuttig"} was? Dit helpt ons de gids te verbeteren.</p>
              <textarea 
                value={explainerText} 
                onChange={e => setExplainerText(e.target.value)} 
                placeholder="Toelichting (optioneel)..."
                className="w-full border-2 border-stone-100 p-5 rounded-2xl mb-6 h-32 outline-none focus:border-emerald-500 transition-colors text-sm font-medium" 
              />
              <div className="flex gap-3">
                <button onClick={submitFeedbackExplainer} className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-colors active:scale-95 shadow-lg shadow-emerald-600/20">Versturen</button>
                <button onClick={() => setFeedbackExplainer(null)} className="px-8 py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200 transition-colors">Later</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Mobile Drawer */}
      <AnimatePresence>
        {showMobileDoc && activeDocument && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-[120] bg-white lg:hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <span className="font-bold truncate">{activeDocument}</span>
              <button onClick={() => setShowMobileDoc(false)} aria-label="Sluit document" className="p-2 bg-stone-100 rounded-xl"><X size={20} /></button>
            </div>
            <div className="flex-1 relative bg-white">
              {pdfBlobUrl ? (
                <iframe src={`${pdfBlobUrl}${activePage ? `#${activePage}` : ''}`} className="w-full h-full border-0" />
              ) : (
                <div className="flex items-center justify-center h-full text-stone-400 font-bold">Laden...</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

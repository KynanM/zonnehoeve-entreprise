import { useState, useRef, useEffect, useCallback } from "react";
import { Message, PinnedNote } from "@/components/Chat/types";
import { api } from "@/lib/api_client";

export function useDigitalGuide(initialTheme: "light" | "night" = "light", onThemeChange?: (theme: "light" | "night") => void) {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [availableDocs, setAvailableDocs] = useState<string[]>([]);
  const [pinnedDocs, setPinnedDocs] = useState<string[]>([]);
  const [recentDocs, setRecentDocs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ""});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [outline, setOutline] = useState<{title: string, page: number}[]>([]);
  const [showOutline, setShowOutline] = useState(false);
  const [theme, setTheme] = useState<"light" | "night">(initialTheme);
  const [recentUpdates, setRecentUpdates] = useState<{filename: string, last_modified: string}[]>([]);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [dossierModal, setDossierModal] = useState<{show: boolean, content: string, sources: string[]} | null>(null);
  const [pinnedNotes, setPinnedNotes] = useState<PinnedNote[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial Load
  useEffect(() => {
    fetchThreads();
    fetchDocs();
    fetchRecentUpdates();
    try {
      const saved = localStorage.getItem("zonnehoeve-pinned-notes");
      if (saved) setPinnedNotes(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Theme Sync
  useEffect(() => { if (onThemeChange) onThemeChange(theme); }, [theme, onThemeChange]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // Handlers
  const fetchThreads = async () => {
    try {
      const data = await api.get<any[]>("/api/chat/threads");
      if (Array.isArray(data)) {
        setThreads(data);
      } else {
        console.error("Threads API did not return an array:", data);
        setThreads([]);
      }
    } catch (e) { console.error(e); setThreads([]); }
  };

  const fetchDocs = async () => {
    try {
      const data = await api.get<any[]>("/api/documents");
      if (Array.isArray(data)) {
        // We mappen naar enkel de filenames voor backwards compatibility met de Gids componenten.
        // We voegen extra checks toe om te garanderen dat we alleen geldige strings overhouden.
        const filenames = data
          .map(d => {
            if (typeof d === 'string') return d;
            if (d && typeof d === 'object' && d.filename) return d.filename;
            return null;
          })
          .filter((f): f is string => typeof f === 'string');
          
        setAvailableDocs(filenames);
      } else {
        setAvailableDocs([]);
      }
    } catch (e) { console.error(e); setAvailableDocs([]); }
  };

  const fetchRecentUpdates = async () => {
    try {
      const updates = await api.get<any[]>("/api/documents/updates/recent?days=7");
      if (Array.isArray(updates) && updates.length > 0) { 
        setRecentUpdates(updates); 
        setShowUpdateBanner(true); 
      }
    } catch (e) { /* ignore */ }
  };

  const fetchPreview = async (doc: string) => {
    if (previews[doc]) return;
    try {
      const text = await api.get<string>(`/api/documents/${encodeURIComponent(doc)}/preview`);
      setPreviews(prev => ({ ...prev, [doc]: text }));
    } catch (e) { /* ignore */ }
  };

  const fetchOutline = async (doc: string) => {
    try {
      const data = await api.get<any[]>(`/api/documents/${encodeURIComponent(doc)}/outline`);
      setOutline(data);
    } catch { /* ignore */ }
  };

  const fetchSuggestions = async (doc: string) => {
    try {
      const data = await api.get<string[]>(`/api/documents/${encodeURIComponent(doc)}/suggest-questions`);
      setSuggestions(data);
    } catch { /* ignore */ }
  };

  const performSemanticSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const results = await api.get<string[]>(`/api/documents/search?q=${encodeURIComponent(query)}`);
      setSearchResults(results);
    } catch (e) { console.error("Search error", e); } finally { setIsSearching(false); }
  }, []);

  // Search Debouncer
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 3) performSemanticSearch(searchQuery);
      else setSearchResults(availableDocs);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, availableDocs, performSemanticSearch]);

  useEffect(() => {
    if (activeDocument) { 
      fetchSuggestions(activeDocument); 
      fetchOutline(activeDocument); 
      setShowOutline(false); 
    }
  }, [activeDocument]);

  const showToast = useCallback((message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent | string) => {
    if (typeof e !== "string") e.preventDefault();
    const prompt = typeof e === "string" ? e : input;
    if (!prompt.trim() || isLoading || cooldown > 0) return;

    setMessages(prev => [...prev, { role: "user", content: prompt }]);
    setInput("");
    setIsLoading(true);

    try {
      let assistantContent = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      await api.stream("/api/chat/", {
        input: prompt,
        chat_history: messages.map(m => ({ role: m.role, content: m.content })),
        thread_id: activeThreadId
      }, (chunk) => {
        assistantContent += chunk;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1].content = assistantContent;
          return next;
        });
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, (logId) => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1].log_id = logId;
          return next;
        });
      }, (sources) => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1].retrieved_sources = sources;
          return next;
        });
      });

      if (!activeThreadId) fetchThreads();
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMsg = error?.message?.includes("500") 
        ? "Serverfout: De AI kon het antwoord niet genereren." 
        : "Verbindingsfout: Controleer je internetverbinding.";
      
      setMessages(prev => {
        const next = [...prev];
        if (next[next.length - 1].role === "assistant" && !next[next.length - 1].content) {
            next[next.length - 1].content = errorMsg;
        } else {
            next.push({ role: "assistant", content: errorMsg });
        }
        return next;
      });
      showToast("Er is een fout opgetreden.");
    } finally {
      setIsLoading(false);
      setCooldown(2);
    }
  }, [input, isLoading, cooldown, messages, activeThreadId, showToast]);

  const handleDocumentClick = useCallback((fullDocRef: string) => {
    // Decodeer de URL-encoded bestandsnaam (bijv. %20 naar spatie)
    const decodedRef = decodeURIComponent(fullDocRef);
    const [doc, pageHash] = decodedRef.split('#');
    setActiveDocument(doc);
    setActivePage(pageHash || null);
    setRecentDocs(prev => [doc, ...prev.filter(d => d !== doc)].slice(0, 3));
  }, []);

  const handleDownload = (doc: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    // Gebruik de proxy URL met download=true om een download te forceren
    const downloadUrl = `/api/documents/${encodeURIComponent(doc)}?download=true`;
    
    // Maak een tijdelijk link element om de download te starten
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', doc);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Download gestart: ${doc}`);
  };

  const handleFeedback = async (index: number, feedback: string) => {
    const msg = messages[index];
    if (msg.log_id) {
      try {
        await api.post("/api/chat/feedback", { log_id: msg.log_id, feedback });
      } catch (e) {
        console.error("Feedback error", e);
      }
    }
    setMessages(prev => {
      const next = [...prev];
      next[index].feedback = feedback;
      return next;
    });
    showToast("Bedankt voor je feedback!");
  };

  const handlePin = (doc: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedDocs(prev => prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]);
  };

  const deleteThread = async (id: string) => {
    try {
      await api.delete(`/api/chat/threads/${id}`, {
        headers: { "x-admin-key": "dedriemusketierszonnehoeve" }
      });
      fetchThreads();
      if (activeThreadId === id) {
        setMessages([]);
        setActiveThreadId(null);
      }
    } catch (e) { console.error(e); }
  };

  const finishNewChat = () => { setMessages([]); setActiveThreadId(null); };

  const pinThread = async (id: string, isPinned: boolean) => {
    try {
      await api.patch(`/api/chat/threads/${id}/metadata`, { is_pinned: isPinned ? 1 : 0 });
      fetchThreads();
    } catch (e) { console.error(e); }
  };

  const renameThread = async (id: string, newTitle: string) => {
    try {
      await api.patch(`/api/chat/threads/${id}/metadata`, { title: newTitle });
      fetchThreads();
    } catch (e) { console.error(e); }
  };

  const deleteAllThreads = async () => {
    try {
      await api.delete("/api/chat/threads", {
        headers: { "x-admin-key": "dedriemusketierszonnehoeve" }
      });
      setThreads([]);
      setMessages([]);
      setActiveThreadId(null);
      showToast("Alle gesprekken verwijderd.");
    } catch (e) { console.error(e); }
  };

  return {
    // State
    messages, setMessages, input, setInput, isLoading, threads, activeThreadId, setActiveThreadId,
    activeDocument, setActiveDocument, activePage, setActivePage, availableDocs, pinnedDocs,
    recentDocs, searchQuery, setSearchQuery, cooldown, toast, setToast, suggestions, searchResults,
    isSearching, previews, outline, showOutline, setShowOutline, theme, setTheme, recentUpdates,
    showUpdateBanner, setShowUpdateBanner, dossierModal, setDossierModal, pinnedNotes, setPinnedNotes,
    messagesEndRef,
    // Handlers
    handleSubmit, handleDocumentClick, handleDownload, handleFeedback, handlePin, deleteThread, finishNewChat, 
    showToast, fetchPreview, pinThread, renameThread, deleteAllThreads
  };
}

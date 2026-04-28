"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

export default function ServiceWorkerRegistrar() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Registreer de service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[SW] Geregistreerd:", reg.scope))
        .catch((err) => console.error("[SW] Registratie mislukt:", err));
    }

    // Luister naar het PWA install event
    const handleBeforeInstall = (e: Event) => {
      console.log("[PWA] beforeinstallprompt event afgevuurd");
      
      // Sla de event op voor later gebruik
      setInstallPrompt(e);
      
      // Toon banner alleen als niet eerder weggedrukt in deze sessie
      const wasDismissed = localStorage.getItem("pwa-install-dismissed");
      if (!wasDismissed) {
        // Voorkom de standaard browser prompt alleen als we onze eigen banner tonen
        e.preventDefault();
        console.log("[PWA] Toon installatie banner");
        setShowInstallBanner(true);
      } else {
        console.log("[PWA] Banner niet getoond: eerder weggedrukt");
        // We roepen e.preventDefault() NIET aan, zodat de browser 
        // eventueel zijn eigen gedrag kan bepalen (of niets doet).
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      console.log("[PWA] App geïnstalleerd!");
    }
    setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {showInstallBanner && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm"
        >
          <div className="bg-white border border-black/10 rounded-3xl shadow-2xl px-6 py-5 flex items-center gap-4">
            <div className="p-3 bg-brand-green/10 rounded-2xl shrink-0 text-brand-green-dark">
              <Download size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-earth-900 text-sm">Installeer de app</p>
              <p className="text-xs text-earth-800/60 mt-0.5">Altijd bij de hand, ook offline</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-brand-green text-white rounded-xl text-xs font-bold hover:bg-brand-green-dark transition-all active:scale-95"
              >
                Installeer
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 text-earth-800/40 hover:text-earth-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

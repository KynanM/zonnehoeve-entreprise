"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, ShieldCheck, HeartPulse, ArrowRight, MapPin, 
  ChevronRight, CheckCircle2, MessageSquare, Sparkles,
  Command, Layers, Smartphone, WifiOff, Mic, Settings,
  ArrowUp, HeartHandshake
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import DigitalGuide from "@/components/DigitalGuide";
import AmbientBackground from "@/components/AmbientBackground";

const clusters = [
  {
    title: "Zelfredzaamheid",
    subtitle: "Autonomie & Regie",
    description: "Wij ondersteunen volwassenen om de regie over hun eigen leven te herwinnen. Samen bouwen we aan autonomie in een inclusieve omgeving waar iedereen meetelt.",
    url: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&q=80&w=800",
    icon: <Users className="text-brand-green" />,
  },
  {
    title: "Veilig & Voorspelbaar",
    subtitle: "Rust & Houvast",
    description: "Een veilige haven waar structuur en nabijheid zorgen voor emotionele veiligheid. Wij bieden een voorspelbare omgeving die rust en houvast geeft.",
    url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800",
    icon: <ShieldCheck className="text-blue-600" />,
  },
  {
    title: "Verzorging",
    subtitle: "Zorg & Warmte",
    description: "Kwaliteitsvolle fysieke ondersteuning in een warme, huiselijke sfeer. Hier staat het fysieke en emotionele welzijn van iedere burger op de eerste plaats.",
    url: "https://images.unsplash.com/photo-1576765608535-5104d416bdf6?auto=format&fit=crop&q=80&w=800",
    icon: <HeartPulse className="text-rose-600" />,
  },
];

export default function OnePager() {
  const [theme, setTheme] = useState<"light" | "night">("light");
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFab, setShowFab] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setShowFab(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={`relative min-h-screen text-earth-900 transition-colors duration-700 ${theme === 'night' ? 'bg-[#1a1a1a] text-white' : 'bg-white'}`}>
      <AmbientBackground />
      
      {/* Dynamic Header */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-white/80 dark:bg-black/80 backdrop-blur-xl h-20 border-b border-black/5 shadow-sm' : 'h-24 bg-transparent'}`}
      >
        <div className="container-wide flex justify-between items-center h-full">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => scrollTo('hero')}>
            <div className="w-10 h-10 relative bg-white rounded-xl p-1 shadow-md">
              <Image src="/logo.png" alt="Zonnehoeve" fill className="object-contain" />
            </div>
            <span className="font-black text-xl tracking-tight">Zonnehoeve<span className="text-brand-green-dark font-normal ml-1">| Living+</span></span>
          </div>
          
          <div className="hidden md:flex gap-10 items-center font-bold text-sm uppercase tracking-widest text-earth-800/60 dark:text-white/60">
            <button onClick={() => scrollTo('vision')} className="hover:text-brand-green transition-colors">Visie</button>
            <button onClick={() => scrollTo('guide')} className="flex items-center gap-2 hover:text-brand-green transition-all group">
              <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
              Digitale Gids
            </button>
            <Link href="/admin" className="hover:text-brand-green transition-colors">Portaal Beheer</Link>
            <button 
              onClick={() => scrollTo('guide')}
              className="bg-brand-green text-white px-8 py-3 rounded-full shadow-xl shadow-brand-green/20 hover:scale-105 active:scale-95 transition-all text-xs"
            >
              Start Sessie
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section - Leaner to allow focus on Guide */}
      <header id="hero" className="min-h-[70vh] flex flex-col items-center justify-center pt-24 px-6 relative overflow-hidden">
        <div className="container-wide text-center max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="inline-flex items-center gap-2 py-1.5 px-4 bg-brand-green/10 text-brand-green font-black uppercase tracking-[0.3em] text-[10px] mb-8 rounded-full border border-brand-green/20">
              <Sparkles size={14} /> Intelligence Meets Care
            </span>
            <h1 className="text-5xl md:text-[7rem] font-black leading-[0.9] mb-8 tracking-tighter">
              Zonnehoeve <br /> <span className="text-brand-green-dark">Digital Portaal</span>
            </h1>
            <p className="text-lg md:text-xl text-earth-800/50 dark:text-white/50 font-medium mb-12 max-w-2xl mx-auto leading-relaxed italic">
              "Kwaliteitsvolle zorg ondersteund door intelligente technologie."
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <button onClick={() => scrollTo('guide')}
                className="group w-full sm:w-auto px-10 py-5 bg-brand-green text-white rounded-[1.8rem] font-black text-xl shadow-2xl shadow-brand-green/30 hover:scale-105 transition-all flex items-center justify-center gap-4 border-2 border-white/20">
                Start de Gids <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
              </button>
              <button onClick={() => scrollTo('vision')}
                className="w-full sm:w-auto px-10 py-5 bg-white/40 backdrop-blur-md text-earth-900 border-2 border-black/5 rounded-[1.8rem] font-black text-xl hover:bg-white/60 transition-all">
                Onze Visie
              </button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Vision & Clusters Section */}
      <section id="vision" className="py-48 px-6 bg-earth-50 dark:bg-[#1f1f1f]/30 border-y border-black/5">
        <div className="container-wide mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
            <div className="max-w-3xl">
              <h2 className="text-5xl md:text-7xl font-black mb-8 leading-[1]">Kracht in <br/>Specialisatie.</h2>
              <p className="text-2xl text-earth-800/40 font-bold">Wij bouwen aan een portaal dat elke zorgcluster ondersteunt met specifieke kennis.</p>
            </div>
            <div className="flex gap-4">
               {clusters.map((_, i) => (
                 <div key={i} className="w-3 h-3 rounded-full bg-brand-green/20" />
               ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {clusters.map((cluster, i) => (
              <motion.div 
                key={i} 
                whileHover={{ y: -15 }}
                className="bg-white dark:bg-[#252525] rounded-[3rem] p-12 border border-black/5 shadow-2xl shadow-earth-200/20 dark:shadow-none flex flex-col h-full"
              >
                <div className="w-20 h-20 rounded-[1.8rem] bg-earth-50 dark:bg-black/20 flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                  {cluster.icon}
                </div>
                <h3 className="text-3xl font-black mb-6">{cluster.title}</h3>
                <p className="text-earth-800/50 dark:text-white/40 font-bold leading-relaxed mb-auto">
                  {cluster.description}
                </p>
                <div className="mt-12 flex items-center gap-3 text-brand-green font-black text-xs uppercase tracking-widest">
                  Ontdek Cluster <ArrowRight size={16} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* THE DIGITAL GUIDE PREVIEW - THE MAIN OBJECTIVE */}
      <section id="guide" className="min-h-screen py-20 px-4 relative z-10 bg-white/10 flex flex-col items-center">
        <div className="container-wide mx-auto">
          <div className="mb-16 flex flex-col md:flex-row items-center md:items-end justify-between gap-8 text-center md:text-left">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                 <div className="w-12 h-12 bg-brand-green rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-green/20"><HeartHandshake size={24} /></div>
                 <span className="font-black text-brand-green uppercase tracking-widest text-xs">Uw Digitale Partner</span>
              </div>
              <h2 className="text-5xl md:text-7xl font-black leading-tight">De Digitale Gids <span className="text-brand-green-dark">Workstation.</span></h2>
              <p className="text-xl md:text-2xl text-earth-800/50 font-bold mt-6 leading-relaxed max-w-2xl">
                Ervaar de volledige kracht van AI-ondersteunde zorg in een dedicated werkomgeving.
              </p>
            </div>
            
            <Link 
              href="/gids"
              className="group px-12 py-6 bg-brand-green text-white rounded-[2rem] font-black text-2xl shadow-2xl shadow-brand-green/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 border-2 border-white/20 mb-4"
            >
              Open Volledige Gids
              <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
          
          {/* THE PREVIEW IMAGE - Mockup of the app */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            className="relative w-full max-w-6xl mx-auto rounded-[3.5rem] overflow-hidden shadow-center border-8 border-white dark:border-[#333] group cursor-pointer"
            onClick={() => window.location.href = "/gids"}
          >
             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white text-earth-900 px-10 py-5 rounded-full font-black text-xl flex items-center gap-3 shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                   <Sparkles className="text-brand-green" /> Lanceren
                </div>
             </div>
             
             <div className="aspect-[16/9] relative scale-[1.02] group-hover:scale-100 transition-transform duration-700">
                <Image 
                  src="/mockup_gids.png" 
                  alt="Digitale Gids Preview" 
                  fill 
                  className="object-cover"
                />
             </div>
             
             {/* Dynamic Badge */}
             <div className="absolute top-8 right-8 z-20 px-6 py-3 bg-brand-yellow text-brand-yellow-dark rounded-full font-black text-xs shadow-xl flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-yellow-dark animate-ping" />
                V2.5 LIVE
             </div>
          </motion.div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
             {[
               { t: "Focus & Rust", d: "Een afleidingsvrije omgeving voor kritieke protocollen." },
               { t: "Volledig Scherm", d: "Maximale leesbaarheid van documenten en bijlagen." },
               { t: "Dossier Integratie", d: "Directe export naar formele dossiers en shift-nota's." }
             ].map((f, i) => (
               <div key={i} className="text-center p-8 bg-white/50 backdrop-blur-md rounded-3xl border border-white/20">
                  <h4 className="font-black text-lg mb-2">{f.t}</h4>
                  <p className="text-sm font-bold text-earth-800/40">{f.d}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Statistics & Impact */}
      <section className="py-48 px-6 overflow-hidden relative">
         <div className="container-wide mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
               <div className="order-2 lg:order-1">
                  <h2 className="text-5xl md:text-7xl font-black mb-12">Voorbereid op <br/>de toekomst.</h2>
                  <div className="grid grid-cols-2 gap-10">
                    {[
                      { icon: <WifiOff className="text-brand-green"/>, t: "Offline Eerst", d: "Werkt overal, ook in de kelder." },
                      { icon: <Mic className="text-brand-yellow-dark"/>, t: "Voice-First", d: "Spreek je vraag hardop uit." },
                      { icon: <Smartphone className="text-blue-500"/>, t: "PWA Tooling", d: "Installeer op elk device." },
                      { icon: <Layers className="text-rose-500"/>, t: "RAG Intel", d: "Altijd actuele bronnen." },
                    ].map((feat, i) => (
                      <div key={i}>
                        <div className="w-12 h-12 bg-white dark:bg-[#333] rounded-2xl flex items-center justify-center mb-6 shadow-md">{feat.icon}</div>
                        <h4 className="text-xl font-black mb-2">{feat.t}</h4>
                        <p className="text-sm font-bold text-earth-800/40 dark:text-white/40">{feat.d}</p>
                      </div>
                    ))}
                  </div>
               </div>
               <div className="order-1 lg:order-2 relative aspect-square group">
                  <div className="absolute inset-0 bg-brand-green rounded-full blur-[120px] opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative h-full w-full rounded-[4rem] overflow-hidden border-[12px] border-white dark:border-[#333] shadow-2xl">
                     <Image 
                       src="https://images.unsplash.com/photo-1576765608535-5104d416bdf6?auto=format&fit=crop&q=80&w=1200" 
                       alt="Zonnehoeve Kwaliteit" 
                       fill 
                       className="object-cover"
                     />
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-earth-900 text-white pt-32 pb-16 px-6">
        <div className="container-wide mx-auto py-12 text-center">
            <div className="flex items-center justify-center gap-4 mb-10">
              <div className="w-12 h-12 relative bg-white rounded-xl p-2 rotate-3">
                <Image src="/logo.png" alt="Zonnehoeve" fill className="object-contain" />
              </div>
              <span className="font-black text-3xl tracking-tighter">Zonnehoeve</span>
            </div>
            <p className="text-white/40 font-bold mb-12">Samen bouwen we aan 100% levenskwaliteit.</p>
            <div className="flex justify-center gap-8 text-xs font-black uppercase tracking-[0.3em] text-white/30">
               <button onClick={() => scrollTo('hero')} className="hover:text-white transition-colors">Start</button>
               <button onClick={() => scrollTo('vision')} className="hover:text-white transition-colors">Over Ons</button>
               <button onClick={() => scrollTo('guide')} className="hover:text-white transition-colors">Digital Gids</button>
               <Link href="/admin" className="hover:text-white transition-colors">Admin</Link>
            </div>
        </div>
      </footer>

      {/* FLOATING ACTION BUTTON */}
      <AnimatePresence>
        {showFab && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            onClick={() => scrollTo('guide')}
            className="fixed bottom-10 right-10 z-[100] w-20 h-20 bg-brand-green text-white rounded-[2rem] shadow-2xl shadow-brand-green/40 flex flex-col items-center justify-center gap-1 group active:scale-90 transition-transform"
          >
            <Sparkles size={28} className="group-hover:rotate-12 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Gids</span>
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Scroll to top */}
      <AnimatePresence>
         {showFab && (
           <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => scrollTo('hero')}
            className="fixed bottom-10 right-36 z-[100] w-20 h-20 bg-white border border-black/10 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform text-earth-800/50"
           >
             <ArrowUp size={24} />
             <span className="text-[10px] font-black uppercase tracking-tighter">Top</span>
           </motion.button>
         )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  Users, ShieldCheck, HeartPulse, ArrowRight, MapPin, 
  ChevronRight, CheckCircle2, MessageSquare, Sparkles,
  Command, Layers, Smartphone, WifiOff, Mic, Settings,
  ArrowUp, HeartHandshake, MousePointer2, Zap, Globe, Lock
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const clusters = [
  {
    title: "Zelfredzaamheid",
    subtitle: "Autonomie & Regie",
    description: "Wij ondersteunen cliënten bij het herwinnen van hun eigen regie door zinvolle dagbesteding, vrijetijdsactiviteiten en ambulante begeleiding.",
    image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1200",
    icon: <Users className="text-brand-green" />,
    color: "brand-green"
  },
  {
    title: "Veilig & Voorspelbaar",
    subtitle: "Wonen & Structuur",
    description: "Van intensieve woonondersteuning in leefgroupsvormen tot zelfstandiger studiowonen. Een veilige basis voor elke bewoner.",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
    icon: <ShieldCheck className="text-accent-blue" />,
    color: "accent-blue"
  },
  {
    title: "Verzorging",
    subtitle: "Kwaliteit van Leven",
    description: "Kwaliteitsvolle fysieke en emotionele ondersteuning voor mensen met een verstandelijke of meervoudige beperking, NAH of autisme.",
    image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80&w=1200",
    icon: <HeartPulse className="text-accent-rose" />,
    color: "accent-rose"
  },
];

export default function OnePager() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    setMounted(true);
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
    <div className="relative min-h-screen bg-earth-50 overflow-x-hidden">
      {/* Dynamic Header */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${isScrolled ? 'h-20 bg-white/70 backdrop-blur-xl border-b border-black/5 premium-shadow' : 'h-28 bg-transparent'}`}
      >
        <div className="container-wide flex justify-between items-center h-full">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => scrollTo('hero')}>
            <div className="w-12 h-12 relative bg-white rounded-2xl p-2 shadow-sm border border-black/5 group-hover:rotate-6 transition-transform">
              <Image src="/logo.png" alt="Zonnehoeve" fill className="object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight leading-none">Zonnehoeve</span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-green">Living+ Eke</span>
            </div>
          </div>
          
          <div className="hidden lg:flex gap-8 items-center font-bold text-sm tracking-tight text-earth-800">
            <button onClick={() => scrollTo('vision')} className="hover:text-brand-green transition-colors">Onze Visie</button>
            <button onClick={() => scrollTo('services')} className="hover:text-brand-green transition-colors">Diensten</button>
            <button onClick={() => scrollTo('guide')} className="hover:text-brand-green transition-colors">De Gids</button>
            <Link href="/admin" className="hover:text-brand-green transition-colors">Portaal</Link>
            <div className="h-6 w-[1px] bg-black/10 mx-2" />
            <button 
              onClick={() => scrollTo('guide')}
              className="bg-brand-green text-white px-8 py-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-green/20"
            >
              Start Sessie
            </button>
          </div>

          <button className="lg:hidden w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-black/5">
            <Command size={20} />
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <header id="hero" ref={heroRef} className="relative h-screen flex items-center overflow-hidden pt-20">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000" 
            alt="Zonnehoeve Living+" 
            fill 
            className="object-cover brightness-[0.85]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-earth-50/10 to-earth-50" />
        </motion.div>

        <div className="container-wide relative z-10 w-full">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 py-2 px-5 bg-white/80 backdrop-blur-md rounded-full border border-white/50 premium-shadow mb-8">
                <MapPin size={14} className="text-brand-green" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-green">Zonnestraat 13, Eke-Nazareth</span>
              </div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tighter mb-10 text-earth-900">
                Zonnehoeve <br />
                <span className="text-gradient">Living+.</span>
              </h1>
              <p className="text-xl md:text-3xl text-earth-800 font-bold max-w-2xl leading-tight mb-12">
                Een warme thuis en professionele begeleiding voor volwassenen met een beperking, NAH of autisme.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <button onClick={() => scrollTo('guide')} className="group px-12 py-6 bg-brand-green text-white rounded-3xl font-black text-xl shadow-2xl shadow-brand-green/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4">
                  Open de Gids <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                </button>
                <button onClick={() => scrollTo('vision')} className="px-12 py-6 bg-white text-earth-900 border border-black/5 rounded-3xl font-black text-xl hover:bg-earth-50 transition-all shadow-xl">
                  Onze Visie
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Vision Section */}
      <section id="vision" className="py-32 bg-white relative z-10">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">
            <div>
              <h2 className="text-5xl md:text-7xl font-black mb-10 leading-tight text-earth-900">Dialooggestuurde <br />Begeleiding.</h2>
              <p className="text-2xl text-earth-800 font-medium leading-relaxed mb-8">
                Bij Zonnehoeve staan de noden, wensen en de kwaliteit van leven van de individuele cliënt centraal. Wij bieden zorg voor mensen met een verstandelijke of meervoudige beperking, NAH of autisme.
              </p>
              <div className="flex flex-wrap gap-4">
                 {["NAH Ondersteuning", "Autisme Begeleiding", "Inclusief Wonen", "Zinvolle Dagbesteding"].map((label, i) => (
                   <span key={i} className="px-4 py-2 bg-earth-50 rounded-xl text-earth-800 font-bold text-sm border border-earth-100">{label}</span>
                 ))}
              </div>
            </div>
            <div className="relative h-[500px] rounded-[3rem] overflow-hidden shadow-2xl">
               <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-earth-50 to-white" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="text-brand-green/10">
                   <Users size={300} strokeWidth={0.5} />
                 </div>
               </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {clusters.map((cluster, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="group relative h-[600px] rounded-[3rem] overflow-hidden shadow-2xl"
              >
                <Image src={cluster.image} alt={cluster.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-earth-900/90 via-earth-900/40 to-transparent" />
                
                <div className="absolute inset-0 p-12 flex flex-col justify-end text-white">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-8 shadow-xl">
                    {cluster.icon}
                  </div>
                  <h3 className="text-4xl font-black mb-4">{cluster.title}</h3>
                  <p className="text-white/70 font-semibold mb-8 text-lg">{cluster.description}</p>
                  <button className="flex items-center gap-3 font-bold uppercase tracking-widest text-xs">
                    Lees Meer <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Context */}
      <section id="services" className="py-32 bg-earth-50">
        <div className="container-wide">
           <div className="max-w-4xl mx-auto text-center mb-24">
              <h2 className="text-5xl font-black mb-8">Wonen & Dagbesteding</h2>
              <p className="text-xl text-earth-800/60 font-bold">Wij bieden diverse woonvormen en ondersteuning op maat van de cliënt.</p>
           </div>
           
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { t: "Woonondersteuning", d: "Intensieve begeleiding in leefgroepen en studiowonen." },
                { t: "Kortverblijf", d: "Tijdelijke opvang en respijtzorg voor wie het nodig heeft." },
                { t: "Ambulante Hulp", d: "RTH ondersteuning aan huis of op locatie." },
                { t: "Dagbesteding", d: "Zinvolle vrijetijdsactiviteiten en tewerkstelling." }
              ].map((service, i) => (
                <div key={i} className="bg-white rounded-[2.5rem] border border-black/5 shadow-premium overflow-hidden group">
                   <div className="p-8">
                      <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center mb-6 text-brand-green">
                         <CheckCircle2 size={24} />
                      </div>
                      <h4 className="text-xl font-black mb-3">{service.t}</h4>
                      <p className="text-earth-800/50 font-bold text-xs leading-relaxed">{service.d}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Digital Guide Section */}
      <section id="guide" className="py-40 bg-earth-900 text-white relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-green/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent-blue/10 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/3" />

        <div className="container-wide relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/10 bg-white/5 mb-8">
                <HeartHandshake className="text-brand-green" size={20} />
                <span className="font-bold text-xs uppercase tracking-[0.3em] text-brand-green">Digitale Gids Workstation</span>
              </div>
              <h2 className="text-6xl md:text-8xl font-black mb-10 tracking-tighter">De kracht van Kennis, <br /><span className="text-brand-green">altijd binnen handbereik.</span></h2>
              <p className="text-xl md:text-2xl text-white/50 font-medium leading-relaxed">Ervaar een werkomgeving die afleidingsvrij is en direct toegang biedt tot alle protocollen en dossiers van Zonnehoeve.</p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative max-w-6xl mx-auto"
          >
             <div className="relative aspect-[16/10] bg-[#1a1a1a] rounded-[3rem] p-4 border-[10px] border-[#333] shadow-inner overflow-hidden">
                <div className="relative h-full w-full rounded-[1.8rem] overflow-hidden group">
                   <Image src="/preview_chatbot.png" alt="Zonnehoeve Chatbot Startpagina" fill className="object-cover" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm cursor-pointer" onClick={() => window.location.href = "/gids"}>
                      <div className="bg-brand-green text-white px-12 py-5 rounded-full font-black text-xl flex items-center gap-4 shadow-2xl">
                         <Sparkles /> Start de Chatbot
                      </div>
                   </div>
                </div>

                {/* Hotspots */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute top-1/4 left-10 p-4 glass-card rounded-2xl border border-white/20 premium-shadow max-w-[200px] hidden md:block"
                >
                   <p className="text-[10px] font-black text-brand-green uppercase mb-2">Smart Search</p>
                   <p className="text-[10px] font-bold text-earth-800/60 leading-tight">Vind elk protocol in minder dan een seconde.</p>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                  className="absolute bottom-1/4 right-10 p-4 glass-card rounded-2xl border border-white/20 premium-shadow max-w-[200px] hidden md:block"
                >
                   <p className="text-[10px] font-black text-accent-blue uppercase mb-2">Dossier Sync</p>
                   <p className="text-[10px] font-bold text-earth-800/60 leading-tight">Directe integratie met zorgdossiers.</p>
                </motion.div>
             </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-earth-100 text-earth-900 pt-40 pb-20 px-6">
        <div className="container-wide">
          <div className="grid md:grid-cols-4 gap-20 mb-32">
            <div className="md:col-span-2">
               <div className="flex items-center gap-4 mb-10">
                  <div className="w-14 h-14 relative bg-white rounded-2xl p-2 shadow-sm border border-black/5">
                    <Image src="/logo.png" alt="Zonnehoeve" fill className="object-contain" />
                  </div>
                  <span className="font-extrabold text-4xl tracking-tighter">Zonnehoeve</span>
               </div>
               <p className="text-earth-800/40 font-bold text-xl leading-relaxed max-w-sm">
                  Een sociale voorziening in Eke-Nazareth voor zorg, begeleiding en tewerkstelling.
               </p>
            </div>
            <div>
               <h5 className="font-black text-xs uppercase tracking-[0.3em] mb-10 text-brand-green">Afdelingen</h5>
               <ul className="space-y-6 text-earth-800/60 font-bold">
                  <li>Zonnehoeve|Living+</li>
                  <li>Zonnehoeve|Production</li>
               </ul>
            </div>
            <div>
               <h5 className="font-black text-xs uppercase tracking-[0.3em] mb-10 text-brand-green">Contact</h5>
               <ul className="space-y-6 text-earth-800/60 font-bold">
                  <li className="flex items-center gap-3"><MapPin size={16}/> Zonnestraat 13, Eke</li>
                  <li className="flex items-center gap-3"><Globe size={16}/> www.zonnehoeve.be</li>
               </ul>
            </div>
          </div>
          <div className="pt-10 border-t border-black/5 text-center">
             <span className="text-xs font-bold text-earth-800/20 uppercase tracking-widest">© 2026 Zonnehoeve Living+ . Alle rechten voorbehouden.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}



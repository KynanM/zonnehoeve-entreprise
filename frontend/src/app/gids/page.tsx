"use client";

import { useState } from "react";
import DigitalGuide from "@/components/DigitalGuide";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import AmbientBackground from "@/components/AmbientBackground";

export default function StandaloneGids() {
  const [theme, setTheme] = useState<"light" | "night">("light");

  return (
    <div className={`h-screen w-screen transition-colors duration-700 flex flex-col overflow-hidden ${theme === 'night' ? 'bg-[#1a1a1a] text-white' : 'bg-earth-50'}`}>

      {/* Main Workstation Area - Full Screen */}
      <main className="flex-1 w-full h-full relative z-10 overflow-hidden">
        <DigitalGuide onThemeChange={setTheme} className="h-full w-full bg-white/40 backdrop-blur-md" />
      </main>
    </div>
  );
}

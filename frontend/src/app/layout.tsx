import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zonnehoeve Living+ | Digitale Gids",
  description: "Het centrale platform voor kennis, protocollen en ondersteuning van Zonnehoeve Zorgboerderij.",
  manifest: "/manifest.json",
  themeColor: "#22c55e",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zonnehoeve",
  },
};

import AmbientBackground from "@/components/AmbientBackground";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <AmbientBackground />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}

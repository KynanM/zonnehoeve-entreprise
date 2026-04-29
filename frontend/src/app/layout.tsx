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

export const viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Zonnehoeve Living+ | Digitale Gids",
  description: "Het centrale platform voor kennis, protocollen en ondersteuning van Zonnehoeve Living+.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zonnehoeve",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
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
      <body className="min-h-full flex flex-col relative" suppressHydrationWarning>
        <AmbientBackground />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "J&S Energy Dashboard",
  description: "Battery & Solar Monitoring System - Jouw energie, onze kracht",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
        {/* <div
          className="fixed right-6 bottom-6 z-50 bg-surface/95 border border-border rounded-xl shadow-lg p-3 text-sm text-text-muted"
        >
          Pre-Launch Development by{" "}
          <a
            href="https://alfaintelli.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-2 underline font-medium hover:text-accent-2/80"
          >
            Alfa Intellitech
          </a>
        </div> */}
      </body>
    </html>
  );
}

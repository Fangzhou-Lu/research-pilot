import type { Metadata } from "next";
import { Inter, Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

// Body sans — Inter is a research-friendly grotesque pairing the brand we kept.
const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Display headings — Poppins, the typeface chatpaper.com leans on heavily for its
// hero/section copy. Adopted via the designlang extraction.
const display = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ResearchPilot — Daily AI-curated paper feed",
  description:
    "Track research interests, scroll a daily feed of arXiv preprints with AI summaries, and chat with any paper.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable} bg-ink-50`}
    >
      <body className="min-h-screen flex flex-col font-sans text-[15px] text-ink-900 antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Oswald, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { TOURNAMENT_NAME, VENUE_NAME, VENUE_MAPS_URL } from "@/lib/tournament";

// Broadcast condensed display, clean body sans, tabular mono for scoreboard stats.
const display = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: TOURNAMENT_NAME,
  description: "Intra football tournament — fixtures, standings, leaderboard.",
};

export const viewport = {
  themeColor: "#0c1f14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-turf-deep text-chalk">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-5">{children}</div>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
          <div>
            {TOURNAMENT_NAME} · 5+2 · {new Date().getFullYear()}
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 normal-case tracking-normal">
            <span>Venue:</span>
            <a
              href={VENUE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-chalk-mut underline decoration-dotted hover:text-accent"
            >
              <PinIcon />
              {VENUE_NAME}
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

// Minimal location pin (replaces the emoji — keeps the identity professional).
function PinIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

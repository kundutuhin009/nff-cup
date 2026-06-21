import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { TOURNAMENT_NAME, VENUE_NAME, VENUE_MAPS_URL } from "@/lib/tournament";

export const metadata: Metadata = {
  title: TOURNAMENT_NAME,
  description: "Intra football tournament — fixtures, standings, leaderboard.",
};

export const viewport = {
  themeColor: "#0a0f0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-pitch text-zinc-100">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-5">{children}</div>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          <div>
            {TOURNAMENT_NAME} · 7-a-side · {new Date().getFullYear()}
          </div>
          <div className="mt-1 normal-case tracking-normal">
            Venue:{" "}
            <a
              href={VENUE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 underline decoration-dotted hover:text-lime"
            >
              📍 {VENUE_NAME}
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

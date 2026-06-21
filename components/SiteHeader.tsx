"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOURNAMENT_NAME, TOURNAMENT_SHORT } from "@/lib/tournament";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/standings", label: "Standings" },
  { href: "/leaders", label: "Leaders" },
  { href: "/register", label: "Register" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-accent/20 bg-turf-deep/95 backdrop-blur">
      {/* Scoreboard-style top strip */}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs text-accent/70">●</span>
          <span className="font-display text-2xl font-bold uppercase tracking-widest text-accent">
            {TOURNAMENT_SHORT}
          </span>
          <span className="truncate font-display text-sm font-bold uppercase tracking-wide text-chalk">
            {TOURNAMENT_NAME}
          </span>
        </Link>
        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.3em] text-chalk-mut sm:inline">
          Floodlit&nbsp;5+2
        </span>
      </div>

      {/* Nav row */}
      <nav className="mx-auto max-w-5xl overflow-x-auto px-2 pb-2">
        <ul className="flex min-w-max gap-1">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "block rounded-md px-3 py-1.5 font-display text-sm uppercase tracking-wide transition-colors",
                    active
                      ? "bg-accent text-turf-deep"
                      : "text-chalk hover:bg-turf-panel hover:text-accent",
                  ].join(" ")}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

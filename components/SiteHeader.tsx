"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <header className="sticky top-0 z-50 border-b border-lime/20 bg-pitch/95 backdrop-blur">
      {/* Scoreboard-style top strip */}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2">
          <span className="font-mono text-xs text-lime/70">●</span>
          <span className="font-display text-2xl font-bold uppercase tracking-widest text-lime">
            NFF&nbsp;Cup
          </span>
        </Link>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 sm:inline">
          Floodlit&nbsp;7-a-side
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
                      ? "bg-lime text-pitch"
                      : "text-zinc-300 hover:bg-panel hover:text-lime",
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

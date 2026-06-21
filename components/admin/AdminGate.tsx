"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  adminFetch,
  clearAdminPin,
  getAdminPin,
  setAdminPin,
} from "@/lib/adminFetch";

const ADMIN_LINKS = [
  { href: "/admin", label: "Players" },
  { href: "/admin/auction", label: "Auction" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/updates", label: "Updates" },
];

export default function AdminGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  // On mount, try a previously stored PIN.
  useEffect(() => {
    const existing = getAdminPin();
    if (!existing) {
      setChecking(false);
      return;
    }
    adminFetch("/api/admin/login", { method: "POST" })
      .then(() => setAuthed(true))
      .catch(() => clearAdminPin())
      .finally(() => setChecking(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdminPin(pin.trim());
    try {
      await adminFetch("/api/admin/login", { method: "POST" });
      setAuthed(true);
    } catch {
      clearAdminPin();
      setError("Incorrect PIN.");
    }
  }

  if (checking) {
    return (
      <div className="py-20 text-center font-mono text-sm text-chalk-mut">
        Checking access…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm py-16">
        <div className="rounded-xl border border-turf-line bg-turf-panel p-6">
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-accent">
            Admin Access
          </h1>
          <p className="mt-1 text-sm text-chalk-mut">Enter the admin PIN.</p>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="w-full rounded-md border border-turf-line bg-turf-deep px-3 py-2 text-center font-mono text-lg tracking-widest text-chalk outline-none focus:border-accent"
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-accent px-4 py-2.5 font-display font-bold uppercase tracking-wide text-turf-deep"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-accent">
          Admin
        </h1>
        <button
          onClick={() => {
            clearAdminPin();
            setAuthed(false);
          }}
          className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut hover:text-accent"
        >
          Lock
        </button>
      </div>

      <nav className="overflow-x-auto">
        <ul className="flex min-w-max gap-1">
          {ADMIN_LINKS.map((l) => {
            const active =
              l.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={[
                    "block rounded-md px-3 py-1.5 font-display text-sm uppercase tracking-wide",
                    active
                      ? "bg-accent text-turf-deep"
                      : "bg-turf-panel text-chalk hover:text-accent",
                  ].join(" ")}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div>{children}</div>
    </div>
  );
}

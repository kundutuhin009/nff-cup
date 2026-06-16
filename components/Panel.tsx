import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-white/5 bg-panel p-4 shadow-lg shadow-black/30 ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 font-display text-lg uppercase tracking-wide text-lime">
      {children}
    </h2>
  );
}

// Big scoreboard stat tile (e.g. registered / paid / drafted counts).
export function StatTile({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-pitch/60 p-3 text-center">
      <div className="font-mono text-3xl font-bold text-lime">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-400">
        {label}
      </div>
    </div>
  );
}

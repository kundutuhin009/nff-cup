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
      className={`rounded-xl border border-turf-line bg-turf-panel p-4 shadow-lg shadow-black/30 ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  // Chalk heading with a short amber marker — keeps amber as a spotlight, not
  // wallpaper, while still reading as a scoreboard label.
  return (
    <h2 className="mb-3 flex items-center gap-2 font-display text-lg uppercase tracking-wide text-chalk">
      <span aria-hidden className="h-4 w-1 rounded-full bg-accent" />
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
    <div className="rounded-lg border border-turf-line bg-turf-deep/60 p-3 text-center">
      <div className="font-mono text-3xl font-bold text-accent">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-chalk-mut">
        {label}
      </div>
    </div>
  );
}

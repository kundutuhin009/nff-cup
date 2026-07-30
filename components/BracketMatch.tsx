import type { RoundMeta, Track } from "@/lib/bracket";
import type { Match } from "@/lib/types";

// One knockout tie. Empty slots show their source as a placeholder
// ("Winner of Gold Semi 1") rather than a bare TBD.
export default function BracketMatch({
  meta,
  match,
  teamName,
}: {
  meta: RoundMeta;
  match: Match | undefined;
  teamName: (id: string | null) => string;
}) {
  const slot = (id: string | null | undefined, placeholder: string) =>
    id ? (
      <span className="text-chalk">{teamName(id)}</span>
    ) : (
      <span className="text-chalk-mut">TBD · {placeholder}</span>
    );

  const played = Boolean(match?.played);

  return (
    <div
      className={`rounded-lg border bg-turf-deep/50 p-3 ${
        meta.track === "gold"
          ? "border-accent/40 shadow-inner shadow-accent-soft"
          : "border-turf-line"
      }`}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span
          className={`font-display text-sm uppercase tracking-wide ${
            meta.track === "gold" ? "text-accent" : "text-chalk"
          }`}
        >
          {meta.title}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
          {meta.subtitle}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-right text-sm">
          {slot(match?.home_team_id, meta.home.label)}
        </div>
        <div className="shrink-0 rounded-md bg-turf-deep px-2.5 py-1 font-mono text-sm">
          {played ? (
            <span
              className={`font-bold ${
                meta.track === "gold" ? "text-accent" : "text-chalk"
              }`}
            >
              {match?.home_score}
              <span className="px-1 text-chalk-mut">:</span>
              {match?.away_score}
            </span>
          ) : (
            <span className="text-chalk-mut">vs</span>
          )}
        </div>
        <div className="flex-1 text-left text-sm">
          {slot(match?.away_team_id, meta.away.label)}
        </div>
      </div>
    </div>
  );
}

// Section heading for a track — amber for gold, chalk-muted for silver.
export function TrackHeading({
  track,
  children,
}: {
  track: Track;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={`flex items-center gap-2 font-display text-base uppercase tracking-widest ${
        track === "gold" ? "text-accent" : "text-chalk-mut"
      }`}
    >
      <span
        aria-hidden
        className={`h-3 w-1 rounded-full ${
          track === "gold" ? "bg-accent" : "bg-chalk-mut"
        }`}
      />
      {children}
    </h3>
  );
}

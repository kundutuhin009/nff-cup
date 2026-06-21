import type { Match } from "@/lib/types";

export default function MatchRow({
  match,
  teamName,
}: {
  match: Match;
  teamName: (id: string | null) => string;
}) {
  const home = teamName(match.home_team_id);
  const away = teamName(match.away_team_id);

  return (
    <div className="flex items-center gap-3 border-t border-turf-line py-2.5">
      <div className="flex-1 text-right text-sm">{home}</div>
      <div className="shrink-0 rounded-md bg-turf-deep px-2.5 py-1 font-mono text-sm">
        {match.played ? (
          <span className="font-bold text-accent">
            {match.home_score}
            <span className="px-1 text-chalk-mut">:</span>
            {match.away_score}
          </span>
        ) : (
          <span className="text-chalk-mut">vs</span>
        )}
      </div>
      <div className="flex-1 text-left text-sm">{away}</div>
    </div>
  );
}

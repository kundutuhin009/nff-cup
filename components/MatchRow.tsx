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
    <div className="flex items-center gap-3 border-t border-white/5 py-2.5">
      <div className="flex-1 text-right text-sm">{home}</div>
      <div className="shrink-0 rounded-md bg-pitch px-2.5 py-1 font-mono text-sm">
        {match.played ? (
          <span className="font-bold text-lime">
            {match.home_score}
            <span className="px-1 text-zinc-500">:</span>
            {match.away_score}
          </span>
        ) : (
          <span className="text-zinc-500">vs</span>
        )}
      </div>
      <div className="flex-1 text-left text-sm">{away}</div>
    </div>
  );
}

import LeaderboardTable from "@/components/LeaderboardTable";
import { Panel, PanelTitle } from "@/components/Panel";
import {
  getMatchStats,
  getMatches,
  getPublicPlayers,
  getTeams,
} from "@/lib/publicData";
import { computeLeaderboard, type LeaderboardPlayer } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export default async function LeadersPage() {
  const [teams, matches, stats, players] = await Promise.all([
    getTeams(),
    getMatches(),
    getMatchStats(),
    getPublicPlayers(),
  ]);

  // Map team name -> id so we can attribute clean sheets by team.
  const idByName = new Map(teams.map((t) => [t.name, t.id]));
  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  const playerName = new Map(players.map((p) => [p.id, p.full_name]));

  const lbPlayers: LeaderboardPlayer[] = players.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    position: p.position,
    team_id: p.team_name ? idByName.get(p.team_name) ?? null : null,
    team_name: p.team_name,
  }));

  const rows = computeLeaderboard(lbPlayers, matches, stats).filter(
    (r) => r.score > 0
  );

  const playedWithMotm = matches.filter((m) => m.played && m.motm_registration_id);

  const teamName = (id: string | null) =>
    id ? nameById.get(id) ?? "—" : "TBD";

  return (
    <main className="space-y-5">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-lime">
        Leaderboard
      </h1>
      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        Score = Goals×3 + Assists×1 + Clean&nbsp;Sheets×3
      </p>

      <Panel>
        <PanelTitle>Top Players</PanelTitle>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No stats recorded yet.</p>
        ) : (
          <LeaderboardTable rows={rows} />
        )}
      </Panel>

      <Panel>
        <PanelTitle>Man of the Match</PanelTitle>
        {playedWithMotm.length === 0 ? (
          <p className="text-sm text-zinc-500">No MOTM awarded yet.</p>
        ) : (
          <ul className="space-y-2">
            {playedWithMotm.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between border-t border-white/5 py-2 text-sm"
              >
                <span className="font-mono text-xs text-zinc-400">
                  {teamName(m.home_team_id)} {m.home_score}–{m.away_score}{" "}
                  {teamName(m.away_team_id)}
                </span>
                <span className="font-semibold text-lime">
                  {playerName.get(m.motm_registration_id as string) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </main>
  );
}

import GoalkeeperTable from "@/components/GoalkeeperTable";
import LeaderboardTable from "@/components/LeaderboardTable";
import { Panel, PanelTitle } from "@/components/Panel";
import {
  getMatchStats,
  getMatches,
  getPublicPlayers,
  getTeams,
} from "@/lib/publicData";
import { computeLeaderboard, type LeaderboardPlayer } from "@/lib/leaderboard";
import { computeGoalkeepers, type GoalkeeperInput } from "@/lib/goalkeepers";

export const dynamic = "force-dynamic";

export default async function LeadersPage() {
  const [teams, matches, stats, players] = await Promise.all([
    getTeams(),
    getMatches(),
    getMatchStats(),
    getPublicPlayers(),
  ]);

  const idByName = new Map(teams.map((t) => [t.name, t.id]));
  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  const playerName = new Map(players.map((p) => [p.id, p.full_name]));

  // BOARD 1 — players: anyone with goals or assists (score = G*3 + A*1).
  const lbPlayers: LeaderboardPlayer[] = players.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    team_name: p.team_name,
  }));
  const playerRows = computeLeaderboard(lbPlayers, stats).filter(
    (r) => r.score > 0
  );

  // BOARD 2 — goalkeepers: designated GKs = reg_type 'gk' players on a team.
  // GK stats are derived from their team's played-match scores.
  const goalkeepers: GoalkeeperInput[] = players
    .filter((p) => p.reg_type === "gk" && p.team_name)
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      team_id: idByName.get(p.team_name as string) ?? "",
      team_name: p.team_name,
    }))
    .filter((g) => g.team_id); // skip if team can't be resolved
  const anyPlayed = matches.some((m) => m.played);
  const gkRows = anyPlayed ? computeGoalkeepers(goalkeepers, matches) : [];

  const playedWithMotm = matches.filter((m) => m.played && m.motm_registration_id);

  const teamName = (id: string | null) =>
    id ? nameById.get(id) ?? "—" : "TBD";

  return (
    <main className="space-y-5">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-accent">
        Leaderboard
      </h1>

      <Panel>
        <PanelTitle>Top Players</PanelTitle>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
          Score = Goals×3 + Assists×1
        </p>
        {playerRows.length === 0 ? (
          <p className="text-sm text-chalk-mut">No player stats yet.</p>
        ) : (
          <LeaderboardTable rows={playerRows} />
        )}
      </Panel>

      <Panel>
        <PanelTitle>Goalkeepers</PanelTitle>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
          Ranked by clean sheets, then fewest goals conceded, then most matches played
        </p>
        {gkRows.length === 0 ? (
          <p className="text-sm text-chalk-mut">No goalkeeper stats yet.</p>
        ) : (
          <GoalkeeperTable rows={gkRows} />
        )}
      </Panel>

      <Panel>
        <PanelTitle>Man of the Match</PanelTitle>
        {playedWithMotm.length === 0 ? (
          <p className="text-sm text-chalk-mut">No MOTM awarded yet.</p>
        ) : (
          <ul className="space-y-2">
            {playedWithMotm.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between border-t border-turf-line py-2 text-sm"
              >
                <span className="font-mono text-xs text-chalk-mut">
                  {teamName(m.home_team_id)} {m.home_score}–{m.away_score}{" "}
                  {teamName(m.away_team_id)}
                </span>
                <span className="font-semibold text-accent">
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

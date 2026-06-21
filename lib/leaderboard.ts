import type { MatchPlayerStat } from "./types";

export interface LeaderboardRow {
  registration_id: string;
  full_name: string;
  team_name: string | null;
  goals: number;
  assists: number;
  score: number;
}

export interface LeaderboardPlayer {
  id: string;
  full_name: string;
  team_name: string | null;
}

// Pure: score = goals*3 + assists*1.
// Clean sheets are NOT scored here — they live on the goalkeeper board
// (see lib/goalkeepers.ts). Any reg_type can score/assist.
export function computeLeaderboard(
  players: LeaderboardPlayer[],
  stats: MatchPlayerStat[]
): LeaderboardRow[] {
  const goalsBy = new Map<string, number>();
  const assistsBy = new Map<string, number>();

  for (const s of stats) {
    goalsBy.set(s.registration_id, (goalsBy.get(s.registration_id) ?? 0) + s.goals);
    assistsBy.set(
      s.registration_id,
      (assistsBy.get(s.registration_id) ?? 0) + s.assists
    );
  }

  const rows: LeaderboardRow[] = players.map((p) => {
    const goals = goalsBy.get(p.id) ?? 0;
    const assists = assistsBy.get(p.id) ?? 0;
    return {
      registration_id: p.id,
      full_name: p.full_name,
      team_name: p.team_name,
      goals,
      assists,
      score: goals * 3 + assists * 1,
    };
  });

  return rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    return a.full_name.localeCompare(b.full_name);
  });
}

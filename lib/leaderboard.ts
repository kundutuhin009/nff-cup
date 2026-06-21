import type { Match, MatchPlayerStat, Position } from "./types";

export interface LeaderboardRow {
  registration_id: string;
  full_name: string;
  team_name: string | null;
  position: Position | null;
  goals: number;
  assists: number;
  clean_sheets: number;
  score: number;
}

export interface LeaderboardPlayer {
  id: string;
  full_name: string;
  position: Position | null;
  team_id: string | null;
  team_name: string | null;
}

// Pure: score = goals*3 + assists*1 + cleanSheets*3.
// Clean sheet credited ONLY to Goalkeepers whose team conceded 0 in a played match.
export function computeLeaderboard(
  players: LeaderboardPlayer[],
  matches: Match[],
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

  // Clean sheets per team: count played matches where the team conceded 0.
  const cleanSheetsByTeam = new Map<string, number>();
  for (const m of matches) {
    if (!m.played) continue;
    if (m.home_team_id && m.away_score === 0) {
      cleanSheetsByTeam.set(
        m.home_team_id,
        (cleanSheetsByTeam.get(m.home_team_id) ?? 0) + 1
      );
    }
    if (m.away_team_id && m.home_score === 0) {
      cleanSheetsByTeam.set(
        m.away_team_id,
        (cleanSheetsByTeam.get(m.away_team_id) ?? 0) + 1
      );
    }
  }

  const rows: LeaderboardRow[] = players.map((p) => {
    const goals = goalsBy.get(p.id) ?? 0;
    const assists = assistsBy.get(p.id) ?? 0;
    const clean_sheets =
      p.position === "Goalkeeper" && p.team_id
        ? cleanSheetsByTeam.get(p.team_id) ?? 0
        : 0;
    const score = goals * 3 + assists * 1 + clean_sheets * 3;
    return {
      registration_id: p.id,
      full_name: p.full_name,
      team_name: p.team_name,
      position: p.position,
      goals,
      assists,
      clean_sheets,
      score,
    };
  });

  return rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    return a.full_name.localeCompare(b.full_name);
  });
}

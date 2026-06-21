import type { Match } from "./types";

// A designated goalkeeper = a player with reg_type 'gk' drafted onto a team.
// All GK stats are DERIVED at read time from team_players (who the gk is) +
// matches (the scores). Nothing here is stored.
export interface GoalkeeperInput {
  id: string;
  full_name: string;
  team_id: string;
  team_name: string | null;
}

export interface GoalkeeperRow {
  registration_id: string;
  full_name: string;
  team_name: string | null;
  clean_sheets: number;
  goals_conceded: number;
  matches_played: number;
}

interface TeamAgg {
  clean_sheets: number;
  goals_conceded: number;
  matches_played: number;
}

// Aggregate a team's PLAYED matches: clean sheet = conceded 0, goals_conceded =
// the opponent's score, matches_played = count of played matches.
function aggregateByTeam(matches: Match[]): Map<string, TeamAgg> {
  const byTeam = new Map<string, TeamAgg>();
  const bump = (teamId: string, conceded: number) => {
    const agg =
      byTeam.get(teamId) ??
      { clean_sheets: 0, goals_conceded: 0, matches_played: 0 };
    agg.matches_played += 1;
    agg.goals_conceded += conceded;
    if (conceded === 0) agg.clean_sheets += 1;
    byTeam.set(teamId, agg);
  };

  for (const m of matches) {
    if (!m.played) continue;
    if (m.home_team_id) bump(m.home_team_id, m.away_score);
    if (m.away_team_id) bump(m.away_team_id, m.home_score);
  }
  return byTeam;
}

// Pure. Ranking priority:
//   1. clean_sheets DESC   2. goals_conceded ASC
//   3. matches_played DESC (tighter over more games is harder)
//   4. full_name ASC (stable)
export function computeGoalkeepers(
  goalkeepers: GoalkeeperInput[],
  matches: Match[]
): GoalkeeperRow[] {
  const byTeam = aggregateByTeam(matches);

  // A team with MORE THAN ONE gk-type player: credit each identically (below),
  // but flag it — don't silently pick one.
  // TODO: surface this to admins in the UI; for now warn in the server log.
  const gkCountByTeam = new Map<string, number>();
  for (const g of goalkeepers)
    gkCountByTeam.set(g.team_id, (gkCountByTeam.get(g.team_id) ?? 0) + 1);
  for (const [teamId, n] of gkCountByTeam) {
    if (n > 1)
      // eslint-disable-next-line no-console
      console.warn(
        `[goalkeepers] Team ${teamId} has ${n} gk-type players; crediting all ${n} identically.`
      );
  }

  const rows: GoalkeeperRow[] = goalkeepers.map((g) => {
    const agg =
      byTeam.get(g.team_id) ??
      { clean_sheets: 0, goals_conceded: 0, matches_played: 0 };
    return {
      registration_id: g.id,
      full_name: g.full_name,
      team_name: g.team_name,
      clean_sheets: agg.clean_sheets,
      goals_conceded: agg.goals_conceded,
      matches_played: agg.matches_played,
    };
  });

  return rows.sort((a, b) => {
    if (b.clean_sheets !== a.clean_sheets) return b.clean_sheets - a.clean_sheets;
    if (a.goals_conceded !== b.goals_conceded)
      return a.goals_conceded - b.goals_conceded;
    if (b.matches_played !== a.matches_played)
      return b.matches_played - a.matches_played;
    return a.full_name.localeCompare(b.full_name);
  });
}

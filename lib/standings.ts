import type { Match, Team } from "./types";

export interface StandingRow {
  team_id: string;
  name: string;
  group_label: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // goals for
  ga: number; // goals against
  gd: number; // goal difference
  points: number;
}

// Pure: compute group standings from teams + played GROUP matches.
// Points: win 3, draw 1, loss 0.
// Tiebreak: points, goal difference, goals for, alphabetical (name).
export function computeStandings(teams: Team[], matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  for (const t of teams) {
    rows.set(t.id, {
      team_id: t.id,
      name: t.name,
      group_label: t.group_label,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (m.stage !== "group" || !m.played) continue;
    if (!m.home_team_id || !m.away_team_id) continue;
    const home = rows.get(m.home_team_id);
    const away = rows.get(m.away_team_id);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.gf += m.home_score;
    home.ga += m.away_score;
    away.gf += m.away_score;
    away.ga += m.home_score;

    if (m.home_score > m.away_score) {
      home.won++;
      away.lost++;
      home.points += 3;
    } else if (m.home_score < m.away_score) {
      away.won++;
      home.lost++;
      away.points += 3;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  const all = Array.from(rows.values());
  for (const r of all) r.gd = r.gf - r.ga;

  return all.sort(sortStandings);
}

function sortStandings(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.name.localeCompare(b.name);
}

// Standings for a single group, sorted with positional tiebreak applied.
export function standingsByGroup(
  teams: Team[],
  matches: Match[],
  group: "A" | "B"
): StandingRow[] {
  return computeStandings(
    teams.filter((t) => t.group_label === group),
    matches
  );
}

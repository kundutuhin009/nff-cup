import { standingsByGroup } from "./standings";
import type { GroupLabel, Match, RoundLabel, Team } from "./types";

// Dual-track knockout bracket.
//
//   GOLD   : GSF1 (A1 v B2), GSF2 (B1 v A2), GFINAL (winners of both)
//   SILVER : SQ1 (A3 v loser GSF1), SQ2 (B3 v loser GSF2), SFINAL (winners)
//
// Everything here is PURE — it maps standings + played results onto slots.
// Persisting the result is the caller's job (see lib/knockoutSeed.ts).

export type Track = "gold" | "silver";

// Where a slot's team comes from. `label` is the human placeholder shown until
// the source resolves (e.g. "Loser of Gold Semi 1").
export type SlotSource =
  | { kind: "standing"; group: GroupLabel; place: 1 | 2 | 3; label: string }
  | { kind: "winner"; from: RoundLabel; label: string }
  | { kind: "loser"; from: RoundLabel; label: string };

export interface RoundMeta {
  round: RoundLabel;
  track: Track;
  title: string;
  subtitle: string;
  home: SlotSource;
  away: SlotSource;
}

const standing = (
  group: GroupLabel,
  place: 1 | 2 | 3
): SlotSource => ({
  kind: "standing",
  group,
  place,
  label: `Group ${group} ${place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}`,
});

// Display + seeding order. GOLD first, then SILVER.
export const BRACKET: RoundMeta[] = [
  {
    round: "GSF1",
    track: "gold",
    title: "Gold Semi 1",
    subtitle: "A1 vs B2",
    home: standing("A", 1),
    away: standing("B", 2),
  },
  {
    round: "GSF2",
    track: "gold",
    title: "Gold Semi 2",
    subtitle: "B1 vs A2",
    home: standing("B", 1),
    away: standing("A", 2),
  },
  {
    round: "GFINAL",
    track: "gold",
    title: "Gold Final",
    subtitle: "Winners of both gold semis",
    home: { kind: "winner", from: "GSF1", label: "Winner of Gold Semi 1" },
    away: { kind: "winner", from: "GSF2", label: "Winner of Gold Semi 2" },
  },
  {
    round: "SQ1",
    track: "silver",
    title: "Silver Qualifier 1",
    subtitle: "A3 vs loser of Gold Semi 1",
    home: standing("A", 3),
    away: { kind: "loser", from: "GSF1", label: "Loser of Gold Semi 1" },
  },
  {
    round: "SQ2",
    track: "silver",
    title: "Silver Qualifier 2",
    subtitle: "B3 vs loser of Gold Semi 2",
    home: standing("B", 3),
    away: { kind: "loser", from: "GSF2", label: "Loser of Gold Semi 2" },
  },
  {
    round: "SFINAL",
    track: "silver",
    title: "Silver Final",
    subtitle: "Winners of both silver qualifiers",
    home: { kind: "winner", from: "SQ1", label: "Winner of Silver Qualifier 1" },
    away: { kind: "winner", from: "SQ2", label: "Winner of Silver Qualifier 2" },
  },
];

export const BRACKET_BY_ROUND: Record<RoundLabel, RoundMeta> = Object.fromEntries(
  BRACKET.map((b) => [b.round, b])
) as Record<RoundLabel, RoundMeta>;

export const goldRounds = (): RoundMeta[] =>
  BRACKET.filter((b) => b.track === "gold");
export const silverRounds = (): RoundMeta[] =>
  BRACKET.filter((b) => b.track === "silver");

// Resolve one slot to a team id, or null when it can't be determined yet.
// Standings slots resolve immediately; winner/loser slots need their feeder
// played with a decisive score (a drawn feeder stays unresolved — admin picks).
export function resolveSlot(
  source: SlotSource,
  teams: Team[],
  matches: Match[]
): string | null {
  if (source.kind === "standing") {
    const table = standingsByGroup(teams, matches, source.group);
    return table[source.place - 1]?.team_id ?? null;
  }

  const feeder = matches.find(
    (m) => m.stage === "knockout" && m.round_label === source.from
  );
  if (!feeder || !feeder.played) return null;
  if (!feeder.home_team_id || !feeder.away_team_id) return null;
  if (feeder.home_score === feeder.away_score) return null;

  const homeWon = feeder.home_score > feeder.away_score;
  const winner = homeWon ? feeder.home_team_id : feeder.away_team_id;
  const loser = homeWon ? feeder.away_team_id : feeder.home_team_id;
  return source.kind === "winner" ? winner : loser;
}

export interface Outcome {
  winner: string | null;
  runnerUp: string | null;
}

// Who lifted a trophy. Both sides stay null until the final has actually been
// played with a decisive score — never guess a champion from a pending or
// drawn tie.
export function finalOutcome(matches: Match[], round: RoundLabel): Outcome {
  return {
    winner: resolveSlot({ kind: "winner", from: round, label: "" }, [], matches),
    runnerUp: resolveSlot({ kind: "loser", from: round, label: "" }, [], matches),
  };
}

export interface SlotPatch {
  id: string;
  home_team_id?: string;
  away_team_id?: string;
}

// Auto-fill patches for knockout slots that are still EMPTY. A slot the admin
// has already set is never touched here — overrides survive until the bracket
// is explicitly re-seeded.
export function autoFillPatches(teams: Team[], matches: Match[]): SlotPatch[] {
  const patches: SlotPatch[] = [];

  for (const meta of BRACKET) {
    const match = matches.find(
      (m) => m.stage === "knockout" && m.round_label === meta.round
    );
    if (!match) continue;

    const patch: SlotPatch = { id: match.id };
    if (!match.home_team_id) {
      const id = resolveSlot(meta.home, teams, matches);
      if (id) patch.home_team_id = id;
    }
    if (!match.away_team_id) {
      const id = resolveSlot(meta.away, teams, matches);
      if (id) patch.away_team_id = id;
    }
    if (patch.home_team_id || patch.away_team_id) patches.push(patch);
  }

  return patches;
}

export interface Slots {
  home_team_id: string | null;
  away_team_id: string | null;
}

// Slots every round SHOULD hold for a (re)seed.
//
// `preserved` are the already-played knockout matches the caller is keeping.
// They stay in the resolution context, so a played tie still feeds its
// winner/loser into the dependent rounds being reseeded — preserving results
// must not break propagation. On a first seed `preserved` is empty and the
// winner/loser slots resolve to null, filling in later as ties are played.
export function reseedSlots(
  teams: Team[],
  matches: Match[],
  preserved: Match[]
): Record<RoundLabel, Slots> {
  const context = [
    ...matches.filter((m) => m.stage === "group"),
    ...preserved,
  ];

  return Object.fromEntries(
    BRACKET.map((meta) => [
      meta.round,
      {
        home_team_id: resolveSlot(meta.home, teams, context),
        away_team_id: resolveSlot(meta.away, teams, context),
      },
    ])
  ) as Record<RoundLabel, Slots>;
}

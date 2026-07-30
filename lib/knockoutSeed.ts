import { autoFillPatches, BRACKET, BRACKET_BY_ROUND, reseedSlots } from "./bracket";
import { supabaseAdmin } from "./supabaseServer";
import type { Match, RoundLabel, Team } from "./types";

// SERVER-ONLY helpers that persist the bracket. Pure bracket maths lives in
// lib/bracket.ts; this module is the thin layer that reads/writes matches.

async function loadTeamsAndMatches(): Promise<{
  teams: Team[];
  matches: Match[];
}> {
  const [teamRes, matchRes] = await Promise.all([
    supabaseAdmin.from("teams").select("id, name, group_label, seed_index"),
    supabaseAdmin.from("matches").select("*"),
  ]);
  if (teamRes.error) throw new Error(teamRes.error.message);
  if (matchRes.error) throw new Error(matchRes.error.message);
  return {
    teams: (teamRes.data ?? []) as Team[],
    matches: (matchRes.data ?? []) as Match[],
  };
}

// Fill any EMPTY knockout slot whose source has resolved (group standings, or
// a feeder match that now has a decisive result). Slots the admin has already
// set are left alone — this never overwrites a manual pick.
export async function autoFillKnockout(): Promise<number> {
  const { teams, matches } = await loadTeamsAndMatches();
  const patches = autoFillPatches(teams, matches);

  for (const { id, ...fields } of patches) {
    const { error } = await supabaseAdmin
      .from("matches")
      .update(fields)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
  return patches.length;
}

export interface SeedResult {
  created: number;
  updated: number;
  preserved: number;
}

// (Re)seed the 6 knockout matches from the current group table.
//
// A tie that has already been PLAYED is left completely alone — teams, score,
// scorers, assists and MOTM all survive a re-seed, so a stray click on finals
// day can't wipe entered results. Only unplayed rounds are refreshed (their
// slots are recomputed, which is the one thing that clears a manual override),
// and missing rounds are created. Played ties still feed their winner/loser
// into the unplayed rounds downstream.
export async function seedKnockout(): Promise<SeedResult> {
  const { teams, matches } = await loadTeamsAndMatches();
  const knockout = matches.filter((m) => m.stage === "knockout");

  // One row per round. If duplicates somehow exist, the played one wins.
  const byRound = new Map<RoundLabel, Match>();
  for (const m of knockout) {
    if (!m.round_label || !BRACKET_BY_ROUND[m.round_label]) continue;
    const current = byRound.get(m.round_label);
    if (!current || (m.played && !current.played))
      byRound.set(m.round_label, m);
  }

  const preserved = Array.from(byRound.values()).filter((m) => m.played);
  const slots = reseedSlots(teams, matches, preserved);

  // Clear out stale rows — an unrecognised round label, or a duplicate that
  // lost the round above. Never touches a played match.
  const stale = knockout.filter(
    (m) =>
      !m.played &&
      (!m.round_label ||
        !BRACKET_BY_ROUND[m.round_label] ||
        byRound.get(m.round_label)?.id !== m.id)
  );
  if (stale.length > 0) {
    const { error } = await supabaseAdmin
      .from("matches")
      .delete()
      .in(
        "id",
        stale.map((m) => m.id)
      );
    if (error) throw new Error(error.message);
  }

  const result: SeedResult = {
    created: 0,
    updated: 0,
    preserved: preserved.length,
  };

  for (const meta of BRACKET) {
    const existing = byRound.get(meta.round);
    if (existing?.played) continue;

    if (existing) {
      const { error } = await supabaseAdmin
        .from("matches")
        .update(slots[meta.round])
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      result.updated++;
    } else {
      const { error } = await supabaseAdmin.from("matches").insert({
        stage: "knockout",
        round_label: meta.round,
        ...slots[meta.round],
      });
      if (error) throw new Error(error.message);
      result.created++;
    }
  }

  return result;
}

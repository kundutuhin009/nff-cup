import { autoFillPatches, seedRows } from "./bracket";
import { supabaseAdmin } from "./supabaseServer";
import type { Match, Team } from "./types";

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

// Wipe and re-create the 6 knockout matches, seeding standings-fed slots from
// the current group table. Destructive by design — the caller confirms first.
export async function seedKnockout(): Promise<number> {
  const { teams, matches } = await loadTeamsAndMatches();
  const rows = seedRows(teams, matches);

  const { error: delErr } = await supabaseAdmin
    .from("matches")
    .delete()
    .eq("stage", "knockout");
  if (delErr) throw new Error(delErr.message);

  const { error: insErr } = await supabaseAdmin.from("matches").insert(rows);
  if (insErr) throw new Error(insErr.message);

  return rows.length;
}

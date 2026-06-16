import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { buildGroupFixtures } from "@/lib/fixtures";

// POST: (re)generate the 12 group fixtures (6 per group) from the seeded teams.
// Replaces any existing GROUP matches. Knockout matches are untouched.
export async function POST(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  const { data: teams, error: teamErr } = await supabaseAdmin
    .from("teams")
    .select("id, group_label, seed_index")
    .order("seed_index");
  if (teamErr)
    return NextResponse.json({ error: teamErr.message }, { status: 500 });

  const groupA = (teams ?? [])
    .filter((t) => t.group_label === "A")
    .map((t) => t.id);
  const groupB = (teams ?? [])
    .filter((t) => t.group_label === "B")
    .map((t) => t.id);

  if (groupA.length < 2 || groupB.length < 2) {
    return NextResponse.json(
      { error: "Each group needs at least 2 teams." },
      { status: 400 }
    );
  }

  const fixtures = buildGroupFixtures(groupA, groupB);

  // Remove existing group matches (cascades to their match_player_stats).
  const { error: delErr } = await supabaseAdmin
    .from("matches")
    .delete()
    .eq("stage", "group");
  if (delErr)
    return NextResponse.json({ error: delErr.message }, { status: 500 });

  const rows = fixtures.map((f) => ({
    stage: f.stage,
    group_label: f.group_label,
    home_team_id: f.home_team_id,
    away_team_id: f.away_team_id,
  }));

  const { error: insErr } = await supabaseAdmin.from("matches").insert(rows);
  if (insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, created: rows.length });
}

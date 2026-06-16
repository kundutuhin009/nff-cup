import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

const MAX_PER_TEAM = 7;

// POST: assign (or move/unassign) a player's team. Single source of truth for
// team_players, used by BOTH the master table and the auction screen.
// body: { registration_id, team_id: string | null }
export async function POST(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  let body: { registration_id?: string; team_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const registration_id = body.registration_id;
  const team_id = body.team_id ?? null;
  if (!registration_id)
    return NextResponse.json({ error: "registration_id required." }, { status: 400 });

  // Unassign
  if (team_id === null) {
    const { error } = await supabaseAdmin
      .from("team_players")
      .delete()
      .eq("registration_id", registration_id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, team_id: null });
  }

  // Enforce max 7 per team (ignoring this player if already on the team).
  const { data: existing, error: countErr } = await supabaseAdmin
    .from("team_players")
    .select("registration_id")
    .eq("team_id", team_id);
  if (countErr)
    return NextResponse.json({ error: countErr.message }, { status: 500 });

  const alreadyOnTeam = (existing ?? []).some(
    (e) => e.registration_id === registration_id
  );
  if (!alreadyOnTeam && (existing?.length ?? 0) >= MAX_PER_TEAM) {
    return NextResponse.json(
      { error: `Team is full (max ${MAX_PER_TEAM}).` },
      { status: 400 }
    );
  }

  // Upsert on registration_id (unique) -> moves player if they had a team.
  const { error } = await supabaseAdmin
    .from("team_players")
    .upsert(
      { registration_id, team_id },
      { onConflict: "registration_id" }
    );
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, team_id });
}

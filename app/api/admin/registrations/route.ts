import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// GET: full registration list for the master player table, with each
// player's current team assignment (team_id or null).
export async function GET(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  const { data: regs, error } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, created_at, full_name, photo_base64, email, whatsapp, position, reg_type, is_playing, fee_amount, food_pref, paid"
    )
    .order("created_at", { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: tps, error: tpErr } = await supabaseAdmin
    .from("team_players")
    .select("registration_id, team_id");
  if (tpErr)
    return NextResponse.json({ error: tpErr.message }, { status: 500 });

  const teamByReg = new Map(
    (tps ?? []).map((tp) => [tp.registration_id, tp.team_id])
  );

  const rows = (regs ?? []).map((r) => ({
    ...r,
    team_id: teamByReg.get(r.id) ?? null,
  }));

  return NextResponse.json({ registrations: rows });
}

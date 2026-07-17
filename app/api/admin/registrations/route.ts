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

  // price rides along with the team link — it's auction data the anon client
  // can't read (team_players has no anon policy), so it must come from here.
  const { data: tps, error: tpErr } = await supabaseAdmin
    .from("team_players")
    .select("registration_id, team_id, price");
  if (tpErr)
    return NextResponse.json({ error: tpErr.message }, { status: 500 });

  const draftByReg = new Map((tps ?? []).map((tp) => [tp.registration_id, tp]));

  const rows = (regs ?? []).map((r) => {
    const draft = draftByReg.get(r.id);
    return {
      ...r,
      team_id: draft?.team_id ?? null,
      price: draft?.price ?? null, // null = not drafted (distinct from €0)
    };
  });

  return NextResponse.json({ registrations: rows });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Teams INCLUDING their purse. Needed as an admin route because 0005 revokes
// the `purse` column grant from anon — the auction screen can't read budgets
// through the anon client the way it reads names/groups.
export async function GET(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("id, name, group_label, seed_index, owner_registration_id, purse")
    .order("group_label")
    .order("seed_index");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ teams: data ?? [] });
}

// PATCH on the COLLECTION: set the same purse on every team ("apply the
// default budget to all 8"). Per-team overrides go to PATCH /api/admin/teams/[id].
export async function PATCH(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  let body: { purse?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const purse = Number(body.purse);
  if (!Number.isInteger(purse) || purse < 0)
    return NextResponse.json(
      { error: "Purse must be a whole number of euros, 0 or more." },
      { status: 400 }
    );

  // No .eq() filter — every team. Supabase requires a filter for update(), so
  // match the always-true condition on the primary key being present.
  const { error } = await supabaseAdmin
    .from("teams")
    .update({ purse })
    .not("id", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, purse });
}

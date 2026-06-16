import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { FOOD_PREFS, POSITIONS } from "@/lib/types";

// PATCH: inline-edit a registration (full_name, email, whatsapp, position,
// food_pref, paid). Only whitelisted fields are accepted.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if ("full_name" in body) {
    const v = String(body.full_name ?? "").trim();
    if (!v) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    patch.full_name = v;
  }
  if ("email" in body) {
    const v = String(body.email ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    patch.email = v;
  }
  if ("whatsapp" in body) {
    const v = String(body.whatsapp ?? "").trim();
    if (!/^\d{10,13}$/.test(v))
      return NextResponse.json({ error: "WhatsApp must be 10–13 digits." }, { status: 400 });
    patch.whatsapp = v;
  }
  if ("position" in body) {
    const v = String(body.position ?? "");
    if (!POSITIONS.includes(v as never))
      return NextResponse.json({ error: "Invalid position." }, { status: 400 });
    patch.position = v;
  }
  if ("food_pref" in body) {
    const v = String(body.food_pref ?? "");
    if (!FOOD_PREFS.includes(v as never))
      return NextResponse.json({ error: "Invalid food preference." }, { status: 400 });
    patch.food_pref = v;
  }
  if ("paid" in body) {
    patch.paid = Boolean(body.paid);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("registrations")
    .update(patch)
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE: remove a registration (cascades to payment_screenshots,
// team_players, match_player_stats).
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  const { error } = await supabaseAdmin
    .from("registrations")
    .delete()
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}

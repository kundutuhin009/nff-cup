import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

const MAX_PLAYING_PER_TEAM = 7;

// PATCH: rename a team, change its group (A/B), or set/clear its owner.
// Used by the auction screen. owner_registration_id: string | null.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  let body: {
    name?: string;
    group_label?: string;
    owner_registration_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ("name" in body) {
    const v = String(body.name ?? "").trim();
    if (!v) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    patch.name = v;
  }
  if ("group_label" in body) {
    const v = String(body.group_label ?? "");
    if (v !== "A" && v !== "B")
      return NextResponse.json({ error: "Group must be A or B." }, { status: 400 });
    patch.group_label = v;
  }

  if ("owner_registration_id" in body) {
    const ownerId = body.owner_registration_id || null;
    if (ownerId) {
      // Owner must be a paid registration of type 'owner'.
      const { data: owner, error: ownerErr } = await supabaseAdmin
        .from("registrations")
        .select("id, reg_type, is_playing, paid")
        .eq("id", ownerId)
        .single();
      if (ownerErr || !owner)
        return NextResponse.json({ error: "Owner not found." }, { status: 400 });
      if (owner.reg_type !== "owner")
        return NextResponse.json(
          { error: "Selected registration is not an owner." },
          { status: 400 }
        );
      if (!owner.paid)
        return NextResponse.json(
          { error: "Owner must be marked paid first." },
          { status: 400 }
        );

      // A playing owner consumes one of the 7 playing slots.
      if (owner.is_playing) {
        const { count, error: cntErr } = await supabaseAdmin
          .from("team_players")
          .select("registration_id", { count: "exact", head: true })
          .eq("team_id", params.id);
        if (cntErr)
          return NextResponse.json({ error: cntErr.message }, { status: 500 });
        if ((count ?? 0) >= MAX_PLAYING_PER_TEAM)
          return NextResponse.json(
            {
              error: `Team already has ${MAX_PLAYING_PER_TEAM} playing members; a playing owner would exceed the limit.`,
            },
            { status: 400 }
          );
      }

      // One team per owner: clear this owner from any other team first.
      const { error: clearErr } = await supabaseAdmin
        .from("teams")
        .update({ owner_registration_id: null })
        .eq("owner_registration_id", ownerId)
        .neq("id", params.id);
      if (clearErr)
        return NextResponse.json({ error: clearErr.message }, { status: 500 });
    }
    patch.owner_registration_id = ownerId;
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("teams")
    .update(patch)
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

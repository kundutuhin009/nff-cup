import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// PATCH: rename a team or change its group (A/B). Used by the auction screen.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  let body: { name?: string; group_label?: string };
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

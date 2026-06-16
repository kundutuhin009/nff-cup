import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ROUND_LABELS } from "@/lib/types";

// GET: all matches (admin view).
export async function GET(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  const { data, error } = await supabaseAdmin.from("matches").select("*");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ matches: data ?? [] });
}

// POST: create a knockout match (admin picks the two teams + round).
// body: { round_label, home_team_id, away_team_id }
export async function POST(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  let body: {
    round_label?: string;
    home_team_id?: string | null;
    away_team_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!ROUND_LABELS.includes(body.round_label as never))
    return NextResponse.json({ error: "Invalid round." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("matches")
    .insert({
      stage: "knockout",
      round_label: body.round_label,
      home_team_id: body.home_team_id ?? null,
      away_team_id: body.away_team_id ?? null,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id }, { status: 201 });
}

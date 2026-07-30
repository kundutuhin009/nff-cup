import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { autoFillKnockout } from "@/lib/knockoutSeed";
import { supabaseAdmin } from "@/lib/supabaseServer";

// GET: a single match plus its per-player stats (for the results editor).
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  const { data: match, error } = await supabaseAdmin
    .from("matches")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!match)
    return NextResponse.json({ error: "Match not found." }, { status: 404 });

  const { data: stats, error: sErr } = await supabaseAdmin
    .from("match_player_stats")
    .select("match_id, registration_id, goals, assists")
    .eq("match_id", params.id);
  if (sErr)
    return NextResponse.json({ error: sErr.message }, { status: 500 });

  return NextResponse.json({ match, stats: stats ?? [] });
}

// PATCH: save a match result. Accepts scores, played flag, MOTM, optional
// team selection (knockouts), and a full replacement of per-player stats.
// body: {
//   home_team_id?, away_team_id?, home_score?, away_score?, played?,
//   motm_registration_id?, stats?: [{registration_id, goals, assists}]
// }
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
  if ("home_team_id" in body) patch.home_team_id = body.home_team_id ?? null;
  if ("away_team_id" in body) patch.away_team_id = body.away_team_id ?? null;
  if ("home_score" in body) patch.home_score = clampInt(body.home_score);
  if ("away_score" in body) patch.away_score = clampInt(body.away_score);
  if ("played" in body) patch.played = Boolean(body.played);
  if ("motm_registration_id" in body)
    patch.motm_registration_id = body.motm_registration_id || null;
  // Free-text kickoff time; blank clears it back to "no time set".
  if ("match_time" in body) {
    const t = typeof body.match_time === "string" ? body.match_time.trim() : "";
    patch.match_time = t === "" ? null : t.slice(0, 20);
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabaseAdmin
      .from("matches")
      .update(patch)
      .eq("id", params.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replace per-player stats wholesale if provided.
  if (Array.isArray(body.stats)) {
    const { error: delErr } = await supabaseAdmin
      .from("match_player_stats")
      .delete()
      .eq("match_id", params.id);
    if (delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 });

    const rows = (body.stats as Array<Record<string, unknown>>)
      .map((s) => ({
        match_id: params.id,
        registration_id: String(s.registration_id),
        goals: clampInt(s.goals),
        assists: clampInt(s.assists),
      }))
      // Drop empty stat lines.
      .filter((s) => s.registration_id && (s.goals > 0 || s.assists > 0));

    if (rows.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from("match_player_stats")
        .insert(rows);
      if (insErr)
        return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  // A saved result can decide a knockout feeder (or move the group table), so
  // push any newly-resolved teams into still-empty bracket slots. Best-effort:
  // the save itself has already succeeded, so a propagation hiccup must not
  // turn it into an error.
  try {
    await autoFillKnockout();
  } catch {
    // Ignored — the admin can re-save or re-seed to retry.
  }

  return NextResponse.json({ ok: true });
}

// DELETE: remove a match (cascades to its stats).
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  const { error } = await supabaseAdmin
    .from("matches")
    .delete()
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

function clampInt(v: unknown): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 99);
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { autoFillKnockout, seedKnockout } from "@/lib/knockoutSeed";

// POST: (re)generate the 6 dual-track knockout matches — GOLD (GSF1, GSF2,
// GFINAL) + SILVER (SQ1, SQ2, SFINAL) — seeding A1/B2, B1/A2, A3, B3 from the
// current group standings. Winner/loser-fed slots start empty and auto-fill as
// their feeders are played. Group matches are untouched.
export async function POST(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  try {
    const created = await seedKnockout();
    // Nothing is playable yet on a fresh bracket, but this keeps seeding and
    // propagation on one code path.
    await autoFillKnockout();
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Seed failed." },
      { status: 500 }
    );
  }
}

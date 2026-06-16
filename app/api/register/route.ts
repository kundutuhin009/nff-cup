import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { base64Bytes } from "@/lib/imageCompress";
import { FOOD_PREFS, POSITIONS } from "@/lib/types";

const MAX_BYTES = 200 * 1024;

// Public endpoint — players self-register. Writes via service role
// (registrations table denies anon access).
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const full_name = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const whatsapp = String(body.whatsapp ?? "").trim();
  const position = String(body.position ?? "");
  const food_pref = String(body.food_pref ?? "");
  const photo_base64 = String(body.photo_base64 ?? "");
  const payment_screenshot_base64 = String(body.payment_screenshot_base64 ?? "");

  // Validation
  if (!full_name) return bad("Full name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Valid email required.");
  if (!/^\d{10,13}$/.test(whatsapp)) return bad("WhatsApp must be 10–13 digits.");
  if (!POSITIONS.includes(position as never)) return bad("Invalid position.");
  if (!FOOD_PREFS.includes(food_pref as never)) return bad("Invalid food preference.");
  if (!photo_base64) return bad("Player photo is required.");
  if (!payment_screenshot_base64) return bad("Payment screenshot is required.");
  if (base64Bytes(photo_base64) > MAX_BYTES) return bad("Please use a smaller photo.");
  if (base64Bytes(payment_screenshot_base64) > MAX_BYTES)
    return bad("Please use a smaller payment screenshot.");

  // Insert registration
  const { data: reg, error: regErr } = await supabaseAdmin
    .from("registrations")
    .insert({
      full_name,
      email,
      whatsapp,
      position,
      food_pref,
      photo_base64,
      paid: false,
    })
    .select("id")
    .single();

  if (regErr || !reg) {
    return NextResponse.json(
      { error: "Could not save registration." },
      { status: 500 }
    );
  }

  // Insert payment screenshot (separate table)
  const { error: shotErr } = await supabaseAdmin
    .from("payment_screenshots")
    .insert({
      registration_id: reg.id,
      screenshot_base64: payment_screenshot_base64,
    });

  if (shotErr) {
    // Roll back the registration so we don't keep a half-record.
    await supabaseAdmin.from("registrations").delete().eq("id", reg.id);
    return NextResponse.json(
      { error: "Could not save payment screenshot." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: reg.id }, { status: 201 });
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

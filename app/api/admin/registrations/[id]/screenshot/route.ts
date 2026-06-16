import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// GET: lazy-load a single payment screenshot for the modal.
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  const { data, error } = await supabaseAdmin
    .from("payment_screenshots")
    .select("screenshot_base64")
    .eq("registration_id", params.id)
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)
    return NextResponse.json({ error: "No screenshot on file." }, { status: 404 });

  return NextResponse.json({ screenshot_base64: data.screenshot_base64 });
}

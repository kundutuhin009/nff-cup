import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// POST: publish an announcement. body: { body: string }
export async function POST(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  let payload: { body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const text = String(payload.body ?? "").trim();
  if (!text)
    return NextResponse.json({ error: "Announcement cannot be empty." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("updates")
    .insert({ body: text })
    .select("id, created_at, body")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ update: data }, { status: 201 });
}

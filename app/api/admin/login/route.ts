import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

// Verifies the PIN header. Client uses this to gate the admin UI.
export async function POST(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;
  return NextResponse.json({ ok: true });
}

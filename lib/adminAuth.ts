import { NextResponse } from "next/server";

// Server-side PIN check for /api/admin/* routes.
// Compares the x-admin-pin header against process.env.ADMIN_PIN.
// Returns a 401 NextResponse if invalid, or null if authorized.
export function requireAdmin(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_PIN;
  const provided = req.headers.get("x-admin-pin");

  if (!expected) {
    return NextResponse.json(
      { error: "Server missing ADMIN_PIN configuration." },
      { status: 500 }
    );
  }
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

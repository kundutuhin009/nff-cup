import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ANNOUNCEMENTS_BUCKET, announcementKeyFromUrl } from "@/lib/storage";

// DELETE: remove an announcement and its image object (if any).
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  // Look up the image first so we can clean up the bucket object.
  const { data: row } = await supabaseAdmin
    .from("updates")
    .select("image_url")
    .eq("id", params.id)
    .single();

  const { error } = await supabaseAdmin
    .from("updates")
    .delete()
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort: remove the stored image so we don't orphan files.
  const key = announcementKeyFromUrl(row?.image_url ?? null);
  if (key)
    await supabaseAdmin.storage.from(ANNOUNCEMENTS_BUCKET).remove([key]);

  return new NextResponse(null, { status: 204 });
}

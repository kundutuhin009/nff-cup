import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ANNOUNCEMENTS_BUCKET, safeAnnouncementKey } from "@/lib/storage";

// Server-side ceiling for the uploaded (already browser-compressed) image.
const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB

// POST: publish an announcement.
// body: { body?: string, image_base64?: string (data URL), image_filename?: string }
// Must have at least one of body / image.
export async function POST(req: Request) {
  const unauth = requireAdmin(req);
  if (unauth) return unauth;

  let payload: { body?: string; image_base64?: string; image_filename?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const text = String(payload.body ?? "").trim();
  const imageData = payload.image_base64 ? String(payload.image_base64) : "";

  if (!text && !imageData)
    return NextResponse.json(
      { error: "Add some text or an image." },
      { status: 400 }
    );

  // Upload the image to the public bucket (if provided) and get its URL.
  let image_url: string | null = null;
  let uploadedKey: string | null = null;
  if (imageData) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(imageData);
    if (!match)
      return NextResponse.json({ error: "Invalid image data." }, { status: 400 });

    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.byteLength > MAX_IMAGE_BYTES)
      return NextResponse.json(
        { error: "Image is too large — keep it under 1 MB." },
        { status: 400 }
      );

    const key = safeAnnouncementKey(
      crypto.randomUUID(),
      payload.image_filename || "banner"
    );
    const { error: upErr } = await supabaseAdmin.storage
      .from(ANNOUNCEMENTS_BUCKET)
      .upload(key, buffer, { contentType, upsert: false });
    if (upErr)
      return NextResponse.json({ error: "Image upload failed." }, { status: 500 });

    uploadedKey = key;
    image_url = supabaseAdmin.storage
      .from(ANNOUNCEMENTS_BUCKET)
      .getPublicUrl(key).data.publicUrl;
  }

  const { data, error } = await supabaseAdmin
    .from("updates")
    .insert({ body: text || null, image_url })
    .select("id, created_at, body, image_url")
    .single();

  if (error) {
    // Don't orphan the freshly-uploaded object if the row insert fails.
    if (uploadedKey)
      await supabaseAdmin.storage.from(ANNOUNCEMENTS_BUCKET).remove([uploadedKey]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ update: data }, { status: 201 });
}

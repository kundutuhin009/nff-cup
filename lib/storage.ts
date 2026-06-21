// Supabase Storage helpers for the public `announcements` bucket.
// Uploads happen server-side via the service role; anon may only READ.

export const ANNOUNCEMENTS_BUCKET = "announcements";

// Public object URLs look like:
//   https://<proj>.supabase.co/storage/v1/object/public/announcements/<key>
// Recover <key> so we can delete the object when its announcement is removed.
export function announcementKeyFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/object/public/${ANNOUNCEMENTS_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const key = url.slice(i + marker.length);
  return key ? decodeURIComponent(key) : null;
}

// Make an upload filename safe and force a .jpg extension (we re-encode to
// JPEG in the browser before upload).
export function safeAnnouncementKey(uuid: string, originalName: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, ""); // strip extension
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "image";
  return `${uuid}-${safe}.jpg`;
}

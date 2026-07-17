import type { Registration } from "./types";

// Turn a player name into a safe filename stem: spaces collapse to single
// underscores, characters illegal on Windows/macOS filesystems are dropped.
function sanitizeName(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "unnamed"
  );
}

// Split a data URI into its base64 payload and file extension. Only the two
// formats the registration form accepts are recognised; anything else falls
// back to .jpg. Returns null when the value isn't a base64 data URI at all.
function parseDataUri(uri: string): { data: string; ext: string } | null {
  const m = /^data:image\/([a-z+]+);base64,(.+)$/i.exec(uri.trim());
  if (!m) return null;
  const ext = m[1].toLowerCase() === "png" ? "png" : "jpg";
  return { data: m[2], ext };
}

// Build a ZIP of every registration photo, named "<idx>_<Player_Name>.<ext>"
// and ordered by full_name ascending so the numbering matches the CSV export.
// Players without a usable photo are skipped rather than zipped as empty files.
export async function buildPhotosZip(rows: Registration[]): Promise<Blob> {
  const withPhotos = rows
    .filter((r) => r.photo_base64)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  // Loaded on demand so JSZip stays out of the admin page's initial bundle.
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const pad = Math.max(2, String(withPhotos.length).length);
  let index = 0;

  for (const r of withPhotos) {
    const photo = parseDataUri(r.photo_base64 as string);
    if (!photo) continue; // unrecognised payload — skip over a broken file

    // The index prefix is unique per file, so same-named players never collide.
    index += 1;
    const prefix = String(index).padStart(pad, "0");
    zip.file(`${prefix}_${sanitizeName(r.full_name)}.${photo.ext}`, photo.data, {
      base64: true,
    });
  }

  return zip.generateAsync({ type: "blob" });
}

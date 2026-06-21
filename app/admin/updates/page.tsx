"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { supabase } from "@/lib/supabaseClient";
import {
  compressImage,
  ImageTooLargeError,
  type CompressResult,
} from "@/lib/imageCompress";
import type { Update } from "@/lib/types";

// Sponsor banners can be large — cap to 1200px wide, target ~700KB, hard-reject
// over 1MB (matches the server ceiling).
const IMG_MAX_WIDTH = 1200;
const IMG_QUALITY = 0.82;
const IMG_TARGET_BYTES = 700 * 1024;
const IMG_HARD_LIMIT = 1024 * 1024;

export default function AdminUpdatesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [body, setBody] = useState("");
  const [image, setImage] = useState<CompressResult | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [imgBusy, setImgBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("updates")
      .select("id, created_at, body, image_url")
      .order("created_at", { ascending: false });
    setUpdates((data ?? []) as Update[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    setImgBusy(true);
    try {
      const result = await compressImage(
        file,
        { maxWidth: IMG_MAX_WIDTH, quality: IMG_QUALITY },
        IMG_TARGET_BYTES,
        IMG_HARD_LIMIT
      );
      setImage(result);
      setImageName(file.name);
    } catch (e) {
      setImage(null);
      setImageName("");
      setError(
        e instanceof ImageTooLargeError
          ? "Image is too large even after compression — use a smaller one."
          : e instanceof Error
            ? e.message
            : "Could not process that image."
      );
    } finally {
      setImgBusy(false);
    }
  }

  function clearImage() {
    setImage(null);
    setImageName("");
  }

  const canPost = (!!body.trim() || !!image) && !busy && !imgBusy;

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !image) return;
    setBusy(true);
    setError(null);
    try {
      const { update } = await adminFetch<{ update: Update }>(
        "/api/admin/updates",
        {
          method: "POST",
          body: JSON.stringify({
            body: body.trim(),
            image_base64: image?.dataUrl,
            image_filename: imageName,
          }),
        }
      );
      setUpdates((u) => [update, ...u]);
      setBody("");
      clearImage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Post failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await adminFetch(`/api/admin/updates/${id}`, { method: "DELETE" });
      setUpdates((u) => u.filter((x) => x.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={post}
        className="rounded-xl border border-white/5 bg-panel p-4"
      >
        <h2 className="mb-2 font-display text-lg uppercase tracking-wide text-lime">
          Post Announcement
        </h2>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write an update for the players…"
          className="w-full rounded-md border border-white/10 bg-pitch px-3 py-2 text-sm outline-none focus:border-lime"
        />

        {/* Optional image (sponsor banner / visual update) */}
        <div className="mt-2">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            Image (optional — sponsor banner / visual)
          </label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onPickImage(e.target.files?.[0])}
              className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-pitch file:px-3 file:py-2 file:font-mono file:text-xs file:uppercase file:text-lime"
            />
            {image && (
              <button
                type="button"
                onClick={clearImage}
                className="shrink-0 rounded border border-white/10 px-2 py-1 font-mono text-[10px] uppercase text-zinc-300 hover:border-red-500/50 hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>
          {imgBusy && <p className="mt-1 text-xs text-zinc-500">Compressing…</p>}
          {image && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.dataUrl}
                alt="preview"
                className="max-h-48 w-full rounded-lg border border-white/10 bg-pitch object-contain"
              />
              <p className="mt-1 font-mono text-[10px] text-zinc-500">
                {(image.bytes / 1024).toFixed(0)} KB ready
              </p>
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={!canPost}
          className="mt-2 rounded-md bg-lime px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-pitch disabled:opacity-50"
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </form>

      <div className="space-y-2">
        {updates.map((u) => (
          <div
            key={u.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-panel p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                {new Date(u.created_at).toLocaleString()}
              </div>
              {u.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.image_url}
                  alt={u.body ?? "Announcement"}
                  loading="lazy"
                  className="mt-2 max-h-64 w-full rounded-lg border border-white/10 bg-pitch object-contain"
                />
              )}
              {u.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm">{u.body}</p>
              )}
            </div>
            <button
              onClick={() => remove(u.id)}
              className="shrink-0 rounded border border-red-500/30 px-2 py-1 font-mono text-[10px] uppercase text-red-300 hover:bg-red-500/10"
            >
              Del
            </button>
          </div>
        ))}
        {updates.length === 0 && (
          <p className="text-sm text-zinc-500">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}

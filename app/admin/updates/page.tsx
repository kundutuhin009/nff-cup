"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { supabase } from "@/lib/supabaseClient";
import type { Update } from "@/lib/types";

export default function AdminUpdatesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("updates")
      .select("id, created_at, body")
      .order("created_at", { ascending: false });
    setUpdates((data ?? []) as Update[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { update } = await adminFetch<{ update: Update }>(
        "/api/admin/updates",
        { method: "POST", body: JSON.stringify({ body: body.trim() }) }
      );
      setUpdates((u) => [update, ...u]);
      setBody("");
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
        {error && <p className="mt-1 text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy || !body.trim()}
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
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                {new Date(u.created_at).toLocaleString()}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{u.body}</p>
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

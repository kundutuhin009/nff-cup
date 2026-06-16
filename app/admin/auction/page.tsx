"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { supabase } from "@/lib/supabaseClient";
import type { Registration, Team } from "@/lib/types";

interface AdminRow extends Registration {
  team_id: string | null;
}

const MAX_PER_TEAM = 7;

export default function AuctionPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ registrations }, teamRes] = await Promise.all([
        adminFetch<{ registrations: AdminRow[] }>("/api/admin/registrations"),
        supabase
          .from("teams")
          .select("id, name, group_label, seed_index")
          .order("group_label")
          .order("seed_index"),
      ]);
      setRows(registrations);
      setTeams((teamRes.data ?? []) as Team[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Pool = paid AND unassigned.
  const pool = useMemo(
    () => rows.filter((r) => r.paid && !r.team_id),
    [rows]
  );
  const rosterOf = useCallback(
    (teamId: string) => rows.filter((r) => r.team_id === teamId),
    [rows]
  );

  function patchLocal(id: string, patch: Partial<AdminRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function assign(teamId: string) {
    if (!selected) return;
    if (rosterOf(teamId).length >= MAX_PER_TEAM) {
      alert(`Team is full (max ${MAX_PER_TEAM}).`);
      return;
    }
    const id = selected;
    setSelected(null);
    try {
      await adminFetch("/api/admin/team-assign", {
        method: "POST",
        body: JSON.stringify({ registration_id: id, team_id: teamId }),
      });
      patchLocal(id, { team_id: teamId });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Assign failed.");
      load();
    }
  }

  async function unassign(id: string) {
    try {
      await adminFetch("/api/admin/team-assign", {
        method: "POST",
        body: JSON.stringify({ registration_id: id, team_id: null }),
      });
      patchLocal(id, { team_id: null });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unassign failed.");
      load();
    }
  }

  async function renameTeam(id: string, name: string) {
    try {
      await adminFetch(`/api/admin/teams/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Rename failed.");
    }
  }

  async function setGroup(id: string, group_label: "A" | "B") {
    try {
      await adminFetch(`/api/admin/teams/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ group_label }),
      });
      setTeams((ts) =>
        ts.map((t) => (t.id === id ? { ...t, group_label } : t))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Group change failed.");
    }
  }

  if (loading) return <p className="font-mono text-sm text-zinc-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-300">{error}</p>;

  return (
    <div className="space-y-5">
      <p className="font-mono text-xs text-zinc-500">
        Tap a player in the pool, then tap a team to draft them. Tap a drafted
        player to send them back to the pool.
      </p>

      {/* Pool */}
      <div className="rounded-xl border border-white/5 bg-panel p-4">
        <h2 className="mb-2 font-display text-lg uppercase tracking-wide text-lime">
          Pool · {pool.length} <span className="text-xs text-zinc-500">(paid & unassigned)</span>
        </h2>
        {pool.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No paid, unassigned players left.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pool.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(selected === p.id ? null : p.id)}
                className={[
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  selected === p.id
                    ? "bg-lime text-pitch"
                    : "bg-pitch text-zinc-200 hover:bg-pitch/60",
                ].join(" ")}
              >
                {p.full_name}
                <span className="ml-1 font-mono text-[10px] text-zinc-500">
                  {p.position[0]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map((t) => {
          const roster = rosterOf(t.id);
          const full = roster.length >= MAX_PER_TEAM;
          return (
            <div
              key={t.id}
              className="rounded-xl border border-white/5 bg-panel p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <input
                  defaultValue={t.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== t.name) renameTeam(t.id, v);
                  }}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-1 font-display text-base uppercase text-lime hover:border-white/10 focus:border-lime focus:bg-pitch focus:outline-none"
                />
                <select
                  value={t.group_label}
                  onChange={(e) => setGroup(t.id, e.target.value as "A" | "B")}
                  className="rounded bg-pitch px-1 py-1 font-mono text-xs text-zinc-300"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
                <span
                  className={`font-mono text-xs ${full ? "text-red-300" : "text-zinc-500"}`}
                >
                  {roster.length}/{MAX_PER_TEAM}
                </span>
              </div>

              <button
                disabled={!selected || full}
                onClick={() => assign(t.id)}
                className="mb-2 w-full rounded-md border border-lime/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-lime disabled:opacity-30"
              >
                {full ? "Full" : "Draft selected here"}
              </button>

              <div className="flex flex-wrap gap-1.5">
                {roster.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => unassign(p.id)}
                    title="Tap to remove"
                    className="rounded bg-pitch px-2 py-1 text-xs text-zinc-200 hover:bg-red-500/20"
                  >
                    {p.full_name}
                    <span className="ml-1 font-mono text-[10px] text-zinc-500">
                      {p.position[0]}
                    </span>
                  </button>
                ))}
                {roster.length === 0 && (
                  <span className="text-xs text-zinc-600">Empty</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

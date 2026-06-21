"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PhotoModal from "@/components/admin/PhotoModal";
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
  const [photoOf, setPhotoOf] = useState<AdminRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Caption for the photo modal — reg_type + position.
  const captionOf = (p: AdminRow) =>
    `${p.reg_type === "gk" ? "GK" : "Player"} · ${p.position ?? "—"}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ registrations }, teamRes] = await Promise.all([
        adminFetch<{ registrations: AdminRow[] }>("/api/admin/registrations"),
        supabase
          .from("teams")
          .select("id, name, group_label, seed_index, owner_registration_id")
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

  // Pool = paid gk/player registrations that are unassigned. Owners are NOT
  // draftable — they run teams and are assigned via the owner dropdown.
  const pool = useMemo(
    () =>
      rows.filter(
        (r) => r.paid && !r.team_id && (r.reg_type === "gk" || r.reg_type === "player")
      ),
    [rows]
  );
  const rosterOf = useCallback(
    (teamId: string) => rows.filter((r) => r.team_id === teamId),
    [rows]
  );
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  // Paid owners are the candidates for the per-team owner dropdown.
  const owners = useMemo(
    () => rows.filter((r) => r.reg_type === "owner" && r.paid),
    [rows]
  );
  // Owners already running a team — excluded from OTHER teams' dropdowns
  // (mirrors how drafted players leave the pool).
  const assignedOwnerIds = useMemo(
    () =>
      new Set(
        teams
          .map((t) => t.owner_registration_id)
          .filter((id): id is string => !!id)
      ),
    [teams]
  );
  // Playing members = drafted gk/player + the owner if they're playing.
  const playingCountOf = useCallback(
    (teamId: string, ownerRegId: string | null) => {
      const owner = ownerRegId ? byId.get(ownerRegId) : undefined;
      return rosterOf(teamId).length + (owner?.is_playing ? 1 : 0);
    },
    [rosterOf, byId]
  );

  function patchLocal(id: string, patch: Partial<AdminRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function assign(teamId: string) {
    if (!selected) return;
    const team = teams.find((t) => t.id === teamId);
    if (playingCountOf(teamId, team?.owner_registration_id ?? null) >= MAX_PER_TEAM) {
      alert(`Team is full (max ${MAX_PER_TEAM} playing members).`);
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

  async function setOwner(id: string, owner_registration_id: string | null) {
    try {
      await adminFetch(`/api/admin/teams/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ owner_registration_id }),
      });
      // An owner belongs to one team — clear them from any other team locally.
      setTeams((ts) =>
        ts.map((t) => {
          if (t.id === id) return { ...t, owner_registration_id };
          if (owner_registration_id && t.owner_registration_id === owner_registration_id)
            return { ...t, owner_registration_id: null };
          return t;
        })
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Owner change failed.");
    }
  }

  if (loading) return <p className="font-mono text-sm text-chalk-mut">Loading…</p>;
  if (error) return <p className="text-sm text-red-300">{error}</p>;

  return (
    <div className="space-y-5">
      <p className="font-mono text-xs text-chalk-mut">
        Tap a player in the pool, then tap a team to draft them. Tap a drafted
        player to send them back to the pool.
      </p>

      {/* Pool */}
      <div className="rounded-xl border border-turf-line bg-turf-panel p-4">
        <h2 className="mb-2 font-display text-lg uppercase tracking-wide text-accent">
          Pool · {pool.length} <span className="text-xs text-chalk-mut">(paid & unassigned)</span>
        </h2>
        {pool.length === 0 ? (
          <p className="text-sm text-chalk-mut">
            No paid, unassigned players left.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pool.map((p) => {
              const active = selected === p.id;
              return (
                <div
                  key={p.id}
                  className={[
                    "flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-3 text-sm transition-colors",
                    active
                      ? "bg-accent text-turf-deep"
                      : "bg-turf-deep text-chalk hover:bg-turf-deep/60",
                  ].join(" ")}
                >
                  <PhotoButton p={p} size="h-11 w-11" onZoom={setPhotoOf} />
                  <button
                    type="button"
                    onClick={() => setSelected(active ? null : p.id)}
                    className="flex flex-col items-start text-left leading-tight"
                  >
                    <span className="font-medium">{p.full_name}</span>
                    <span
                      className={`font-mono text-[10px] ${active ? "text-turf-deep/70" : "text-chalk-mut"}`}
                    >
                      {p.reg_type === "gk" ? "GK" : "Player"} · {p.position ?? "—"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map((t) => {
          const roster = rosterOf(t.id);
          const owner = t.owner_registration_id
            ? byId.get(t.owner_registration_id)
            : undefined;
          // Available = unassigned owners, plus this team's current owner.
          const availableOwners = owners.filter(
            (o) => o.id === t.owner_registration_id || !assignedOwnerIds.has(o.id)
          );
          const playing = playingCountOf(t.id, t.owner_registration_id);
          const full = playing >= MAX_PER_TEAM;
          return (
            <div
              key={t.id}
              className="rounded-xl border border-turf-line bg-turf-panel p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <input
                  defaultValue={t.name}
                  title="Click to rename — saves on blur or Enter"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== t.name) renameTeam(t.id, v);
                    else if (!v) e.target.value = t.name; // reject empty, restore
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-1 font-display text-base uppercase text-accent hover:border-turf-line focus:border-accent focus:bg-turf-deep focus:outline-none"
                />
                <select
                  value={t.group_label}
                  onChange={(e) => setGroup(t.id, e.target.value as "A" | "B")}
                  className="rounded bg-turf-deep px-1 py-1 font-mono text-xs text-chalk"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
                <span
                  className={`font-mono text-xs ${full ? "text-red-300" : "text-chalk-mut"}`}
                  title="Playing members (drafted + playing owner)"
                >
                  {playing}/{MAX_PER_TEAM}
                </span>
              </div>

              {/* Owner */}
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
                  Owner
                </span>
                <select
                  value={t.owner_registration_id ?? ""}
                  onChange={(e) => setOwner(t.id, e.target.value || null)}
                  className="min-w-0 flex-1 rounded bg-turf-deep px-1 py-1 text-xs text-chalk"
                >
                  <option value="">— none —</option>
                  {availableOwners.map((o) => (
                    <option key={o.id} value={o.id} className="bg-turf-deep">
                      {o.full_name}
                      {o.is_playing ? "" : " (non-playing)"}
                    </option>
                  ))}
                </select>
              </div>

              <button
                disabled={!selected || full}
                onClick={() => assign(t.id)}
                className="mb-2 w-full rounded-md border border-accent/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-accent disabled:opacity-30"
              >
                {full ? "Full" : "Draft selected here"}
              </button>

              {owner && (
                <div className="mb-1.5 text-xs text-chalk">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
                    Owner:
                  </span>{" "}
                  {owner.full_name}
                  {!owner.is_playing && (
                    <span className="text-chalk-mut"> (non-playing)</span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {roster.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 rounded bg-turf-deep py-1 pl-1 pr-2 text-xs text-chalk"
                  >
                    <PhotoButton p={p} size="h-9 w-9" onZoom={setPhotoOf} />
                    <button
                      type="button"
                      onClick={() => unassign(p.id)}
                      title="Tap to remove"
                      className="flex items-center gap-1.5 rounded hover:text-red-300"
                    >
                      <span>{p.full_name}</span>
                      <span className="font-mono text-[10px] text-chalk-mut">
                        {p.position?.[0] ?? "?"}
                      </span>
                    </button>
                  </div>
                ))}
                {roster.length === 0 && (
                  <span className="text-xs text-chalk-mut">No drafted players</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {photoOf && (
        <PhotoModal
          src={photoOf.photo_base64}
          name={photoOf.full_name}
          caption={captionOf(photoOf)}
          onClose={() => setPhotoOf(null)}
        />
      )}
    </div>
  );
}

// Photo thumbnail that opens the zoom modal on click — a SEPARATE button from
// the draft/remove action so the two never conflict. Base64 is already on the
// row (no extra fetch). Falls back to a neutral tile when there's no photo.
function PhotoButton({
  p,
  size,
  onZoom,
}: {
  p: AdminRow;
  size: string;
  onZoom: (p: AdminRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onZoom(p)}
      aria-label={`View ${p.full_name}'s photo`}
      title="Tap to zoom"
      className={`group relative ${size} shrink-0 overflow-hidden rounded-md`}
    >
      {p.photo_base64 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.photo_base64}
          alt={p.full_name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="block h-full w-full bg-turf-line" />
      )}
      {/* Zoom hint badge */}
      <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-tl bg-black/60 text-chalk">
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </span>
    </button>
  );
}

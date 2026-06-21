"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ScreenshotModal from "@/components/admin/ScreenshotModal";
import SortableTH from "@/components/SortableTH";
import { StatTile } from "@/components/Panel";
import { adminFetch } from "@/lib/adminFetch";
import { supabase } from "@/lib/supabaseClient";
import { registrationsToCsv } from "@/lib/csv";
import { byText, useSortable, type Comparator } from "@/lib/useSortable";
import {
  FOOD_PREFS,
  POSITIONS,
  REG_TYPES,
  REG_TYPE_LABELS,
  type FoodPref,
  type Position,
  type RegType,
  type Registration,
  type Team,
} from "@/lib/types";
import { feeFor, formatRupees } from "@/lib/pricing";

interface AdminRow extends Registration {
  team_id: string | null;
}

export default function MasterTablePage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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

  const totals = useMemo(() => {
    return {
      veg: rows.filter((r) => r.food_pref === "Veg").length,
      nonVeg: rows.filter((r) => r.food_pref === "Non-Veg").length,
      paid: rows.filter((r) => r.paid).length,
      unpaid: rows.filter((r) => !r.paid).length,
      // Money collected = sum of fee_amount across paid registrations.
      collected: rows
        .filter((r) => r.paid)
        .reduce((sum, r) => sum + (r.fee_amount ?? 0), 0),
    };
  }, [rows]);

  const teamNameById = useMemo(
    () => new Map(teams.map((t) => [t.id, t.name])),
    [teams]
  );

  // Owner -> the team they own (owners are assigned via teams.owner_registration_id,
  // not the draft). Used to label owner rows in the Team column.
  const ownedTeamByReg = useMemo(
    () =>
      new Map(
        teams
          .filter((t) => t.owner_registration_id)
          .map((t) => [t.owner_registration_id as string, t.name])
      ),
    [teams]
  );

  // Column comparators (view-only sort). Text columns sort alphabetically;
  // paid sorts unpaid -> paid; team sorts by name with "Unassigned" last.
  const comparators = useMemo<Record<string, Comparator<AdminRow>>>(() => {
    const teamLabel = (r: AdminRow) =>
      r.team_id ? teamNameById.get(r.team_id) ?? "" : null;
    return {
      full_name: byText((r) => r.full_name),
      email: byText((r) => r.email),
      whatsapp: byText((r) => r.whatsapp),
      position: byText((r) => r.position ?? ""),
      reg_type: byText((r) => REG_TYPE_LABELS[r.reg_type]),
      fee: (a, b) => (a.fee_amount ?? 0) - (b.fee_amount ?? 0),
      food_pref: byText((r) => r.food_pref),
      paid: (a, b) => (a.paid === b.paid ? 0 : a.paid ? 1 : -1),
      team: (a, b) => {
        const ta = teamLabel(a);
        const tb = teamLabel(b);
        if (ta === null && tb === null) return 0;
        if (ta === null) return 1; // Unassigned last
        if (tb === null) return -1;
        return ta.localeCompare(tb);
      },
    };
  }, [teamNameById]);

  const sortable = useSortable(rows, comparators);

  function patchLocal(id: string, patch: Partial<AdminRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveField(id: string, patch: Partial<Registration>) {
    try {
      await adminFetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      patchLocal(id, patch as Partial<AdminRow>);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed.");
      load(); // resync on failure
    }
  }

  // Changing reg_type recomputes the fee (and forces is_playing=true for
  // non-owners) — mirror the server's derivation locally for instant feedback.
  async function changeRegType(id: string, reg_type: RegType) {
    const patch: Partial<Registration> = {
      reg_type,
      fee_amount: feeFor(reg_type),
    };
    if (reg_type !== "owner") patch.is_playing = true;
    try {
      await adminFetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ reg_type }),
      });
      patchLocal(id, patch as Partial<AdminRow>);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed.");
      load();
    }
  }

  async function assignTeam(id: string, team_id: string | null) {
    try {
      await adminFetch("/api/admin/team-assign", {
        method: "POST",
        body: JSON.stringify({ registration_id: id, team_id }),
      });
      patchLocal(id, { team_id });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Assign failed.");
      load();
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete ${name}? This can't be undone.`)) return;
    try {
      await adminFetch(`/api/admin/registrations/${id}`, { method: "DELETE" });
      // Optimistic drop for instant feedback (refreshes count + summary tiles
      // since totals derive from `rows`).
      setRows((rs) => rs.filter((r) => r.id !== id));
      // Resync authoritative state, incl. teams — if this player was a team's
      // owner the FK set it to null, so the teams list must refresh too.
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
      load();
    }
  }

  function downloadCsv() {
    const teamMap: Record<string, string | null> = {};
    for (const r of rows) teamMap[r.id] = teamNameById.get(r.team_id ?? "") ?? null;
    const csv = registrationsToCsv(rows, teamMap);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nff-independence-cup-players.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const cellInput =
    "w-full min-w-[7rem] rounded border border-transparent bg-transparent px-1 py-1 text-sm hover:border-white/10 focus:border-lime focus:bg-pitch focus:outline-none";

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Veg" value={totals.veg} />
        <StatTile label="Non-Veg" value={totals.nonVeg} />
        <StatTile label="Paid" value={totals.paid} />
        <StatTile label="Unpaid" value={totals.unpaid} />
        <StatTile label="Collected" value={`₹${totals.collected}`} />
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-zinc-500">
          {rows.length} player{rows.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={downloadCsv}
          className="rounded-md border border-lime/40 px-3 py-1.5 font-display text-sm uppercase tracking-wide text-lime hover:bg-lime/10"
        >
          Download CSV
        </button>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {loading ? (
        <p className="font-mono text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-panel">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                <th scope="col" className="p-2">Photo</th>
                <SortableTH label="Name" sortKey="full_name" sortable={sortable} className="p-2" />
                <SortableTH label="Email" sortKey="email" sortable={sortable} className="p-2" />
                <SortableTH label="WhatsApp" sortKey="whatsapp" sortable={sortable} className="p-2" />
                <SortableTH label="Reg Type" sortKey="reg_type" sortable={sortable} className="p-2" />
                <th scope="col" className="p-2 text-center">Playing?</th>
                <SortableTH label="Fee" sortKey="fee" sortable={sortable} align="center" className="p-2" />
                <SortableTH label="Pos" sortKey="position" sortable={sortable} className="p-2" />
                <SortableTH label="Food" sortKey="food_pref" sortable={sortable} className="p-2" />
                <SortableTH label="Paid" sortKey="paid" sortable={sortable} align="center" className="p-2" />
                <SortableTH label="Team" sortKey="team" sortable={sortable} className="p-2" />
                <th scope="col" className="p-2 text-center">Pay</th>
                <th scope="col" className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {sortable.sortedRows.map((r) => (
                <tr key={r.id} className="border-t border-white/5 align-middle">
                  <td className="p-2">
                    {r.photo_base64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.photo_base64}
                        alt={r.full_name}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-pitch" />
                    )}
                  </td>
                  <td className="p-2">
                    <input
                      className={cellInput}
                      defaultValue={r.full_name}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== r.full_name) saveField(r.id, { full_name: v });
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={cellInput}
                      type="email"
                      defaultValue={r.email}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== r.email) saveField(r.id, { email: v });
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={cellInput}
                      inputMode="numeric"
                      defaultValue={r.whatsapp}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== r.whatsapp) saveField(r.id, { whatsapp: v });
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className={cellInput}
                      value={r.reg_type}
                      onChange={(e) =>
                        changeRegType(r.id, e.target.value as RegType)
                      }
                    >
                      {REG_TYPES.map((rt) => (
                        <option key={rt} value={rt} className="bg-pitch">
                          {REG_TYPE_LABELS[rt]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    {r.reg_type === "owner" ? (
                      <input
                        type="checkbox"
                        checked={r.is_playing}
                        onChange={(e) =>
                          saveField(r.id, { is_playing: e.target.checked })
                        }
                        className="h-4 w-4 accent-lime"
                        title="Playing owner?"
                      />
                    ) : (
                      <span className="font-mono text-[10px] text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="p-2 text-center font-mono text-zinc-300">
                    {formatRupees(r.fee_amount)}
                  </td>
                  <td className="p-2">
                    {r.reg_type === "owner" && !r.is_playing ? (
                      // Non-playing owner has no on-pitch position.
                      <span className="font-mono text-xs text-zinc-500">N/A</span>
                    ) : (
                      <select
                        className={cellInput}
                        value={r.position ?? ""}
                        onChange={(e) =>
                          saveField(r.id, { position: e.target.value as Position })
                        }
                      >
                        {POSITIONS.map((p) => (
                          <option key={p} value={p} className="bg-pitch">
                            {p}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="p-2">
                    <select
                      className={cellInput}
                      value={r.food_pref}
                      onChange={(e) =>
                        saveField(r.id, { food_pref: e.target.value as FoodPref })
                      }
                    >
                      {FOOD_PREFS.map((f) => (
                        <option key={f} value={f} className="bg-pitch">
                          {f}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={r.paid}
                      onChange={(e) => saveField(r.id, { paid: e.target.checked })}
                      className="h-4 w-4 accent-lime"
                    />
                  </td>
                  <td className="p-2">
                    {r.reg_type === "owner" ? (
                      // Owners aren't drafted; they're assigned a team in the
                      // auction screen (teams.owner_registration_id).
                      <span className="font-mono text-xs text-zinc-400">
                        {ownedTeamByReg.get(r.id)
                          ? `Owns ${ownedTeamByReg.get(r.id)}`
                          : "— (set in auction)"}
                      </span>
                    ) : (
                      <select
                        className={cellInput}
                        value={r.team_id ?? ""}
                        onChange={(e) =>
                          assignTeam(r.id, e.target.value || null)
                        }
                      >
                        <option value="" className="bg-pitch">
                          Unassigned
                        </option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id} className="bg-pitch">
                            {t.name} ({t.group_label})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => setModal({ id: r.id, name: r.full_name })}
                      className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] uppercase text-zinc-300 hover:border-lime hover:text-lime"
                    >
                      View
                    </button>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => remove(r.id, r.full_name)}
                      className="rounded border border-red-500/30 px-2 py-1 font-mono text-[10px] uppercase text-red-300 hover:bg-red-500/10"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-6 text-center text-sm text-zinc-500">
                    No registrations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ScreenshotModal
          registrationId={modal.id}
          playerName={modal.name}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PhotoModal from "@/components/admin/PhotoModal";
import { adminFetch } from "@/lib/adminFetch";
import {
  TONE_CLASS,
  formatEuros,
  remainingOf,
  spentOf,
  toneOf,
} from "@/lib/auction";
import type { AdminTeam, Registration } from "@/lib/types";

interface AdminRow extends Registration {
  team_id: string | null;
  price: number | null; // euros drafted for; null = not drafted
}

const MAX_PER_TEAM = 7;

export default function AuctionPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  // Draft price for the selected player, as typed. Kept as a string so the
  // field can be empty mid-entry rather than snapping to 0.
  const [price, setPrice] = useState("");
  // Team tapped before a price was entered — Enter in the price field then
  // confirms the draft, so either order works during a live auction.
  const [armedTeam, setArmedTeam] = useState<string | null>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const [photoOf, setPhotoOf] = useState<AdminRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Caption for the photo modal — reg_type + position.
  const captionOf = (p: AdminRow) =>
    `${p.reg_type === "gk" ? "GK" : "Player"} · ${p.position ?? "—"}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Teams come from the admin route, not the anon client: 0005 revokes the
      // `purse` column grant from anon, so budgets are unreadable there.
      const [{ registrations }, { teams: teamList }] = await Promise.all([
        adminFetch<{ registrations: AdminRow[] }>("/api/admin/registrations"),
        adminFetch<{ teams: AdminTeam[] }>("/api/admin/teams"),
      ]);
      setRows(registrations);
      setTeams(teamList);
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

  // Budget per team: SPENT is summed from the drafted prices (owners are free
  // and never land in team_players), REMAINING falls out of purse - spent. Both
  // recompute from `rows`, so they self-correct on every draft and removal.
  const budgetOf = useCallback(
    (t: AdminTeam) => {
      const spent = spentOf(rosterOf(t.id));
      return { spent, remaining: remainingOf(t.purse, spent) };
    },
    [rosterOf]
  );

  // Projector strip data — the SAME purse/price numbers the team cards render,
  // just precomputed once per change instead of per card. No extra query or
  // state: it all falls out of `teams` + `rows`.
  const overview = useMemo(
    () => teams.map((t) => ({ team: t, ...budgetOf(t) })),
    [teams, budgetOf]
  );

  // Headline totals. "In play" = drafted + still in the pool, so the
  // denominator only counts players actually up for auction (paid gk/player)
  // and can never come out below the sold count.
  const totals = useMemo(() => {
    const drafted = rows.filter((r) => r.team_id);
    return {
      sold: drafted.length,
      inPlay: drafted.length + pool.length,
      spent: spentOf(drafted),
    };
  }, [rows, pool]);

  // The typed price, or null while it isn't a usable whole number of euros.
  const parsedPrice = useMemo(() => {
    if (price.trim() === "") return null;
    const n = Number(price);
    return Number.isInteger(n) && n >= 0 ? n : null;
  }, [price]);

  function patchLocal(id: string, patch: Partial<AdminRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function selectPlayer(id: string | null) {
    setSelected(id);
    setPrice("");
    setArmedTeam(null);
    if (id) requestAnimationFrame(() => priceRef.current?.focus());
  }

  async function assign(teamId: string, amount: number) {
    if (!selected) return;
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    if (playingCountOf(teamId, team.owner_registration_id) >= MAX_PER_TEAM) {
      alert(`Team is full (max ${MAX_PER_TEAM} playing members).`);
      return;
    }

    // Overspend WARNS but never blocks — the admin can knowingly override and
    // let the team run negative.
    const { remaining } = budgetOf(team);
    if (amount > remaining) {
      const ok = confirm(
        `This exceeds ${team.name}'s remaining ${formatEuros(remaining)} — draft anyway?\n\n` +
          `${formatEuros(amount)} would leave them at ${formatEuros(remaining - amount)}.`
      );
      if (!ok) return;
    }

    const id = selected;
    selectPlayer(null);
    try {
      await adminFetch("/api/admin/team-assign", {
        method: "POST",
        body: JSON.stringify({
          registration_id: id,
          team_id: teamId,
          price: amount,
        }),
      });
      patchLocal(id, { team_id: teamId, price: amount });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Assign failed.");
      load();
    }
  }

  // Tapping a team drafts at the typed price; with no price yet it arms the
  // team so Enter in the price field confirms.
  function draftTo(teamId: string) {
    if (parsedPrice === null) {
      setArmedTeam(teamId);
      priceRef.current?.focus();
      return;
    }
    assign(teamId, parsedPrice);
  }

  async function unassign(id: string) {
    try {
      await adminFetch("/api/admin/team-assign", {
        method: "POST",
        body: JSON.stringify({ registration_id: id, team_id: null }),
      });
      // Clearing price alongside team_id returns the money to the team: SPENT
      // is derived from the roster, so REMAINING goes back up immediately.
      patchLocal(id, { team_id: null, price: null });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unassign failed.");
      load();
    }
  }

  async function setPurse(id: string, purse: number) {
    try {
      await adminFetch(`/api/admin/teams/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ purse }),
      });
      setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, purse } : t)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Budget change failed.");
      load();
    }
  }

  async function applyPurseToAll(purse: number) {
    try {
      await adminFetch("/api/admin/teams", {
        method: "PATCH",
        body: JSON.stringify({ purse }),
      });
      setTeams((ts) => ts.map((t) => ({ ...t, purse })));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Applying the budget failed.");
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

  const sel = selected ? byId.get(selected) : undefined;

  return (
    <div className="space-y-5">
      {/* Read-only scan strip for the room — every team's remaining at a
          glance. Editing stays on the cards below. */}
      <BudgetStrip overview={overview} totals={totals} />

      <p className="font-mono text-xs text-chalk-mut">
        Tap a player in the pool, enter a price, then tap a team to draft them
        (or tap the team first and press Enter on the price). Tap a drafted
        player to send them back to the pool and refund their price.
      </p>

      {/* Default budget for all teams */}
      <PurseAllControl onApply={applyPurseToAll} />

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
                    onClick={() => selectPlayer(active ? null : p.id)}
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

      {/* Price bar for the selected player — sticks to the top of the viewport
          so the field stays reachable while scrolling to a team card. */}
      {sel && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-turf-deep/95 p-3 backdrop-blur">
          <PhotoButton p={sel} size="h-10 w-10" onZoom={setPhotoOf} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-medium text-chalk">{sel.full_name}</p>
            <p className="font-mono text-[10px] text-chalk-mut">
              {armedTeam
                ? `Press Enter to draft to ${
                    teams.find((t) => t.id === armedTeam)?.name ?? "team"
                  }`
                : "Enter a price, then tap a team"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-display text-lg text-accent">€</span>
            <input
              ref={priceRef}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && armedTeam && parsedPrice !== null) {
                  e.preventDefault();
                  assign(armedTeam, parsedPrice);
                } else if (e.key === "Escape") {
                  selectPlayer(null);
                }
              }}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="0"
              aria-label={`Draft price in euros for ${sel.full_name}`}
              className="w-24 rounded border border-turf-line bg-turf-panel px-2 py-1.5 text-right font-mono text-base text-chalk focus:border-accent focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => selectPlayer(null)}
            className="rounded border border-turf-line px-2 py-1 font-mono text-[10px] uppercase text-chalk-mut hover:text-chalk"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Teams */}
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map((t) => {
          const roster = rosterOf(t.id);
          const { spent, remaining } = budgetOf(t);
          const tone = toneOf(remaining, t.purse);
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

              {/* Budget: REMAINING is the glanceable number. */}
              <div className="mb-2 flex items-end justify-between gap-2 rounded-lg bg-turf-deep px-2.5 py-2">
                <div className="font-mono text-[10px] leading-relaxed text-chalk-mut">
                  <div className="flex items-center gap-1">
                    <span className="uppercase tracking-widest">Purse</span>
                    <span className="text-accent">€</span>
                    <input
                      defaultValue={t.purse}
                      key={t.purse} // re-sync the field after "apply to all"
                      title="Click to edit this team's budget — saves on blur or Enter"
                      aria-label={`${t.name} budget in euros`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      onBlur={(e) => {
                        // Number("") is 0, so an empty field must be rejected
                        // explicitly — otherwise clearing it to retype and
                        // tabbing away would silently zero the team's budget.
                        const raw = e.target.value.trim();
                        const v = Number(raw);
                        if (raw === "" || !Number.isInteger(v) || v < 0) {
                          e.target.value = String(t.purse); // reject, restore
                          return;
                        }
                        if (v !== t.purse) setPurse(t.id, v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-right font-mono text-xs text-chalk hover:border-turf-line focus:border-accent focus:bg-turf-panel focus:outline-none"
                    />
                  </div>
                  <div className="uppercase tracking-widest">
                    Spent <span className="text-chalk">{formatEuros(spent)}</span>
                  </div>
                </div>
                <div className="text-right leading-none">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
                    Remaining
                  </div>
                  <div
                    className={`font-display text-2xl ${TONE_CLASS[tone]}`}
                    title={
                      tone === "over"
                        ? "Over budget"
                        : tone === "low"
                          ? "Running low"
                          : "Healthy"
                    }
                  >
                    {formatEuros(remaining)}
                  </div>
                </div>
              </div>

              <button
                disabled={!selected || full}
                onClick={() => draftTo(t.id)}
                className={[
                  "mb-2 w-full rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest disabled:opacity-30",
                  armedTeam === t.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-accent/40 text-accent",
                ].join(" ")}
              >
                {full
                  ? "Full"
                  : parsedPrice !== null
                    ? `Draft for ${formatEuros(parsedPrice)}`
                    : "Draft selected here"}
              </button>

              {owner && (
                <div className="mb-1.5 text-xs text-chalk">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
                    Owner:
                  </span>{" "}
                  {owner.full_name}
                  {!owner.is_playing && (
                    <span className="text-chalk-mut"> (non-playing)</span>
                  )}{" "}
                  {/* Owners cost nothing against the purse. */}
                  <span className="font-mono text-[10px] text-chalk-mut">· free</span>
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
                      title={`Tap to remove — refunds ${formatEuros(p.price ?? 0)}`}
                      className="flex items-center gap-1.5 rounded hover:text-red-300"
                    >
                      <span>{p.full_name}</span>
                      <span className="font-mono text-[10px] text-chalk-mut">
                        {p.position?.[0] ?? "?"}
                      </span>
                      <span className="font-mono text-[10px] text-accent">
                        {formatEuros(p.price ?? 0)}
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

// Glanceable projector header: one tight cell per team showing REMAINING, in
// the same colours as the cards. Purely a readout of numbers already derived
// upstream — it holds no state and issues no fetch, so it can't slow the page.
function BudgetStrip({
  overview,
  totals,
}: {
  overview: { team: AdminTeam; spent: number; remaining: number }[];
  totals: { sold: number; inPlay: number; spent: number };
}) {
  if (overview.length === 0) return null;

  return (
    <div className="rounded-xl border border-turf-line bg-turf-panel p-2.5">
      {/* 8 across on a projector, wrapping down to 2 on a phone. */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
        {overview.map(({ team, remaining }) => (
          <div
            key={team.id}
            className="rounded-md bg-turf-deep px-2 py-1.5 text-center leading-tight"
            title={`${team.name} — ${formatEuros(remaining)} remaining of ${formatEuros(team.purse)}`}
          >
            <div className="truncate font-mono text-[10px] uppercase tracking-wide text-chalk-mut">
              {team.name}
            </div>
            <div
              className={`font-display text-lg ${TONE_CLASS[toneOf(remaining, team.purse)]}`}
            >
              {formatEuros(remaining)}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
        {totals.sold} / {totals.inPlay} sold · {formatEuros(totals.spent)} total
        spent
      </p>
    </div>
  );
}

// Sets one default budget across all 8 teams. Per-team overrides live on each
// card, so this is the "start of auction" control: apply the default first,
// then tweak individual teams.
function PurseAllControl({ onApply }: { onApply: (purse: number) => void }) {
  const [value, setValue] = useState("");
  const parsed = value.trim() === "" ? null : Number(value);
  const valid = parsed !== null && Number.isInteger(parsed) && parsed >= 0;

  function apply() {
    if (!valid) return;
    if (
      !confirm(
        `Set every team's budget to €${parsed}? This overwrites any per-team overrides.`
      )
    )
      return;
    onApply(parsed);
    setValue("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-turf-line bg-turf-panel p-3">
      <label
        htmlFor="purse-all"
        className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut"
      >
        Set all teams&apos; budget
      </label>
      <div className="flex items-center gap-1.5">
        <span className="font-display text-lg text-accent">€</span>
        <input
          id="purse-all"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder="1000"
          className="w-28 rounded border border-turf-line bg-turf-deep px-2 py-1.5 text-right font-mono text-sm text-chalk focus:border-accent focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={apply}
        disabled={!valid}
        className="rounded-md border border-accent/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-accent hover:bg-accent/10 disabled:opacity-30"
      >
        Apply to all
      </button>
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

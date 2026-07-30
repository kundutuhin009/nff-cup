"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MatchEditor from "@/components/admin/MatchEditor";
import { adminFetch } from "@/lib/adminFetch";
import { BRACKET_BY_ROUND, goldRounds, silverRounds } from "@/lib/bracket";
import type { RoundMeta } from "@/lib/bracket";
import { supabase } from "@/lib/supabaseClient";
import type { Match, Registration, Team } from "@/lib/types";

interface AdminRow extends Registration {
  team_id: string | null;
}

export default function ResultsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [matchRes, { registrations }, teamRes] = await Promise.all([
        adminFetch<{ matches: Match[] }>("/api/admin/matches"),
        adminFetch<{ registrations: AdminRow[] }>("/api/admin/registrations"),
        supabase
          .from("teams")
          .select("id, name, group_label, seed_index")
          .order("group_label")
          .order("seed_index"),
      ]);
      setMatches(matchRes.matches);
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

  const teamName = useCallback(
    (id: string | null) =>
      id ? teams.find((t) => t.id === id)?.name ?? "—" : "TBD",
    [teams]
  );

  const playersByTeam = useMemo(() => {
    const m = new Map<string, { id: string; full_name: string }[]>();
    for (const r of rows) {
      if (!r.team_id) continue;
      const list = m.get(r.team_id) ?? [];
      list.push({ id: r.id, full_name: r.full_name });
      m.set(r.team_id, list);
    }
    return m;
  }, [rows]);

  const groupMatches = matches.filter((m) => m.stage === "group");
  const knockoutMatches = matches.filter((m) => m.stage === "knockout");

  async function generateFixtures() {
    if (
      groupMatches.length > 0 &&
      !confirm("Regenerate group fixtures? Existing group results will be erased.")
    )
      return;
    setBusy(true);
    try {
      await adminFetch("/api/admin/fixtures/generate", { method: "POST" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Generate failed.");
    } finally {
      setBusy(false);
    }
  }

  async function seedBracket() {
    if (
      knockoutMatches.length > 0 &&
      !confirm(
        "Re-seed the knockout bracket from current standings?\n\n" +
          "This DELETES the 6 existing knockout matches — including their " +
          "scores, scorers and any manual team picks — and rebuilds them."
      )
    )
      return;
    setBusy(true);
    try {
      await adminFetch("/api/admin/knockout/seed", { method: "POST" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Seed failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="font-mono text-sm text-chalk-mut">Loading…</p>;
  if (error) return <p className="text-sm text-red-300">{error}</p>;

  // An empty knockout slot shows where its team will come from, so the admin
  // can see what's still waiting on a result before opening the editor.
  function slotText(m: Match, side: "home" | "away", meta?: RoundMeta) {
    const id = side === "home" ? m.home_team_id : m.away_team_id;
    if (id) return teamName(id);
    if (!meta) return "TBD";
    return `TBD · ${(side === "home" ? meta.home : meta.away).label}`;
  }

  function renderMatch(m: Match, label: string, meta?: RoundMeta) {
    const isOpen = open === m.id;
    return (
      <div key={m.id} className="rounded-lg border border-turf-line bg-turf-panel p-3">
        <button
          onClick={() => setOpen(isOpen ? null : m.id)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="text-sm">
            <span className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
              {label}
            </span>
            <br />
            {slotText(m, "home", meta)}{" "}
            <span className="font-mono text-accent">
              {m.played ? `${m.home_score}–${m.away_score}` : "vs"}
            </span>{" "}
            {slotText(m, "away", meta)}
          </span>
          <span className="font-mono text-xs text-chalk-mut">
            {isOpen ? "▲" : "▼"}
          </span>
        </button>
        {isOpen && (
          <MatchEditor
            match={m}
            teams={teams}
            playersByTeam={playersByTeam}
            onSaved={load}
            onDeleted={() => {
              setOpen(null);
              load();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Group fixtures generator */}
      <div className="rounded-xl border border-turf-line bg-turf-panel p-4">
        <h2 className="font-display text-lg uppercase tracking-wide text-accent">
          Group Fixtures
        </h2>
        <p className="mt-1 text-sm text-chalk-mut">
          Generates the 12 group matches (6 per group) from the 8 teams.
        </p>
        <button
          onClick={generateFixtures}
          disabled={busy}
          className="mt-3 rounded-md border border-accent/40 px-3 py-1.5 font-display text-sm uppercase tracking-wide text-accent hover:bg-accent/10 disabled:opacity-50"
        >
          {groupMatches.length > 0 ? "Regenerate fixtures" : "Generate fixtures"}
        </button>
      </div>

      {/* Group matches */}
      {(["A", "B"] as const).map((g) => {
        const ms = groupMatches.filter((m) => m.group_label === g);
        if (ms.length === 0) return null;
        return (
          <div key={g} className="space-y-2">
            <h3 className="font-display text-base uppercase tracking-wide text-chalk">
              Group {g}
            </h3>
            {ms.map((m) => renderMatch(m, `Group ${g}`))}
          </div>
        );
      })}

      {/* Knockout bracket seeding */}
      <div className="rounded-xl border border-turf-line bg-turf-panel p-4">
        <h2 className="font-display text-lg uppercase tracking-wide text-accent">
          Knockout Bracket
        </h2>
        <p className="mt-1 text-sm text-chalk-mut">
          Builds the 6 knockout matches — GOLD (2 semis + final) and SILVER
          (2 qualifiers + final) — seeding A1 v B2, B1 v A2, and A3 / B3 from
          the current group table. Loser- and winner-fed slots fill in
          automatically once their feeder match is played.
        </p>
        <p className="mt-1 text-sm text-chalk-mut">
          These are <span className="text-chalk">defaults</span>: every slot
          stays editable per match below, and a manual pick is never
          overwritten by auto-fill — only by re-seeding here.
        </p>
        <button
          onClick={seedBracket}
          disabled={busy}
          className="mt-3 rounded-md border border-accent/40 px-3 py-1.5 font-display text-sm uppercase tracking-wide text-accent hover:bg-accent/10 disabled:opacity-50"
        >
          {knockoutMatches.length > 0 ? "Re-seed bracket" : "Seed bracket"}
        </button>
      </div>

      {knockoutMatches.length > 0 &&
        (
          [
            ["GOLD", "Main trophy", goldRounds()],
            ["SILVER", "Consolation trophy", silverRounds()],
          ] as const
        ).map(([heading, blurb, rounds]) => (
          <div key={heading} className="space-y-2">
            <h3 className="font-display text-base uppercase tracking-widest text-chalk">
              {heading}{" "}
              <span className="font-mono text-[10px] tracking-widest text-chalk-mut">
                · {blurb}
              </span>
            </h3>
            {rounds.map((meta) => {
              const m = knockoutMatches.find(
                (k) => k.round_label === meta.round
              );
              return m ? (
                renderMatch(m, `${meta.title} · ${meta.subtitle}`, meta)
              ) : (
                <p
                  key={meta.round}
                  className="rounded-lg border border-dashed border-turf-line px-3 py-2 text-sm text-chalk-mut"
                >
                  {meta.title} — not seeded yet.
                </p>
              );
            })}
          </div>
        ))}

      {/* Any knockout row whose label isn't part of the current bracket. */}
      {knockoutMatches
        .filter((m) => !m.round_label || !BRACKET_BY_ROUND[m.round_label])
        .map((m) => renderMatch(m, "Unrecognised knockout round"))}
    </div>
  );
}

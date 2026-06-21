"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MatchEditor from "@/components/admin/MatchEditor";
import { adminFetch } from "@/lib/adminFetch";
import { supabase } from "@/lib/supabaseClient";
import {
  ROUND_LABELS,
  type Match,
  type Registration,
  type RoundLabel,
  type Team,
} from "@/lib/types";

interface AdminRow extends Registration {
  team_id: string | null;
}

const ROUND_TITLES: Record<RoundLabel, string> = {
  SF1: "Semi-final 1 (A1 v B2)",
  SF2: "Semi-final 2 (B1 v A2)",
  "3RD": "3rd-place playoff",
  FINAL: "Final",
};

export default function ResultsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newRound, setNewRound] = useState<RoundLabel>("SF1");

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

  async function addKnockout() {
    setBusy(true);
    try {
      await adminFetch("/api/admin/matches", {
        method: "POST",
        body: JSON.stringify({ round_label: newRound }),
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Add failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="font-mono text-sm text-chalk-mut">Loading…</p>;
  if (error) return <p className="text-sm text-red-300">{error}</p>;

  function renderMatch(m: Match, label: string) {
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
            {teamName(m.home_team_id)}{" "}
            <span className="font-mono text-accent">
              {m.played ? `${m.home_score}–${m.away_score}` : "vs"}
            </span>{" "}
            {teamName(m.away_team_id)}
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

      {/* Knockouts */}
      <div className="rounded-xl border border-turf-line bg-turf-panel p-4">
        <h2 className="font-display text-lg uppercase tracking-wide text-accent">
          Add Knockout Match
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={newRound}
            onChange={(e) => setNewRound(e.target.value as RoundLabel)}
            className="rounded border border-turf-line bg-turf-deep px-2 py-1 text-sm"
          >
            {ROUND_LABELS.map((r) => (
              <option key={r} value={r}>
                {ROUND_TITLES[r]}
              </option>
            ))}
          </select>
          <button
            onClick={addKnockout}
            disabled={busy}
            className="rounded-md border border-accent/40 px-3 py-1.5 font-display text-sm uppercase tracking-wide text-accent hover:bg-accent/10 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {knockoutMatches.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-base uppercase tracking-wide text-chalk">
            Knockouts
          </h3>
          {knockoutMatches.map((m) =>
            renderMatch(m, ROUND_TITLES[m.round_label as RoundLabel] ?? "Knockout")
          )}
        </div>
      )}
    </div>
  );
}

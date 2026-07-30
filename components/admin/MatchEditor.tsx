"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import type { Match, MatchPlayerStat, Team } from "@/lib/types";

interface PlayerLite {
  id: string;
  full_name: string;
}

export default function MatchEditor({
  match,
  teams,
  playersByTeam,
  onSaved,
  onDeleted,
}: {
  match: Match;
  teams: Team[];
  playersByTeam: Map<string, PlayerLite[]>;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [homeTeam, setHomeTeam] = useState(match.home_team_id ?? "");
  const [awayTeam, setAwayTeam] = useState(match.away_team_id ?? "");
  const [homeScore, setHomeScore] = useState(match.home_score);
  const [awayScore, setAwayScore] = useState(match.away_score);
  const [played, setPlayed] = useState(match.played);
  const [matchTime, setMatchTime] = useState(match.match_time ?? "");
  const [motm, setMotm] = useState(match.motm_registration_id ?? "");
  const [stats, setStats] = useState<Record<string, { goals: number; assists: number }>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Load existing per-player stats.
  useEffect(() => {
    adminFetch<{ stats: MatchPlayerStat[] }>(`/api/admin/matches/${match.id}`)
      .then(({ stats }) => {
        const map: Record<string, { goals: number; assists: number }> = {};
        for (const s of stats)
          map[s.registration_id] = { goals: s.goals, assists: s.assists };
        setStats(map);
      })
      .catch(() => {});
  }, [match.id]);

  const roster = useMemo(() => {
    const home = playersByTeam.get(homeTeam) ?? [];
    const away = playersByTeam.get(awayTeam) ?? [];
    return [...home, ...away];
  }, [homeTeam, awayTeam, playersByTeam]);

  function setStat(id: string, field: "goals" | "assists", value: number) {
    setStats((s) => ({
      ...s,
      [id]: {
        goals: field === "goals" ? value : s[id]?.goals ?? 0,
        assists: field === "assists" ? value : s[id]?.assists ?? 0,
      },
    }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const statRows = Object.entries(stats).map(([registration_id, v]) => ({
        registration_id,
        goals: v.goals,
        assists: v.assists,
      }));
      await adminFetch(`/api/admin/matches/${match.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          home_team_id: homeTeam || null,
          away_team_id: awayTeam || null,
          home_score: homeScore,
          away_score: awayScore,
          played,
          match_time: matchTime,
          motm_registration_id: motm || null,
          stats: statRows,
        }),
      });
      setMsg("Saved.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!confirm("Delete this match?")) return;
    try {
      await adminFetch(`/api/admin/matches/${match.id}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  const isKnockout = match.stage === "knockout";
  const numCls =
    "w-14 rounded border border-turf-line bg-turf-deep px-2 py-1 text-center font-mono";
  const selCls =
    "rounded border border-turf-line bg-turf-deep px-2 py-1 text-sm";

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-accent/20 bg-turf-deep/40 p-3">
      {/* Team pickers (knockout) or fixed labels (group) */}
      {isKnockout && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            className={selCls}
          >
            <option value="">Home team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="text-chalk-mut">vs</span>
          <select
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            className={selCls}
          >
            <option value="">Away team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Score + played */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-mono text-[10px] uppercase text-chalk-mut">Home</span>
          <input
            type="number"
            min={0}
            value={homeScore}
            onChange={(e) => setHomeScore(Number(e.target.value))}
            className={numCls}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="font-mono text-[10px] uppercase text-chalk-mut">Away</span>
          <input
            type="number"
            min={0}
            value={awayScore}
            onChange={(e) => setAwayScore(Number(e.target.value))}
            className={numCls}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={played}
            onChange={(e) => setPlayed(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Played
        </label>
        {/* Kickoff time — free text, blank means "no time set". */}
        <label className="flex items-center gap-2 text-sm">
          <span className="font-mono text-[10px] uppercase text-chalk-mut">
            Time
          </span>
          <input
            type="text"
            value={matchTime}
            onChange={(e) => setMatchTime(e.target.value)}
            placeholder="e.g. 2:30 PM"
            maxLength={20}
            className="w-28 rounded border border-turf-line bg-turf-deep px-2 py-1 font-mono text-sm"
          />
        </label>
      </div>

      {/* Per-player goals & assists */}
      {roster.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase text-chalk-mut">
                <th className="py-1">Player</th>
                <th className="py-1 text-center">Goals</th>
                <th className="py-1 text-center">Assists</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => (
                <tr key={p.id} className="border-t border-turf-line">
                  <td className="py-1 pr-2">{p.full_name}</td>
                  <td className="py-1 text-center">
                    <input
                      type="number"
                      min={0}
                      value={stats[p.id]?.goals ?? 0}
                      onChange={(e) => setStat(p.id, "goals", Number(e.target.value))}
                      className="w-14 rounded border border-turf-line bg-turf-deep px-1 py-0.5 text-center font-mono"
                    />
                  </td>
                  <td className="py-1 text-center">
                    <input
                      type="number"
                      min={0}
                      value={stats[p.id]?.assists ?? 0}
                      onChange={(e) => setStat(p.id, "assists", Number(e.target.value))}
                      className="w-14 rounded border border-turf-line bg-turf-deep px-1 py-0.5 text-center font-mono"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-chalk-mut">
          Assign players to both teams to record goals/assists.
        </p>
      )}

      {/* MOTM */}
      <label className="flex items-center gap-2 text-sm">
        <span className="font-mono text-[10px] uppercase text-chalk-mut">MOTM</span>
        <select
          value={motm}
          onChange={(e) => setMotm(e.target.value)}
          className={selCls}
        >
          <option value="">— none —</option>
          {roster.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-accent px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-turf-deep disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {isKnockout && (
          <button
            onClick={del}
            className="rounded-md border border-red-500/30 px-3 py-1.5 font-mono text-xs uppercase text-red-300 hover:bg-red-500/10"
          >
            Delete
          </button>
        )}
        {msg && <span className="font-mono text-xs text-chalk-mut">{msg}</span>}
      </div>
    </div>
  );
}

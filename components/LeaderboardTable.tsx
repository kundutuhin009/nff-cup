"use client";

import { useMemo } from "react";
import SortableTH from "@/components/SortableTH";
import type { LeaderboardRow } from "@/lib/leaderboard";
import { byNumber, byText, useSortable, type Comparator } from "@/lib/useSortable";

// Rows arrive pre-sorted by score desc; that is the default (cleared) order.
interface RankedRow extends LeaderboardRow {
  __rank: number;
}

const COMPARATORS: Record<string, Comparator<RankedRow>> = {
  player: byText((r) => r.full_name),
  goals: byNumber((r) => r.goals),
  assists: byNumber((r) => r.assists),
  score: byNumber((r) => r.score),
};

export default function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  const ranked = useMemo<RankedRow[]>(
    () => rows.map((r, i) => ({ ...r, __rank: i + 1 })),
    [rows]
  );
  const sortable = useSortable(ranked, COMPARATORS);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="font-mono text-[10px] text-chalk-mut">
            <th scope="col" className="py-2 pr-2 text-left">
              #
            </th>
            <SortableTH label="Player" sortKey="player" sortable={sortable} className="py-2 pr-2" />
            <th scope="col" className="py-2 pr-2 text-left uppercase tracking-widest">
              Team
            </th>
            <SortableTH label="G" sortKey="goals" sortable={sortable} align="center" className="px-1" />
            <SortableTH label="A" sortKey="assists" sortable={sortable} align="center" className="px-1" />
            <SortableTH label="Pts" sortKey="score" sortable={sortable} align="center" className="px-1 text-accent" />
          </tr>
        </thead>
        <tbody className="font-mono">
          {sortable.sortedRows.map((r) => (
            <tr key={r.registration_id} className="border-t border-turf-line">
              <td className="py-2 pr-2 text-chalk-mut">{r.__rank}</td>
              <td className="py-2 pr-2 font-sans">{r.full_name}</td>
              <td className="py-2 pr-2 font-sans text-chalk-mut">
                {r.team_name ?? "—"}
              </td>
              <td className="px-1 text-center">{r.goals}</td>
              <td className="px-1 text-center">{r.assists}</td>
              <td className="px-1 text-center font-bold text-accent">{r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

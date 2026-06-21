"use client";

import { useMemo } from "react";
import SortableTH from "@/components/SortableTH";
import type { GoalkeeperRow } from "@/lib/goalkeepers";
import { byNumber, byText, useSortable, type Comparator } from "@/lib/useSortable";

// Rows arrive pre-sorted by the GK ranking; that is the default (cleared) order.
interface RankedRow extends GoalkeeperRow {
  __rank: number;
}

const COMPARATORS: Record<string, Comparator<RankedRow>> = {
  goalkeeper: byText((r) => r.full_name),
  clean_sheets: byNumber((r) => r.clean_sheets),
  goals_conceded: byNumber((r) => r.goals_conceded),
  matches_played: byNumber((r) => r.matches_played),
};

export default function GoalkeeperTable({ rows }: { rows: GoalkeeperRow[] }) {
  const ranked = useMemo<RankedRow[]>(
    () => rows.map((r, i) => ({ ...r, __rank: i + 1 })),
    [rows]
  );
  const sortable = useSortable(ranked, COMPARATORS);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="font-mono text-[10px] text-zinc-500">
            <th scope="col" className="py-2 pr-2 text-left">
              #
            </th>
            <SortableTH label="Goalkeeper" sortKey="goalkeeper" sortable={sortable} className="py-2 pr-2" />
            <th scope="col" className="py-2 pr-2 text-left uppercase tracking-widest">
              Team
            </th>
            <SortableTH label="CS" sortKey="clean_sheets" sortable={sortable} align="center" className="px-1 text-lime" />
            <SortableTH label="GC" sortKey="goals_conceded" sortable={sortable} align="center" className="px-1" />
            <SortableTH label="MP" sortKey="matches_played" sortable={sortable} align="center" className="px-1" />
          </tr>
        </thead>
        <tbody className="font-mono">
          {sortable.sortedRows.map((r) => (
            <tr key={r.registration_id} className="border-t border-white/5">
              <td className="py-2 pr-2 text-zinc-500">{r.__rank}</td>
              <td className="py-2 pr-2 font-sans">{r.full_name}</td>
              <td className="py-2 pr-2 font-sans text-zinc-400">
                {r.team_name ?? "—"}
              </td>
              <td className="px-1 text-center font-bold text-lime">{r.clean_sheets}</td>
              <td className="px-1 text-center">{r.goals_conceded}</td>
              <td className="px-1 text-center">{r.matches_played}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

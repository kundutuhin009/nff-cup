"use client";

import { useMemo } from "react";
import SortableTH from "@/components/SortableTH";
import type { StandingRow } from "@/lib/standings";
import { byNumber, byText, useSortable, type Comparator } from "@/lib/useSortable";

// Row decorated with its TRUE league position (from the incoming, already
// league-sorted order) so rank + "advancing" highlight stay correct even when
// the viewer sorts the table by a different column.
interface RankedRow extends StandingRow {
  __rank: number;
  __advancing: boolean;
}

const COMPARATORS: Record<string, Comparator<RankedRow>> = {
  team: byText((r) => r.name),
  played: byNumber((r) => r.played),
  won: byNumber((r) => r.won),
  drawn: byNumber((r) => r.drawn),
  lost: byNumber((r) => r.lost),
  gf: byNumber((r) => r.gf),
  ga: byNumber((r) => r.ga),
  gd: byNumber((r) => r.gd),
  points: byNumber((r) => r.points),
};

export default function StandingsTable({
  rows,
  mini = false,
}: {
  rows: StandingRow[];
  mini?: boolean;
}) {
  // `rows` arrive in league-position order; capture rank before any view sort.
  const ranked = useMemo<RankedRow[]>(
    () =>
      rows.map((r, i) => ({ ...r, __rank: i + 1, __advancing: i < 2 })),
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
            <SortableTH label="Team" sortKey="team" sortable={sortable} className="py-2 pr-2" />
            <SortableTH label="P" sortKey="played" sortable={sortable} align="center" className="px-1" />
            {!mini && <SortableTH label="W" sortKey="won" sortable={sortable} align="center" className="px-1" />}
            {!mini && <SortableTH label="D" sortKey="drawn" sortable={sortable} align="center" className="px-1" />}
            {!mini && <SortableTH label="L" sortKey="lost" sortable={sortable} align="center" className="px-1" />}
            {!mini && <SortableTH label="GF" sortKey="gf" sortable={sortable} align="center" className="px-1" />}
            {!mini && <SortableTH label="GA" sortKey="ga" sortable={sortable} align="center" className="px-1" />}
            <SortableTH label="GD" sortKey="gd" sortable={sortable} align="center" className="px-1" />
            <SortableTH label="Pts" sortKey="points" sortable={sortable} align="center" className="px-1 text-lime" />
          </tr>
        </thead>
        <tbody className="font-mono">
          {sortable.sortedRows.map((r) => (
            <tr
              key={r.team_id}
              className={[
                "border-t border-white/5",
                r.__advancing ? "text-zinc-100" : "text-zinc-400",
              ].join(" ")}
            >
              <td className="py-2 pr-2">
                <span className={r.__advancing ? "text-lime" : "text-zinc-600"}>
                  {r.__rank}
                </span>
              </td>
              <td className="py-2 pr-2 font-sans">{r.name}</td>
              <td className="px-1 text-center">{r.played}</td>
              {!mini && <td className="px-1 text-center">{r.won}</td>}
              {!mini && <td className="px-1 text-center">{r.drawn}</td>}
              {!mini && <td className="px-1 text-center">{r.lost}</td>}
              {!mini && <td className="px-1 text-center">{r.gf}</td>}
              {!mini && <td className="px-1 text-center">{r.ga}</td>}
              <td className="px-1 text-center">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="px-1 text-center font-bold text-lime">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

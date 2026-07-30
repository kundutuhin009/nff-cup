"use client";

import { useMemo } from "react";
import SortableTH from "@/components/SortableTH";
import type { StandingRow } from "@/lib/standings";
import { byNumber, byText, useSortable, type Comparator } from "@/lib/useSortable";

// What a finishing position earns in the Gold/Silver format: 1st & 2nd go to
// the gold semis, 3rd drops into a silver qualifier, 4th is out.
type Fate = "gold" | "silver" | "out";

const FATE: Record<Fate, { tag: string; text: string; rank: string; rule: string }> = {
  gold: {
    tag: "Gold SF",
    text: "text-chalk",
    rank: "text-accent",
    rule: "border-l-2 border-l-accent",
  },
  silver: {
    tag: "Silver Q",
    text: "text-chalk",
    rank: "text-chalk",
    rule: "border-l-2 border-l-chalk-mut",
  },
  out: {
    tag: "Out",
    text: "text-chalk-mut",
    rank: "text-chalk-mut",
    rule: "border-l-2 border-l-transparent",
  },
};

const fateFor = (rank: number): Fate =>
  rank <= 2 ? "gold" : rank === 3 ? "silver" : "out";

// Row decorated with its TRUE league position (from the incoming, already
// league-sorted order) so rank + qualification marks stay correct even when
// the viewer sorts the table by a different column.
interface RankedRow extends StandingRow {
  __rank: number;
  __fate: Fate;
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
      rows.map((r, i) => ({ ...r, __rank: i + 1, __fate: fateFor(i + 1) })),
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
            <SortableTH label="Team" sortKey="team" sortable={sortable} className="py-2 pr-2" />
            <SortableTH label="P" sortKey="played" sortable={sortable} align="center" className="px-1" />
            {!mini && <SortableTH label="W" sortKey="won" sortable={sortable} align="center" className="px-1" />}
            {!mini && <SortableTH label="D" sortKey="drawn" sortable={sortable} align="center" className="px-1" />}
            {!mini && <SortableTH label="L" sortKey="lost" sortable={sortable} align="center" className="px-1" />}
            {!mini && <SortableTH label="GF" sortKey="gf" sortable={sortable} align="center" className="px-1" />}
            {!mini && <SortableTH label="GA" sortKey="ga" sortable={sortable} align="center" className="px-1" />}
            <SortableTH label="GD" sortKey="gd" sortable={sortable} align="center" className="px-1" />
            <SortableTH label="Pts" sortKey="points" sortable={sortable} align="center" className="px-1 text-accent" />
          </tr>
        </thead>
        <tbody className="font-mono">
          {sortable.sortedRows.map((r) => {
            const fate = FATE[r.__fate];
            return (
            <tr
              key={r.team_id}
              className={["border-t border-turf-line", fate.text].join(" ")}
            >
              <td className={`py-2 pr-2 ${fate.rule}`}>
                <span className={`pl-1.5 ${fate.rank}`}>{r.__rank}</span>
              </td>
              <td className="py-2 pr-2 font-sans">
                {r.name}
                {/* The mini table (home page) stays bare — tags would crowd it. */}
                {!mini && (
                  <span
                    className={`ml-2 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                      r.__fate === "gold"
                        ? "bg-accent-soft text-accent"
                        : r.__fate === "silver"
                        ? "bg-turf-deep text-chalk-mut"
                        : "text-chalk-mut/60"
                    }`}
                  >
                    {fate.tag}
                  </span>
                )}
              </td>
              <td className="px-1 text-center">{r.played}</td>
              {!mini && <td className="px-1 text-center">{r.won}</td>}
              {!mini && <td className="px-1 text-center">{r.drawn}</td>}
              {!mini && <td className="px-1 text-center">{r.lost}</td>}
              {!mini && <td className="px-1 text-center">{r.gf}</td>}
              {!mini && <td className="px-1 text-center">{r.ga}</td>}
              <td className="px-1 text-center">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="px-1 text-center font-bold text-accent">{r.points}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

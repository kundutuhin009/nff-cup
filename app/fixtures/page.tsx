import MatchRow from "@/components/MatchRow";
import { Panel, PanelTitle } from "@/components/Panel";
import StandingsTable from "@/components/StandingsTable";
import { getMatches, getTeams } from "@/lib/publicData";
import { standingsByGroup } from "@/lib/standings";
import type { Match, RoundLabel } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROUND_TITLES: Record<RoundLabel, string> = {
  SF1: "Semi-final 1 · A1 vs B2",
  SF2: "Semi-final 2 · B1 vs A2",
  "3RD": "3rd-place playoff",
  FINAL: "Final",
};
const ROUND_ORDER: RoundLabel[] = ["SF1", "SF2", "3RD", "FINAL"];

export default async function FixturesPage() {
  const [teams, matches] = await Promise.all([getTeams(), getMatches()]);

  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  const teamName = (id: string | null) =>
    id ? nameById.get(id) ?? "—" : "TBD";

  const groupA = standingsByGroup(teams, matches, "A");
  const groupB = standingsByGroup(teams, matches, "B");

  const groupMatches = (g: "A" | "B"): Match[] =>
    matches.filter((m) => m.stage === "group" && m.group_label === g);

  const knockoutByRound = (r: RoundLabel): Match | undefined =>
    matches.find((m) => m.stage === "knockout" && m.round_label === r);

  return (
    <main className="space-y-5">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-lime">
        Fixtures
      </h1>

      {/* Standings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <PanelTitle>Group A · Table</PanelTitle>
          <StandingsTable rows={groupA} />
        </Panel>
        <Panel>
          <PanelTitle>Group B · Table</PanelTitle>
          <StandingsTable rows={groupB} />
        </Panel>
      </div>

      {/* Group fixtures */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["A", "B"] as const).map((g) => {
          const ms = groupMatches(g);
          return (
            <Panel key={g}>
              <PanelTitle>Group {g} · Fixtures</PanelTitle>
              {ms.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Fixtures not generated yet.
                </p>
              ) : (
                <div>
                  {ms.map((m) => (
                    <MatchRow key={m.id} match={m} teamName={teamName} />
                  ))}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {/* Knockout bracket */}
      <Panel>
        <PanelTitle>Knockout Bracket</PanelTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROUND_ORDER.map((r) => {
            const m = knockoutByRound(r);
            return (
              <div
                key={r}
                className="rounded-lg border border-white/5 bg-pitch/50 p-3"
              >
                <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {ROUND_TITLES[r]}
                </div>
                {m ? (
                  <MatchRow match={m} teamName={teamName} />
                ) : (
                  <div className="py-2.5 text-center text-sm text-zinc-600">
                    Awaiting teams
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </main>
  );
}

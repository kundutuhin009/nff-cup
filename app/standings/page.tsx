import { Panel, PanelTitle } from "@/components/Panel";
import StandingsTable from "@/components/StandingsTable";
import { getMatches, getTeams } from "@/lib/publicData";
import { standingsByGroup } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const [teams, matches] = await Promise.all([getTeams(), getMatches()]);
  const groupA = standingsByGroup(teams, matches, "A");
  const groupB = standingsByGroup(teams, matches, "B");

  return (
    <main className="space-y-5">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-accent">
        Standings
      </h1>
      <p className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
        <span className="text-accent">Top 2 → Gold semis</span> · 3rd → Silver
        qualifier · 4th out · Win 3 · Draw 1
      </p>

      <Panel>
        <PanelTitle>Group A</PanelTitle>
        <StandingsTable rows={groupA} />
      </Panel>
      <Panel>
        <PanelTitle>Group B</PanelTitle>
        <StandingsTable rows={groupB} />
      </Panel>
    </main>
  );
}

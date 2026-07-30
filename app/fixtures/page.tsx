import BracketMatch, { TrackHeading } from "@/components/BracketMatch";
import MatchRow from "@/components/MatchRow";
import { Panel, PanelTitle } from "@/components/Panel";
import StandingsTable from "@/components/StandingsTable";
import { goldRounds, silverRounds } from "@/lib/bracket";
import { getMatches, getTeams } from "@/lib/publicData";
import { standingsByGroup } from "@/lib/standings";
import type { Match, RoundLabel } from "@/lib/types";

export const dynamic = "force-dynamic";

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
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-accent">
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
                <p className="text-sm text-chalk-mut">
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

      {/* Knockout bracket — two tracks */}
      <Panel>
        <PanelTitle>Knockout Bracket</PanelTitle>
        <div className="space-y-5">
          <div className="space-y-2">
            <TrackHeading track="gold">Gold</TrackHeading>
            <p className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
              Main trophy
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {goldRounds().map((meta) => (
                <BracketMatch
                  key={meta.round}
                  meta={meta}
                  match={knockoutByRound(meta.round)}
                  teamName={teamName}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <TrackHeading track="silver">Silver</TrackHeading>
            <p className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
              Consolation trophy
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {silverRounds().map((meta) => (
                <BracketMatch
                  key={meta.round}
                  meta={meta}
                  match={knockoutByRound(meta.round)}
                  teamName={teamName}
                />
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </main>
  );
}

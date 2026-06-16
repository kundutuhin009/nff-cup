import { Panel, PanelTitle, StatTile } from "@/components/Panel";
import StandingsTable from "@/components/StandingsTable";
import {
  getCounts,
  getMatches,
  getPublicPlayers,
  getTeams,
  getUpdates,
} from "@/lib/publicData";
import { standingsByGroup } from "@/lib/standings";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HomePage() {
  const [teams, matches, players, updates] = await Promise.all([
    getTeams(),
    getMatches(),
    getPublicPlayers(),
    getUpdates(),
  ]);
  const counts = await getCounts(players);

  const groupA = standingsByGroup(teams, matches, "A");
  const groupB = standingsByGroup(teams, matches, "B");

  return (
    <main className="space-y-5">
      {/* Hero scoreboard */}
      <div className="rounded-xl border border-lime/20 bg-gradient-to-b from-panel to-pitch p-6 text-center">
        <h1 className="font-display text-4xl font-bold uppercase tracking-widest text-lime sm:text-5xl">
          NFF Cup
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-zinc-400">
          8 Teams · 2 Groups · One Trophy
        </p>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Registered" value={counts.registered} />
        <StatTile label="Paid" value={counts.paid} />
        <StatTile label="Drafted" value={counts.drafted} />
      </div>

      {/* Updates feed */}
      <Panel>
        <PanelTitle>Announcements</PanelTitle>
        {updates.length === 0 ? (
          <p className="text-sm text-zinc-500">No announcements yet.</p>
        ) : (
          <ul className="space-y-3">
            {updates.map((u) => (
              <li
                key={u.id}
                className="border-l-2 border-lime/40 pl-3 text-sm text-zinc-200"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {formatDate(u.created_at)}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{u.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Mini standings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <PanelTitle>Group A</PanelTitle>
          <StandingsTable rows={groupA} mini />
        </Panel>
        <Panel>
          <PanelTitle>Group B</PanelTitle>
          <StandingsTable rows={groupB} mini />
        </Panel>
      </div>
    </main>
  );
}

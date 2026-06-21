import AnnouncementsCarousel from "@/components/AnnouncementsCarousel";
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
import { TOURNAMENT_NAME, VENUE_NAME, VENUE_MAPS_URL } from "@/lib/tournament";

export const dynamic = "force-dynamic";

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
      {/* Hero scoreboard — chalk title under an amber floodlight glow */}
      <div className="floodlight pitch-marks relative overflow-hidden rounded-xl border border-turf-line bg-gradient-to-b from-turf-panel to-turf-deep p-8 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-chalk sm:text-4xl">
          {TOURNAMENT_NAME}
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-chalk-mut">
          8 Teams · 2 Groups · <span className="text-accent">One Trophy</span>
        </p>
        <a
          href={VENUE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>
            Venue: <span className="underline decoration-dotted">{VENUE_NAME}</span>
          </span>
        </a>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Registered" value={counts.registered} />
        <StatTile label="Paid" value={counts.paid} />
        <StatTile label="Drafted" value={counts.drafted} />
      </div>

      {/* Updates feed — auto-rotating carousel */}
      <Panel>
        <PanelTitle>Announcements</PanelTitle>
        <AnnouncementsCarousel updates={updates} />
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

import { finalOutcome, type Track } from "@/lib/bracket";
import type { Match, RoundLabel } from "@/lib/types";

// Headline result of the tournament. Each trophy stays in a "to be decided"
// state until its final has been played with a decisive score — derived
// straight from the GFINAL / SFINAL rows, no extra query.
export default function Champions({
  matches,
  teamName,
}: {
  matches: Match[];
  teamName: (id: string | null) => string;
}) {
  const trophies: Array<{
    track: Track;
    round: RoundLabel;
    title: string;
    caption: string;
  }> = [
    {
      track: "gold",
      round: "GFINAL",
      title: "Gold Champion",
      caption: "Winner of the Gold Final",
    },
    {
      track: "silver",
      round: "SFINAL",
      title: "Silver Champion",
      caption: "Winner of the Silver Final",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {trophies.map(({ track, round, title, caption }) => {
        const { winner, runnerUp } = finalOutcome(matches, round);
        const gold = track === "gold";

        return (
          <div
            key={round}
            className={`relative overflow-hidden rounded-xl border p-5 text-center ${
              gold
                ? "border-accent/50 bg-gradient-to-b from-accent-soft to-turf-panel shadow-lg shadow-black/30"
                : "border-turf-line bg-gradient-to-b from-turf-panel to-turf-deep"
            }`}
          >
            <Trophy gold={gold} decided={Boolean(winner)} />

            <div
              className={`mt-2 font-mono text-[10px] uppercase tracking-[0.3em] ${
                gold ? "text-accent" : "text-chalk-mut"
              }`}
            >
              {title}
            </div>

            {winner ? (
              <>
                <div
                  className={`mt-1.5 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl ${
                    gold ? "text-accent" : "text-chalk"
                  }`}
                >
                  {teamName(winner)}
                </div>
                {runnerUp && (
                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
                    Runner-up · {teamName(runnerUp)}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mt-1.5 font-display text-2xl uppercase tracking-wide text-chalk-mut sm:text-3xl">
                  To be decided
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
                  {caption}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Trophy({ gold, decided }: { gold: boolean; decided: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="30"
      height="30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`mx-auto ${
        gold ? "text-accent" : "text-chalk-mut"
      } ${decided ? "" : "opacity-40"}`}
    >
      <path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0V4Z" />
      <path d="M6 6H4a3 3 0 0 0 3 3M18 6h2a3 3 0 0 1-3 3" />
    </svg>
  );
}

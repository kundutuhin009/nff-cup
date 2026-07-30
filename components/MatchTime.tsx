// Kickoff time badge. Renders nothing when no time is set, so untimed
// fixtures stay uncluttered and the row layout is unchanged.
export default function MatchTime({
  time,
  className = "",
}: {
  time: string | null | undefined;
  className?: string;
}) {
  const label = time?.trim();
  if (!label) return null;

  return (
    <span
      className={`inline-block whitespace-nowrap rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums tracking-wide text-accent ${className}`}
    >
      {label}
    </span>
  );
}

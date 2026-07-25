"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import type { Registration } from "@/lib/types";

// Marquee players are drawn/auctioned separately, so they're kept OFF the
// "who's next" wheel. Matched case-insensitively on the trimmed full name; a
// name here that isn't in the pool is simply skipped (never an error).
//
// "dd" is how Dhiman Dey is actually registered in the pool (the spec pairs
// "dd"/"Dhiman Dey"), so it's listed as an alias — otherwise a marquee player
// would leak onto the randomizer. Add future aliases here the same way.
const MARQUEE_NAMES = [
  "Dhiman Dey",
  "dd",
  "Abhishek Halder",
  "Rahool Dey",
  "Supratim Das",
  "Archisman Halder",
  "Arjun Lal",
  "Darpan bose",
  "Abhishek Chhetri",
];

const norm = (s: string) => s.trim().toLowerCase();

interface WheelPlayer {
  id: string;
  name: string;
  photo: string | null;
  position: string | null;
}

// Position tint for the reveal pill — reads at a glance on a shared screen.
// Falls back to muted chalk for an unknown/null position.
const POSITION_PILL: Record<string, string> = {
  Goalkeeper: "bg-amber-400/15 text-amber-300 border-amber-400/40",
  Defender: "bg-sky-400/15 text-sky-300 border-sky-400/40",
  Midfielder: "bg-emerald-400/15 text-emerald-300 border-emerald-400/40",
  Forward: "bg-rose-400/15 text-rose-300 border-rose-400/40",
};

// Alternating segment fills (turf greens); the winning slice under the pointer
// is highlighted amber at render time.
const SLICE_A = "#11281a"; // turf-panel
const SLICE_B = "#0c1f14"; // turf-deep

const TAU = Math.PI * 2;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Point on the wheel rim at `deg` measured CLOCKWISE from the top (12 o'clock).
function rimPoint(cx: number, cy: number, r: number, deg: number) {
  const a = (deg / 360) * TAU;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

export default function WheelPage() {
  // Seeded once from the loaded players; `remaining` is the live wheel.
  const [all, setAll] = useState<WheelPlayer[]>([]);
  const [remaining, setRemaining] = useState<WheelPlayer[]>([]);
  const [result, setResult] = useState<WheelPlayer | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The wheel is rotated by mutating the <g> transform directly during the
  // animation (via ref) so we don't re-render 40+ SVG slices every frame.
  const wheelRef = useRef<SVGGElement>(null);
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { registrations } = await adminFetch<{
          registrations: Registration[];
        }>("/api/admin/registrations");
        if (!alive) return;
        const marquee = new Set(MARQUEE_NAMES.map(norm));
        // Same set as the auction pool — playing gk/player regs — minus the
        // marquee names. Paid status is irrelevant here (draw-order only).
        const players = registrations
          .filter((r) => r.reg_type === "gk" || r.reg_type === "player")
          .filter((r) => !marquee.has(norm(r.full_name)))
          .map((r) => ({
            id: r.id,
            name: r.full_name,
            photo: r.photo_base64,
            position: r.position,
          }));
        setAll(players);
        setRemaining(players);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const n = remaining.length;
  const seg = n > 0 ? 360 / n : 0;

  // Index the pointer (fixed at top) currently sits over, for the amber
  // highlight. Derived from the committed rotation, not the in-flight one.
  const [pointerIdx, setPointerIdx] = useState<number | null>(null);

  const finish = useCallback(
    (rotation: number, landedIndex: number) => {
      rotationRef.current = rotation;
      setPointerIdx(landedIndex);
      setResult(remaining[landedIndex] ?? null);
      setSpinning(false);
    },
    [remaining]
  );

  const spin = useCallback(() => {
    if (spinning || n === 0) return;
    setSpinning(true);
    setResult(null);
    setPointerIdx(null);

    const target = Math.floor(Math.random() * n); // uniform over remaining
    const midLocal = target * seg + seg / 2;
    // Land the target's middle under the top pointer, with a little in-slice
    // jitter so it doesn't always stop dead-centre.
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const desiredMod = (((-(midLocal + jitter)) % 360) + 360) % 360;
    const curMod = ((rotationRef.current % 360) + 360) % 360;
    const deltaForward = (((desiredMod - curMod) % 360) + 360) % 360;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const turns = reduce ? 0 : 5;
    const duration = reduce ? 320 : 4200;

    const from = rotationRef.current;
    const to = from + turns * 360 + deltaForward;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const cur = from + (to - from) * easeOutCubic(t);
      wheelRef.current?.setAttribute("transform", `rotate(${cur} 300 300)`);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        finish(to, target);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [spinning, n, seg, finish]);

  // "Called up" — drop the revealed player and ready the next spin.
  const done = useCallback(() => {
    if (!result) return;
    setRemaining((rs) => rs.filter((p) => p.id !== result.id));
    setResult(null);
    setPointerIdx(null);
  }, [result]);

  const reset = useCallback(() => {
    if (spinning) return;
    if (!confirm(`Reset the wheel to all ${all.length} players?`)) return;
    setRemaining(all);
    setResult(null);
    setPointerIdx(null);
    rotationRef.current = 0;
    wheelRef.current?.setAttribute("transform", "rotate(0 300 300)");
  }, [all, spinning]);

  if (loading)
    return <p className="font-mono text-sm text-chalk-mut">Loading…</p>;
  if (error) return <p className="text-sm text-red-300">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg uppercase tracking-wide text-accent">
          Who&apos;s Next
        </h2>
        <p className="font-mono text-xs text-chalk-mut">
          {n} of {all.length} remaining
        </p>
      </div>

      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_34rem]">
        {/* Wheel */}
        <div className="mx-auto w-full max-w-[36rem]">
          {n === 0 ? (
            <div className="flex aspect-square items-center justify-center rounded-full border-2 border-dashed border-turf-line text-center">
              <p className="px-8 font-display text-xl uppercase tracking-wide text-chalk-mut">
                All players called — hit Reset to start over.
              </p>
            </div>
          ) : (
            <Wheel
              remaining={remaining}
              seg={seg}
              wheelRef={wheelRef}
              pointerIdx={pointerIdx}
            />
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              onClick={spin}
              disabled={spinning || n === 0}
              className="rounded-md bg-accent px-8 py-3 font-display text-xl font-bold uppercase tracking-wide text-turf-deep disabled:opacity-40"
            >
              {spinning ? "Spinning…" : "Spin"}
            </button>
            <button
              onClick={done}
              disabled={!result || spinning}
              className="rounded-md border border-accent/40 px-6 py-3 font-display text-base uppercase tracking-wide text-accent hover:bg-accent/10 disabled:opacity-30"
            >
              Done
            </button>
            <button
              onClick={reset}
              disabled={spinning || all.length === 0}
              className="rounded-md border border-turf-line px-6 py-3 font-display text-base uppercase tracking-wide text-chalk hover:border-accent hover:text-accent disabled:opacity-30"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Reveal */}
        <div className="rounded-2xl border border-turf-line bg-turf-panel p-5 text-center">
          {result ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                Up next
              </p>
              {/* Sized off viewport height so the face is big on a shared
                  screen, capped so the card never forces the page to scroll. */}
              <div className="relative mx-auto mt-3 aspect-square w-[min(56vh,30rem)] max-w-full overflow-hidden rounded-xl bg-turf-deep">
                {result.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.photo}
                    alt={result.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-7xl text-turf-line">
                    {result.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Static sponsor badge, pinned to a corner over the photo.
                    Swap /friends-fm-919.svg for the official logo at the same
                    path — no code change needed. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/friends-fm-919.svg"
                  alt="Friends FM 91.9"
                  className="absolute bottom-2 right-2 w-[30%] max-w-[8.5rem] rounded-md shadow-md"
                />
              </div>
              <p className="mt-4 font-display text-4xl font-bold uppercase leading-tight tracking-wide text-chalk">
                {result.name}
              </p>
              {result.position && (
                <span
                  className={`mt-3 inline-block rounded-full border px-4 py-1 font-display text-base uppercase tracking-wide ${
                    POSITION_PILL[result.position] ??
                    "border-turf-line bg-turf-deep text-chalk-mut"
                  }`}
                >
                  {result.position}
                </span>
              )}
            </>
          ) : (
            <p className="py-16 font-display text-lg uppercase tracking-wide text-chalk-mut">
              {spinning ? "…" : "Spin to pick who's up next"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Read-only SVG wheel. The rotating <g> is mutated by ref during a spin, so
// this only re-renders when the roster changes (draw/reset), not per frame.
function Wheel({
  remaining,
  seg,
  wheelRef,
  pointerIdx,
}: {
  remaining: WheelPlayer[];
  seg: number;
  wheelRef: React.RefObject<SVGGElement>;
  pointerIdx: number | null;
}) {
  const n = remaining.length;
  // Font shrinks as slices get thinner so labels don't collide with neighbours.
  const fontSize = Math.max(7, Math.min(17, (seg / 8.4) * 15));
  const labelMax = n > 30 ? 14 : 20;

  return (
    <div className="relative">
      <svg viewBox="0 0 600 600" className="w-full" role="img" aria-label="Player wheel">
        <g ref={wheelRef} transform="rotate(0 300 300)">
          <circle cx={300} cy={300} r={290} fill={SLICE_B} />
          {n === 1 ? (
            <circle cx={300} cy={300} r={288} fill={SLICE_A} />
          ) : (
            remaining.map((p, i) => {
              const a0 = i * seg;
              const a1 = (i + 1) * seg;
              const p0 = rimPoint(300, 300, 288, a0);
              const p1 = rimPoint(300, 300, 288, a1);
              const large = seg > 180 ? 1 : 0;
              const fill =
                i === pointerIdx
                  ? "#f5a623"
                  : i % 2 === 0
                    ? SLICE_A
                    : SLICE_B;
              return (
                <path
                  key={p.id}
                  d={`M300 300 L${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A288 288 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`}
                  fill={fill}
                  stroke="#2a4a36"
                  strokeWidth={1}
                />
              );
            })
          )}
          {/* Labels: radial, flipped on the left half so none read upside down. */}
          {remaining.map((p, i) => {
            const mid = i * seg + seg / 2;
            const flip = mid > 180 && mid < 360;
            const rmid = 165;
            const won = i === pointerIdx;
            const label =
              p.name.length > labelMax
                ? p.name.slice(0, labelMax - 1) + "…"
                : p.name;
            return (
              <g key={p.id} transform={`rotate(${mid - 90} 300 300)`}>
                <text
                  x={300 + rmid}
                  y={300}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={flip ? `rotate(180 ${300 + rmid} 300)` : undefined}
                  fontSize={fontSize}
                  fontWeight={won ? 700 : 500}
                  fill={won ? "#0c1f14" : "#f4f7f2"}
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  {label}
                </text>
              </g>
            );
          })}
          <circle cx={300} cy={300} r={30} fill="#11281a" stroke="#f5a623" strokeWidth={2} />
        </g>
        {/* Fixed pointer at the top, pointing into the wheel. */}
        <path d="M300 18 L284 -14 L316 -14 Z" fill="#f5a623" transform="translate(0 20)" />
      </svg>
    </div>
  );
}

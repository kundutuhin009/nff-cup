"use client";

import { useCallback, useEffect, useState } from "react";
import type { Update } from "@/lib/types";

const AUTO_ADVANCE_MS = 5000;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Fisher–Yates — returns a new shuffled array (pure).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// One announcement's content — shared by the static and carousel layouts.
function Slide({ u }: { u: Update }) {
  return (
    <>
      <div className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
        {formatDate(u.created_at)}
      </div>
      {u.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={u.image_url}
          alt={u.body ?? "Announcement"}
          loading="lazy"
          className="mt-2 min-h-0 w-full flex-1 rounded-lg border border-turf-line bg-turf-deep object-contain"
        />
      )}
      {u.body && (
        <p
          className={`mt-2 overflow-auto whitespace-pre-wrap text-sm text-chalk ${
            u.image_url ? "" : "flex-1"
          }`}
        >
          {u.body}
        </p>
      )}
    </>
  );
}

export default function AnnouncementsCarousel({
  updates,
}: {
  updates: Update[];
}) {
  // Start in the server-provided order to avoid a hydration mismatch, then
  // shuffle once on the client (stable for the life of this page view).
  const [order, setOrder] = useState<Update[]>(updates);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setOrder(shuffle(updates));
    setIndex(0);
  }, [updates]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const count = order.length;
  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  // Auto-advance — disabled on hover-pause, reduced motion, or a single slide.
  useEffect(() => {
    if (reduced || paused || count <= 1) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % count),
      AUTO_ADVANCE_MS
    );
    return () => clearInterval(id);
  }, [reduced, paused, count]);

  if (count === 0) {
    return <p className="text-sm text-chalk-mut">No announcements yet.</p>;
  }

  // A carousel of one is silly — show it statically, no controls/animation.
  if (count === 1) {
    return (
      <div className="flex flex-col border-l-2 border-accent/40 pl-3">
        <Slide u={order[0]} />
      </div>
    );
  }

  const fade = reduced ? "" : "transition-opacity duration-500 ease-in-out";

  return (
    <div
      aria-label="Announcements"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Fixed slot so the page doesn't jump as items of different heights rotate */}
      <div className="relative h-64 sm:h-72">
        {order.map((u, i) => (
          <div
            key={u.id}
            aria-hidden={i !== index}
            className={`absolute inset-0 flex flex-col border-l-2 border-accent/40 pl-3 ${fade} ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Slide u={u} />
          </div>
        ))}

        {/* Prev / Next */}
        <button
          type="button"
          aria-label="Previous announcement"
          onClick={() => go(index - 1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full border border-turf-line bg-turf-deep/80 px-2 py-1 text-accent backdrop-blur transition-colors hover:border-accent hover:bg-turf-deep"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next announcement"
          onClick={() => go(index + 1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full border border-turf-line bg-turf-deep/80 px-2 py-1 text-accent backdrop-blur transition-colors hover:border-accent hover:bg-turf-deep"
        >
          ›
        </button>
      </div>

      {/* Dot indicators */}
      <div className="mt-3 flex justify-center gap-2">
        {order.map((u, i) => (
          <button
            key={u.id}
            type="button"
            aria-label={`Go to announcement ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => go(i)}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === index ? "bg-accent" : "bg-chalk-mut/40 hover:bg-chalk-mut"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

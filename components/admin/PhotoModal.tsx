"use client";

import { useEffect } from "react";

// Enlarged player photo. Mirrors ScreenshotModal's look/behaviour (overlay-click
// + Close button) but renders an already-loaded base64 image — no fetch. Closes
// on overlay click, the Close button, or Esc.
export default function PhotoModal({
  src,
  name,
  caption,
  onClose,
}: {
  src: string | null;
  name: string;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] max-w-lg overflow-auto rounded-xl border border-turf-line bg-turf-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg uppercase tracking-wide text-accent">
              {name}
            </h3>
            {caption && (
              <p className="font-mono text-[10px] uppercase tracking-widest text-chalk-mut">
                {caption}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 font-mono text-xs uppercase text-chalk-mut hover:text-accent"
          >
            Close
          </button>
        </div>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="w-full rounded-md" />
        ) : (
          <p className="text-sm text-chalk-mut">No photo available.</p>
        )}
      </div>
    </div>
  );
}

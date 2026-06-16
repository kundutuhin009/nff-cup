"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";

// Lazy-loads a payment screenshot only when opened.
export default function ScreenshotModal({
  registrationId,
  playerName,
  onClose,
}: {
  registrationId: string;
  playerName: string;
  onClose: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminFetch<{ screenshot_base64: string }>(
      `/api/admin/registrations/${registrationId}/screenshot`
    )
      .then((d) => active && setSrc(d.screenshot_base64))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [registrationId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] max-w-lg overflow-auto rounded-xl border border-white/10 bg-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg uppercase tracking-wide text-lime">
            {playerName} · Payment
          </h3>
          <button
            onClick={onClose}
            className="font-mono text-xs uppercase text-zinc-400 hover:text-lime"
          >
            Close
          </button>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!src && !error && (
          <p className="text-sm text-zinc-500">Loading…</p>
        )}
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="payment screenshot" className="w-full rounded-md" />
        )}
      </div>
    </div>
  );
}

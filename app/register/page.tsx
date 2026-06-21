"use client";

import { useState } from "react";
import { Panel, PanelTitle } from "@/components/Panel";
import {
  compressImage,
  ImageTooLargeError,
  type CompressResult,
} from "@/lib/imageCompress";
import {
  FOOD_PREFS,
  PLAYER_POSITIONS,
  POSITIONS,
  REG_TYPES,
  REG_TYPE_LABELS,
  type FoodPref,
  type Position,
  type RegType,
} from "@/lib/types";
import { feeFor } from "@/lib/pricing";

type ImgState = { result: CompressResult | null; error: string | null; busy: boolean };
const emptyImg: ImgState = { result: null, error: null, busy: false };

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [regType, setRegType] = useState<RegType>("player");
  const [isPlaying, setIsPlaying] = useState(true);
  const [position, setPosition] = useState<Position>("Midfielder");
  const [foodPref, setFoodPref] = useState<FoodPref>("Veg");
  const [photo, setPhoto] = useState<ImgState>(emptyImg);
  const [payment, setPayment] = useState<ImgState>(emptyImg);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fee is derived from the registration type (server recomputes & stores it).
  const fee = feeFor(regType);

  // Position rules depend on reg_type (and, for owners, the playing toggle):
  //  - gk            -> locked to Goalkeeper
  //  - player        -> Defender/Midfielder/Forward only (no GK tier)
  //  - playing owner -> any of the four
  //  - non-playing owner -> no on-pitch position (field hidden, submit null)
  const positionHidden = regType === "owner" && !isPlaying;
  const positionLocked = regType === "gk";
  const positionOptions: Position[] =
    regType === "gk"
      ? ["Goalkeeper"]
      : regType === "player"
        ? PLAYER_POSITIONS
        : POSITIONS;

  // Picking a registration type adjusts dependent fields immediately:
  function chooseRegType(next: RegType) {
    setRegType(next);
    if (next === "gk") {
      setPosition("Goalkeeper");
    } else if (next === "player") {
      // A player cannot be the GK tier — drop Goalkeeper to a sane default.
      setPosition((p) => (p === "Goalkeeper" ? "Midfielder" : p));
    }
    if (next !== "owner") setIsPlaying(true);
  }

  async function handleImage(
    file: File | undefined,
    setter: (s: ImgState) => void,
    maxWidth: number,
    quality: number,
    targetBytes: number
  ) {
    if (!file) return;
    setter({ result: null, error: null, busy: true });
    try {
      const result = await compressImage(file, { maxWidth, quality }, targetBytes);
      setter({ result, error: null, busy: false });
    } catch (e) {
      const msg =
        e instanceof ImageTooLargeError
          ? "Please use a smaller image."
          : e instanceof Error
            ? e.message
            : "Could not process that image.";
      setter({ result: null, error: msg, busy: false });
    }
  }

  function validate(): string | null {
    if (!fullName.trim()) return "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email.";
    if (!/^\d{10,13}$/.test(whatsapp.trim()))
      return "WhatsApp number must be 10–13 digits.";
    if (!photo.result) return "A player photo is required.";
    if (!payment.result) return "A payment screenshot is required.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          reg_type: regType,
          is_playing: regType === "owner" ? isPlaying : true,
          position: positionHidden ? null : position,
          food_pref: foodPref,
          photo_base64: photo.result!.dataUrl,
          payment_screenshot_base64: payment.result!.dataUrl,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Registration failed. Please try again.");
      }
      setDone(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="space-y-5">
        <Panel className="text-center">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-lime">
            You&apos;re in! ⚽
          </h1>
          <p className="mt-3 text-sm text-zinc-300">
            Registration received. The admin will verify your payment and you&apos;ll
            be entered into the auction pool.
          </p>
        </Panel>
      </main>
    );
  }

  const inputCls =
    "w-full rounded-md border border-white/10 bg-pitch px-3 py-2 text-sm text-zinc-100 outline-none focus:border-lime";
  const labelCls =
    "block font-mono text-[10px] uppercase tracking-widest text-zinc-400";

  return (
    <main className="space-y-5">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-lime">
        Player Registration
      </h1>

      {/* FOOTWEAR DISCLAIMER — prominent */}
      <div className="rounded-xl border-2 border-lime bg-lime/10 p-4">
        <div className="font-display text-lg font-bold uppercase tracking-wide text-lime">
          ⚠ Footwear Rule
        </div>
        <p className="mt-1 text-sm font-semibold text-zinc-100">
          Only joggers or small-guti shoes allowed. NO boots, NO spikes.
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          Strictly enforced — violators will not be allowed to play.
        </p>
      </div>

      <Panel>
        <PanelTitle>Your Details</PanelTitle>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Registration type + live fee */}
          <div className="rounded-lg border border-lime/20 bg-lime/5 p-3">
            <span className={labelCls}>Registration Type *</span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {REG_TYPES.map((rt) => {
                const active = regType === rt;
                return (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => chooseRegType(rt)}
                    className={[
                      "rounded-md border px-2 py-2 text-center text-sm font-semibold transition-colors",
                      active
                        ? "border-lime bg-lime text-pitch"
                        : "border-white/10 bg-pitch text-zinc-200 hover:border-lime/50",
                    ].join(" ")}
                  >
                    <div>{REG_TYPE_LABELS[rt]}</div>
                    <div
                      className={`font-mono text-[10px] ${active ? "text-pitch/70" : "text-zinc-500"}`}
                    >
                      ₹{feeFor(rt)}
                    </div>
                  </button>
                );
              })}
            </div>

            {regType === "owner" && (
              <label className="mt-3 flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={isPlaying}
                  onChange={(e) => setIsPlaying(e.target.checked)}
                  className="h-4 w-4 accent-lime"
                />
                Playing owner? (will take a squad slot)
              </label>
            )}

            <p className="mt-3 font-display text-lg font-bold uppercase tracking-wide text-lime">
              Amount to pay: ₹{fee}
            </p>
          </div>

          <div>
            <label className={labelCls} htmlFor="full_name">
              Full Name *
            </label>
            <input
              id="full_name"
              className={inputCls}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="email">
                Email *
              </label>
              <input
                id="email"
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="whatsapp">
                WhatsApp (10–13 digits) *
              </label>
              <input
                id="whatsapp"
                inputMode="numeric"
                className={inputCls}
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 13))
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="position">
                Position
              </label>
              {positionHidden ? (
                <div className={`${inputCls} text-zinc-500`}>
                  N/A — non-playing
                </div>
              ) : (
                <select
                  id="position"
                  className={`${inputCls} ${positionLocked ? "opacity-60" : ""}`}
                  value={position}
                  disabled={positionLocked}
                  onChange={(e) => setPosition(e.target.value as Position)}
                >
                  {positionOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelCls} htmlFor="food">
                Food Preference
              </label>
              <select
                id="food"
                className={inputCls}
                value={foodPref}
                onChange={(e) => setFoodPref(e.target.value as FoodPref)}
              >
                {FOOD_PREFS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Photo */}
          <ImageField
            id="photo"
            label="Player Photo * (compressed in your browser)"
            state={photo}
            onChange={(f) => handleImage(f, setPhoto, 400, 0.7, 60 * 1024)}
          />

          {/* Payment screenshot */}
          <ImageField
            id="payment"
            label={`Upload your ₹${fee} payment screenshot * (compressed in your browser)`}
            state={payment}
            onChange={(f) => handleImage(f, setPayment, 600, 0.65, 80 * 1024)}
          />

          {formError && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || photo.busy || payment.busy}
            className="w-full rounded-md bg-lime px-4 py-3 font-display text-lg font-bold uppercase tracking-wide text-pitch transition-opacity disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Register"}
          </button>
        </form>
      </Panel>
    </main>
  );
}

function ImageField({
  id,
  label,
  state,
  onChange,
}: {
  id: string;
  label: string;
  state: ImgState;
  onChange: (file: File | undefined) => void;
}) {
  return (
    <div>
      <label
        className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="mt-1 flex items-center gap-3">
        <input
          id={id}
          type="file"
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0])}
          className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-panel file:px-3 file:py-2 file:font-mono file:text-xs file:uppercase file:text-lime"
        />
        {state.result && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.result.dataUrl}
            alt="preview"
            className="h-12 w-12 shrink-0 rounded-md object-cover"
          />
        )}
      </div>
      {state.busy && (
        <p className="mt-1 text-xs text-zinc-500">Compressing…</p>
      )}
      {state.result && (
        <p className="mt-1 font-mono text-[10px] text-zinc-500">
          {(state.result.bytes / 1024).toFixed(0)} KB ready
        </p>
      )}
      {state.error && (
        <p className="mt-1 text-xs text-red-300">{state.error}</p>
      )}
    </div>
  );
}

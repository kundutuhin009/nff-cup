# NFF Cup ⚽

A public-facing web app for an intra 5+2 football tournament run by NFF.
Players register individually, get drafted into 8 teams via an auction, and the
public follows fixtures, standings, the leaderboard, and Man-of-the-Match — all
on their phones.

- **Public pages** (no login): Home/Announcements, Fixtures, Standings, Leaderboard + MOTM, Registration.
- **Admin** (`/admin`, PIN-gated): master player table, auction, results entry, announcements.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** (Postgres + JS client) — no Supabase Auth; admin is PIN-gated
- Deploy target: **Vercel**

## Tournament format

- 8 teams, two groups of 4 (A, B). Round-robin within each group (12 group matches).
- Top 2 of each group advance. SF1 = A1 v B2, SF2 = B1 v A2, then 3rd-place playoff and Final.
- Group points: win 3, draw 1, loss 0. Tiebreak: points → goal difference → goals for → alphabetical.
- Leaderboard score per player = `goals×3 + assists×1 + cleanSheets×3`
  (clean sheets credited only to GKs whose team conceded 0 in a played match).

Standings and the leaderboard are **computed on read** (pure functions in
`lib/standings.ts` and `lib/leaderboard.ts`) — derived totals are never stored.

---

## 1. Supabase setup

1. Create a fresh project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, grab:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret, server only)

### Run the migration

Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.
It creates all tables, the `public_players` view, RLS policies, and seeds 8 empty
teams (Team 1–4 in group A, Team 5–8 in group B).

> Prefer the CLI? With the [Supabase CLI](https://supabase.com/docs/guides/cli)
> linked to your project: `supabase db push` (or `supabase migration up`).

### What RLS enforces

- **anon (public) SELECT** is allowed on `teams`, `matches`, `match_player_stats`,
  `updates`, and the `public_players` view only.
- `public_players` exposes **only** `id, full_name, photo_base64, position, paid, team_name`.
  Email, WhatsApp, and payment screenshots are **never** exposed to anon.
- `registrations` and `payment_screenshots` have **no anon access**.
- **All writes** go through server API routes (`app/api/**`) using the service-role key.

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Anon key (RLS-restricted reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Bypasses RLS — never expose |
| `ADMIN_PIN` | **server only** | Gate for `/api/admin/*` and the `/admin` UI |

The admin PIN is checked server-side against `process.env.ADMIN_PIN` via the
`x-admin-pin` header. The client only ever holds the entered PIN in
`sessionStorage` — it is never bundled into the build.

## 3. Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. Admin lives at http://localhost:3000/admin
(enter your `ADMIN_PIN`).

## 4. Deploy to Vercel

1. Push this folder to a Git repo and import it into Vercel.
2. In **Project → Settings → Environment Variables**, add all four variables above
   (mark `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PIN` as **not** exposed to the browser —
   they are server-only and are never referenced from client code).
3. Deploy. No build configuration needed; Vercel auto-detects Next.js.

---

## Admin workflow

1. **Players** (`/admin`): the master table — every registration, one row each.
   Inline-edit any field, toggle **paid**, set **team**, view payment screenshots
   (lazy-loaded), delete, and **Download CSV** (player details, no images).
   Veg/Non-Veg and paid/unpaid totals sit above the table.
2. **Auction** (`/admin/auction`): live drafting. Pool = paid & unassigned. Tap a
   player, tap a team (max 7). Rename teams, set group A/B. Writes to the same
   `team_players` table as the master table, so the two views never disagree.
3. **Results** (`/admin/results`): generate the 12 group fixtures, enter scores,
   per-player goals & assists, and pick MOTM. Add knockout matches and pick the
   two teams. Standings and the leaderboard recompute automatically.
4. **Updates** (`/admin/updates`): post / delete announcements shown on the home page.

## Image handling

Registration photos and payment screenshots are compressed **in the browser**
(canvas → JPEG) before upload:

- Photo: ~400px wide, q0.7, target ≤60KB
- Payment screenshot: ~600px wide, q0.65, target ≤80KB

Anything that still exceeds **200KB** (base64) is rejected with a friendly
"please use a smaller image" message. Images are stored as base64 text in
Postgres (no separate storage bucket needed for v1).

## Project layout

```
app/
  page.tsx                 Home / announcements / mini standings
  register/                Registration form + footwear disclaimer
  fixtures/                Standings + group fixtures + knockout bracket
  standings/               Full group tables
  leaders/                 Leaderboard + MOTM list
  admin/                   PIN-gated: players, auction, results, updates
  api/
    register/              Public: create a registration
    admin/                 PIN-checked write endpoints
components/                SiteHeader, Panel, tables, admin widgets
lib/
  supabaseClient.ts        Anon, read-only (public pages)
  supabaseServer.ts        Service role (server/API only)
  standings.ts             Pure standings computation
  leaderboard.ts           Pure leaderboard computation
  fixtures.ts              Round-robin fixture generator
  imageCompress.ts         Client-side canvas compression
  adminAuth.ts             Server PIN check
  adminFetch.ts            Client PIN-header fetch wrapper
  csv.ts                   CSV export
  publicData.ts            Public anon reads
supabase/migrations/
  0001_init.sql            Schema, public_players view, RLS, seed teams
```

## Security note

This project pins **Next.js 14.2.35** (the latest patched 14.x). `npm audit` may
still report advisories whose only fix is **Next 16** (a breaking major) — out of
scope for v1, which is committed to the Next 14 line. Revisit when upgrading.

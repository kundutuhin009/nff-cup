-- =====================================================================
-- NFF Cup — initial schema, public_players view, RLS policies, seed teams
-- =====================================================================
-- Conventions:
--   * snake_case everywhere
--   * All WRITES happen server-side via the service-role key (bypasses RLS).
--   * Public pages read via the anon key and may ONLY touch public-safe data.
--   * Derived totals (standings, leaderboard) are NEVER stored — computed on read.
-- =====================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- registrations: one row per individual player who signed up
-- ---------------------------------------------------------------------
create table if not exists public.registrations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  full_name   text not null,
  photo_base64 text,                                   -- client-compressed ~400px JPEG
  email       text not null,
  whatsapp    text not null,                           -- 10–13 digits, validated app-side
  position    text not null check (position in ('Goalkeeper','Defender','Midfielder','Forward')),
  food_pref   text not null check (food_pref in ('Veg','Non-Veg')),
  paid        boolean not null default false           -- set by admin
);

-- ---------------------------------------------------------------------
-- payment_screenshots: split out so player list queries stay light
-- ---------------------------------------------------------------------
create table if not exists public.payment_screenshots (
  registration_id   uuid primary key
                    references public.registrations(id) on delete cascade,
  screenshot_base64 text not null                       -- client-compressed ~600px JPEG
);

-- ---------------------------------------------------------------------
-- teams: 8 teams, two groups of four
-- ---------------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  group_label text not null check (group_label in ('A','B')),
  seed_index  int  not null default 0
);

-- ---------------------------------------------------------------------
-- team_players: single source of truth for team assignment.
-- unique(registration_id) => a player belongs to at most one team;
-- changing the team simply moves the player (upsert on registration_id).
-- Written by BOTH the auction screen and the admin master table.
-- ---------------------------------------------------------------------
create table if not exists public.team_players (
  team_id         uuid not null references public.teams(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  unique (registration_id)
);
create index if not exists team_players_team_id_idx on public.team_players(team_id);

-- ---------------------------------------------------------------------
-- matches: group round-robin + knockouts
-- ---------------------------------------------------------------------
create table if not exists public.matches (
  id                   uuid primary key default gen_random_uuid(),
  stage                text not null check (stage in ('group','knockout')),
  group_label          text check (group_label in ('A','B')),
  round_label          text check (round_label in ('SF1','SF2','3RD','FINAL')),
  home_team_id         uuid references public.teams(id) on delete set null,
  away_team_id         uuid references public.teams(id) on delete set null,
  home_score           int not null default 0,
  away_score           int not null default 0,
  played               boolean not null default false,
  motm_registration_id uuid references public.registrations(id) on delete set null
);

-- ---------------------------------------------------------------------
-- match_player_stats: per-player goals & assists in a match
-- ---------------------------------------------------------------------
create table if not exists public.match_player_stats (
  match_id        uuid not null references public.matches(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  goals           int not null default 0,
  assists         int not null default 0,
  unique (match_id, registration_id)
);
create index if not exists match_player_stats_match_id_idx on public.match_player_stats(match_id);

-- ---------------------------------------------------------------------
-- updates: announcements feed
-- ---------------------------------------------------------------------
create table if not exists public.updates (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  body       text not null
);

-- =====================================================================
-- public_players VIEW — the ONLY player data anon may read.
-- Exposes id, full_name, photo_base64, position, paid, team name.
-- NEVER exposes email, whatsapp, or payment screenshots.
-- Runs with the view owner's privileges (security_invoker OFF) so anon
-- can read it even though the base registrations table denies anon.
-- =====================================================================
create or replace view public.public_players
with (security_invoker = false) as
  select
    r.id,
    r.full_name,
    r.photo_base64,
    r.position,
    r.paid,
    t.name as team_name
  from public.registrations r
  left join public.team_players tp on tp.registration_id = r.id
  left join public.teams t on t.id = tp.team_id;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.registrations       enable row level security;
alter table public.payment_screenshots enable row level security;
alter table public.teams               enable row level security;
alter table public.team_players        enable row level security;
alter table public.matches             enable row level security;
alter table public.match_player_stats  enable row level security;
alter table public.updates             enable row level security;

-- Anon may SELECT public-safe tables only. No insert/update/delete policies
-- exist for anon, so all writes are denied to it (service role bypasses RLS).
drop policy if exists "anon read teams"              on public.teams;
drop policy if exists "anon read matches"            on public.matches;
drop policy if exists "anon read match_player_stats" on public.match_player_stats;
drop policy if exists "anon read updates"            on public.updates;

create policy "anon read teams"
  on public.teams for select to anon using (true);
create policy "anon read matches"
  on public.matches for select to anon using (true);
create policy "anon read match_player_stats"
  on public.match_player_stats for select to anon using (true);
create policy "anon read updates"
  on public.updates for select to anon using (true);

-- registrations & payment_screenshots: NO anon policies => no anon access.

-- View privileges: anon reads players ONLY through public_players.
revoke all on public.public_players from anon, authenticated;
grant select on public.public_players to anon, authenticated;

-- Belt-and-suspenders: make sure anon cannot touch the sensitive base tables.
revoke all on public.registrations       from anon, authenticated;
revoke all on public.payment_screenshots from anon, authenticated;

-- =====================================================================
-- SEED — 8 empty teams (Team 1–4 group A, Team 5–8 group B)
-- =====================================================================
insert into public.teams (name, group_label, seed_index) values
  ('Team 1', 'A', 0),
  ('Team 2', 'A', 1),
  ('Team 3', 'A', 2),
  ('Team 4', 'A', 3),
  ('Team 5', 'B', 0),
  ('Team 6', 'B', 1),
  ('Team 7', 'B', 2),
  ('Team 8', 'B', 3)
on conflict do nothing;

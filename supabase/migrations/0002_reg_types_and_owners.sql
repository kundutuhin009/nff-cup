-- =====================================================================
-- 0002 — registration types + tiered pricing, and team owners
-- =====================================================================
-- Adds three registration types (owner | gk | player), each with its own
-- fee, plus a per-team owner. Safe to run on a populated DB: every column
-- has a default so existing rows survive, and existing 'player' rows get a
-- 400 fee backfilled. Does NOT touch 0001 or the seed teams.
-- =====================================================================

-- ---------------------------------------------------------------------
-- registrations: reg_type drives fee + auction behaviour. The football
-- `position` column stays a SEPARATE concept (where they play).
-- ---------------------------------------------------------------------
alter table public.registrations
  add column if not exists reg_type   text    not null default 'player'
    check (reg_type in ('owner','gk','player')),
  add column if not exists is_playing boolean not null default true,
  add column if not exists fee_amount integer;  -- rupees, derived from reg_type at registration time

-- Backfill fee for pre-existing rows (all of which default to reg_type
-- 'player' => 400). Only fills rows that don't yet have a fee.
update public.registrations
   set fee_amount = 400
 where reg_type = 'player'
   and fee_amount is null;

-- ---------------------------------------------------------------------
-- teams: each team may have exactly one owner (a paid 'owner' reg).
-- Stored here rather than in team_players because owners are NOT in the
-- draftable pool. on delete set null so removing a registration doesn't
-- drop the team.
-- ---------------------------------------------------------------------
alter table public.teams
  add column if not exists owner_registration_id uuid
    references public.registrations(id) on delete set null;

-- A given person can own at most one team.
create unique index if not exists teams_owner_registration_id_key
  on public.teams(owner_registration_id)
  where owner_registration_id is not null;

-- =====================================================================
-- public_players VIEW — now also exposes reg_type and is_playing.
-- Still NEVER exposes email, whatsapp, or payment screenshots.
-- The new columns slot in BEFORE the existing `paid` column, which
-- create-or-replace cannot do (Postgres 42P16 — can't reorder/rename
-- existing view columns). Drop and recreate instead.
-- =====================================================================
drop view if exists public.public_players;
create view public.public_players
with (security_invoker = false) as
  select
    r.id,
    r.full_name,
    r.photo_base64,
    r.position,
    r.reg_type,
    r.is_playing,
    r.paid,
    t.name as team_name
  from public.registrations r
  left join public.team_players tp on tp.registration_id = r.id
  left join public.teams t on t.id = tp.team_id;

-- Re-grant (create or replace view keeps grants, but be explicit).
revoke all on public.public_players from anon, authenticated;
grant select on public.public_players to anon, authenticated;

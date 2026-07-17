-- =====================================================================
-- 0005 — auction budgets: per-team purse + per-player draft price (EUROS)
-- =====================================================================
-- Adds the money layer to the auction: each team gets a spending purse, and
-- each drafted player records the price they went for. SPENT/REMAINING are
-- NEVER stored — they're summed on read (same rule as standings in 0001).
--
-- Safe to re-run: every add is `if not exists`, every constraint/grant is
-- dropped-then-recreated. Safe on a populated DB: both columns have defaults,
-- so existing teams get a 1000 purse and existing drafted players get price 0.
--
-- Owners are FREE — they're assigned via teams.owner_registration_id, not
-- team_players, so they have no price column and never touch the purse.
--
-- PRIVACY: purse/price are ADMIN-ONLY. team_players has no anon RLS policy
-- (0001), so `price` is unreachable by anon already. `teams` HOWEVER is
-- anon-readable via the "anon read teams" policy, so a new column would be
-- world-readable through the public anon key. Column-level grants below keep
-- `purse` out of anon's reach while leaving the public columns readable.
-- The public_players view needs no change — it only reads teams.name.
-- =====================================================================

-- ---------------------------------------------------------------------
-- teams.purse — total budget in euros. 1000 is a placeholder default; the
-- real number is set from the auction UI ("Apply to all" / per-team edit).
-- ---------------------------------------------------------------------
alter table public.teams
  add column if not exists purse integer not null default 1000;

-- A purse itself is never negative (going OVER budget is allowed, but that's
-- derived: purse - sum(price) < 0, and derived values aren't constrained).
alter table public.teams
  drop constraint if exists teams_purse_non_negative;
alter table public.teams
  add constraint teams_purse_non_negative check (purse >= 0);

-- ---------------------------------------------------------------------
-- team_players.price — euros this player was drafted for. Existing rows
-- backfill to 0 (drafted before prices existed).
-- ---------------------------------------------------------------------
alter table public.team_players
  add column if not exists price integer not null default 0;

alter table public.team_players
  drop constraint if exists team_players_price_non_negative;
alter table public.team_players
  add constraint team_players_price_non_negative check (price >= 0);

-- =====================================================================
-- COLUMN-LEVEL GRANTS — keep `purse` admin-only.
-- =====================================================================
-- RLS decides WHICH ROWS a role sees; grants decide WHICH COLUMNS. The
-- "anon read teams" policy stays exactly as-is (public pages still read
-- teams), but anon loses column access to `purse`.
--
-- Every anon-side read of teams selects an explicit column list
-- (lib/publicData.ts getTeams, admin pages), never `select *`, so this
-- revoke breaks nothing. A `select *` as anon WOULD now fail — that's the
-- intended tripwire.
--
-- The service-role key (all admin writes/reads) bypasses this entirely.
-- public_players is security_invoker=false, so it reads teams as the view
-- owner and is unaffected — same mechanism that lets it read the
-- anon-revoked registrations table.
revoke select on public.teams from anon, authenticated;
grant select (id, name, group_label, seed_index, owner_registration_id)
  on public.teams to anon, authenticated;

-- Belt-and-suspenders: team_players is already anon-denied by RLS (no policy
-- exists for it), but make the price column's inaccessibility explicit too.
revoke all on public.team_players from anon, authenticated;

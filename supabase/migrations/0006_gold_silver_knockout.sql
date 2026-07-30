-- Dual-track knockout: GOLD (GSF1, GSF2, GFINAL) + SILVER (SQ1, SQ2, SFINAL).
-- Replaces the old single-track labels (SF1, SF2, 3RD, FINAL).
--
-- Safe on a populated DB: the old constraint is dropped before the new one is
-- added, and any surviving knockout rows carrying a retired label are cleared
-- first so the new CHECK can validate. Group matches are untouched (their
-- round_label is null, which the CHECK still allows).

-- 1. Drop the existing round_label CHECK, whatever it happens to be named.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'matches'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%round_label%'
  loop
    execute format('alter table public.matches drop constraint %I', c.conname);
  end loop;
end $$;

-- 2. Retire any knockout rows still using the old bracket. The new bracket is
--    seeded fresh from the admin screen; old semi/3rd/final rows have no slot
--    in it. (Cascades to their match_player_stats.)
delete from public.matches
where stage = 'knockout'
  and (round_label is null or round_label in ('SF1', 'SF2', '3RD', 'FINAL'));

-- 3. Recreate the CHECK with the dual-track labels.
alter table public.matches
  add constraint matches_round_label_check
  check (round_label in ('GSF1', 'GSF2', 'GFINAL', 'SQ1', 'SQ2', 'SFINAL'));

-- =====================================================================
-- 0003 — allow a null football position
-- =====================================================================
-- A non-playing owner has no on-pitch position, so `position` must be
-- nullable. Relax the NOT NULL and widen the CHECK to permit NULL.
-- Existing rows keep their position; nothing is backfilled or dropped.
-- =====================================================================

alter table public.registrations
  alter column position drop not null;

-- The inline CHECK from 0001 is auto-named registrations_position_check.
alter table public.registrations
  drop constraint if exists registrations_position_check;

alter table public.registrations
  add constraint registrations_position_check
    check (
      position is null
      or position in ('Goalkeeper','Defender','Midfielder','Forward')
    );

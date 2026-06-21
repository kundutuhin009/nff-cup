-- =====================================================================
-- 0004 — optional images on announcements
-- =====================================================================
-- Adds a public image URL to updates (image lives in the `announcements`
-- storage bucket, NOT base64). An announcement may now be image-only, so
-- `body` becomes nullable. A CHECK enforces "at least one of body/image"
-- as a belt-and-suspenders alongside the server-side validation.
-- Existing rows all have a body, so the relaxation + check are safe.
-- =====================================================================

alter table public.updates
  add column if not exists image_url text;  -- public URL in the announcements bucket, nullable

-- body was NOT NULL in 0001 — relax it (image-only announcements are allowed).
alter table public.updates
  alter column body drop not null;

-- Reject completely empty announcements at the DB layer too.
alter table public.updates
  drop constraint if exists updates_body_or_image_check;
alter table public.updates
  add constraint updates_body_or_image_check
    check (body is not null or image_url is not null);

-- Optional kickoff time per match (group + knockout).
--
-- Single-day, single-venue tournament, so this is a TIME only — no date and no
-- timezone maths. Stored as free text and rendered verbatim, so whatever the
-- admin types ("2:30 PM", "14:30") is exactly what the public page shows.
--
-- Purely additive and safe to re-run on the populated DB: existing matches get
-- NULL (= no time set). No other column changes.
alter table public.matches
  add column if not exists match_time text;

-- No grant/policy work needed. Unlike teams (whose `purse` forced the
-- column-level grants in 0005), matches is anon-readable table-wide via the
-- "anon read matches" policy with no column-level grant, so the new column is
-- covered automatically. A kickoff time is public information anyway.

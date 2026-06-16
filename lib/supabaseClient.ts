import { createClient } from "@supabase/supabase-js";

// Anon, read-only client for PUBLIC pages.
// RLS must restrict this to public-safe data only (teams, matches,
// match_player_stats, updates, and the public_players view).
// Never use this for writes — all writes go through /api/admin/* (service role).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface misconfiguration early in dev.
  // eslint-disable-next-line no-console
  console.warn("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

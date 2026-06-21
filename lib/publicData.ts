import { supabase } from "./supabaseClient";
import type {
  Match,
  MatchPlayerStat,
  PublicPlayer,
  Team,
  Update,
} from "./types";

// All reads here go through the anon client and are constrained by RLS to
// public-safe data only (teams, matches, match_player_stats, updates,
// and the public_players view).

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, group_label, seed_index, owner_registration_id")
    .order("group_label")
    .order("seed_index");
  if (error) throw error;
  return (data ?? []) as Team[];
}

export async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabase.from("matches").select("*");
  if (error) throw error;
  return (data ?? []) as Match[];
}

export async function getMatchStats(): Promise<MatchPlayerStat[]> {
  const { data, error } = await supabase
    .from("match_player_stats")
    .select("match_id, registration_id, goals, assists");
  if (error) throw error;
  return (data ?? []) as MatchPlayerStat[];
}

export async function getPublicPlayers(): Promise<PublicPlayer[]> {
  const { data, error } = await supabase
    .from("public_players")
    .select(
      "id, full_name, photo_base64, position, reg_type, is_playing, paid, team_name"
    );
  if (error) throw error;
  return (data ?? []) as PublicPlayer[];
}

export async function getUpdates(): Promise<Update[]> {
  const { data, error } = await supabase
    .from("updates")
    .select("id, created_at, body")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Update[];
}

export interface PublicCounts {
  registered: number;
  paid: number;
  drafted: number; // assigned to a team
}

export async function getCounts(players: PublicPlayer[]): Promise<PublicCounts> {
  return {
    registered: players.length,
    paid: players.filter((p) => p.paid).length,
    drafted: players.filter((p) => !!p.team_name).length,
  };
}

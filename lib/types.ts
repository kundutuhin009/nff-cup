// Shared domain types (snake_case mirrors the DB columns).

export type Position = "Goalkeeper" | "Defender" | "Midfielder" | "Forward";
export type FoodPref = "Veg" | "Non-Veg";
export type GroupLabel = "A" | "B";
export type Stage = "group" | "knockout";
export type RoundLabel = "SF1" | "SF2" | "3RD" | "FINAL";

export const POSITIONS: Position[] = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
];
export const FOOD_PREFS: FoodPref[] = ["Veg", "Non-Veg"];
export const ROUND_LABELS: RoundLabel[] = ["SF1", "SF2", "3RD", "FINAL"];

export interface Team {
  id: string;
  name: string;
  group_label: GroupLabel;
  seed_index: number;
}

export interface TeamPlayer {
  team_id: string;
  registration_id: string;
}

export interface Match {
  id: string;
  stage: Stage;
  group_label: GroupLabel | null;
  round_label: RoundLabel | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number;
  away_score: number;
  played: boolean;
  motm_registration_id: string | null;
}

export interface MatchPlayerStat {
  match_id: string;
  registration_id: string;
  goals: number;
  assists: number;
}

export interface Update {
  id: string;
  created_at: string;
  body: string;
}

// Anon-safe player shape, via the public_players view.
export interface PublicPlayer {
  id: string;
  full_name: string;
  photo_base64: string | null;
  position: Position;
  paid: boolean;
  team_name: string | null;
}

// Full registration row — ADMIN ONLY (never sent to anon clients).
export interface Registration {
  id: string;
  created_at: string;
  full_name: string;
  photo_base64: string | null;
  email: string;
  whatsapp: string;
  position: Position;
  food_pref: FoodPref;
  paid: boolean;
}

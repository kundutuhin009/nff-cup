// Shared domain types (snake_case mirrors the DB columns).

export type Position = "Goalkeeper" | "Defender" | "Midfielder" | "Forward";
export type FoodPref = "Veg" | "Non-Veg";
export type GroupLabel = "A" | "B";
export type Stage = "group" | "knockout";
// Dual-track knockout: GOLD (semis + final) and SILVER (qualifiers + final).
// Bracket structure and slot sources live in lib/bracket.ts.
export type RoundLabel = "GSF1" | "GSF2" | "GFINAL" | "SQ1" | "SQ2" | "SFINAL";

// Registration type drives the fee and auction behaviour (distinct from the
// football `position`). Fee amounts live in lib/pricing.ts.
export type RegType = "owner" | "gk" | "player";

export const POSITIONS: Position[] = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
];
// Outfield positions a 'player' reg_type may choose (no Goalkeeper — that's
// the gk tier).
export const PLAYER_POSITIONS: Position[] = ["Defender", "Midfielder", "Forward"];
export const FOOD_PREFS: FoodPref[] = ["Veg", "Non-Veg"];
export const ROUND_LABELS: RoundLabel[] = [
  "GSF1",
  "GSF2",
  "GFINAL",
  "SQ1",
  "SQ2",
  "SFINAL",
];

export const REG_TYPES: RegType[] = ["owner", "gk", "player"];
export const REG_TYPE_LABELS: Record<RegType, string> = {
  owner: "Owner",
  gk: "Goalkeeper",
  player: "Player",
};

export interface Team {
  id: string;
  name: string;
  group_label: GroupLabel;
  seed_index: number;
  owner_registration_id: string | null;
}

// Team + its auction budget. purse is ADMIN-ONLY (anon lacks the column
// grant), so this shape only ever comes from /api/admin/teams.
export interface AdminTeam extends Team {
  purse: number;
}

export interface TeamPlayer {
  team_id: string;
  registration_id: string;
  price: number;
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
  body: string | null;
  image_url: string | null;
}

// Anon-safe player shape, via the public_players view.
export interface PublicPlayer {
  id: string;
  full_name: string;
  photo_base64: string | null;
  position: Position | null;
  reg_type: RegType;
  is_playing: boolean;
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
  position: Position | null;
  reg_type: RegType;
  is_playing: boolean;
  fee_amount: number | null;
  food_pref: FoodPref;
  paid: boolean;
}

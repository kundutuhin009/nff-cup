// =====================================================================
// Auction budget math + display. Currency here is EUROS (€), which is
// deliberately SEPARATE from registration fees in lib/pricing.ts (rupees):
// fees are what a player paid to enter, purse/price are auction money.
//
// SPENT and REMAINING are always derived from the drafted prices — never
// stored — so they stay correct as players are drafted and removed.
// =====================================================================

// Display helper: "€120", "€4,200". Mirrors formatRupees in lib/pricing.ts.
// An overspent team reads "-€150" rather than "€-150", which is what a bare
// template gives. The locale is pinned rather than left to the browser so the
// grouping can't drift between machines (and the projector matches the laptop).
export function formatEuros(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const grouped = Math.abs(amount).toLocaleString("en-US");
  return amount < 0 ? `-€${grouped}` : `€${grouped}`;
}

// Only drafted gk/player registrations cost money. Owners are FREE — they're
// assigned via teams.owner_registration_id and never appear in team_players,
// so they can't reach this sum in the first place.
export function spentOf(pricedPlayers: { price: number | null }[]): number {
  return pricedPlayers.reduce((sum, p) => sum + (p.price ?? 0), 0);
}

export function remainingOf(purse: number, spent: number): number {
  return purse - spent;
}

// Colour band for the big REMAINING number: red once overspent, amber when
// the purse is nearly gone, green while healthy. `low` is a fraction of the
// purse, so the threshold scales with whatever budget is set.
export type BudgetTone = "healthy" | "low" | "over";

export function toneOf(remaining: number, purse: number, low = 0.2): BudgetTone {
  if (remaining < 0) return "over";
  if (purse > 0 && remaining <= purse * low) return "low";
  return "healthy";
}

export const TONE_CLASS: Record<BudgetTone, string> = {
  healthy: "text-emerald-300",
  low: "text-amber-300",
  over: "text-red-400",
};

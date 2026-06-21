import type { RegType } from "./types";

// =====================================================================
// Single source of truth for registration fees (rupees).
// Fee is derived from reg_type and computed server-side at registration
// time, then stored in registrations.fee_amount — never trusted from the
// client.
// =====================================================================
export const FEE_BY_REG_TYPE: Record<RegType, number> = {
  owner: 600,
  gk: 300,
  player: 400,
};

export function feeFor(regType: RegType): number {
  return FEE_BY_REG_TYPE[regType];
}

// Display helper: "₹400"
export function formatRupees(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `₹${amount}`;
}

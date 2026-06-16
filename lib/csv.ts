import type { Registration } from "./types";

function escapeCell(value: string | number | boolean | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Build a CSV of player details (NO images), with an optional team-name lookup.
export function registrationsToCsv(
  rows: Registration[],
  teamNameByRegId: Record<string, string | null> = {}
): string {
  const header = [
    "full_name",
    "email",
    "whatsapp",
    "position",
    "food_pref",
    "paid",
    "team",
    "created_at",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        escapeCell(r.full_name),
        escapeCell(r.email),
        escapeCell(r.whatsapp),
        escapeCell(r.position),
        escapeCell(r.food_pref),
        escapeCell(r.paid ? "yes" : "no"),
        escapeCell(teamNameByRegId[r.id] ?? ""),
        escapeCell(r.created_at),
      ].join(",")
    );
  }

  return lines.join("\n");
}

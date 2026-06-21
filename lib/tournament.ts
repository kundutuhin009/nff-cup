// Tournament-wide copy constants.
export const TOURNAMENT_NAME = "NFF Independence Cup 2.0 (Intra)";
export const TOURNAMENT_SHORT = "NFF"; // compact logo mark

export const VENUE_NAME = "Akankha Turf";
export const VENUE_MAPS_URL = "https://share.google/3F36hMk3Nt173I3pb";

// Payment destination shown on /register (UPI / PhonePe / GPay). Defined once
// so it's easy to change if the number changes.
export const PAYMENT_UPI = "8017893709";

// Feature flag — gates ONLY public self-registration as an Owner on /register
// (and the matching server check in /api/register). Admin owner management and
// the auction are unaffected. Set true to re-open Owner self-registration
// before the auction.
export const OWNERS_REGISTRATION_OPEN = false;

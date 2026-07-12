// Shared identity-matching normalizer for team/player names sourced from
// different providers (The Odds API, API-Football) whose spelling/formatting
// don't always match exactly (e.g. "Man United" vs "Manchester United").
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

import { env } from './env';

// Generic client for API-Sports' non-football products. All verified live
// (2026-07-12) against the user's key: the SAME key works on every product,
// each with its own separate 100 req/day Free quota.
//
// Free-tier constraints (verified live, same as the football product):
// - date queries: work for the current date window
// - h2h queries: work with no season param
// - team+season queries: rejected for any season outside 2022-2024, so
//   recent-form/season-stats enrichment is NOT available on this plan.
//   Enrichment for these sports is therefore H2H-only until upgraded.
export const API_SPORTS_HOSTS = {
  basketball: 'v1.basketball.api-sports.io',
  baseball: 'v1.baseball.api-sports.io',
  'american-football': 'v1.american-football.api-sports.io',
} as const;

export type ApiSportsProduct = keyof typeof API_SPORTS_HOSTS;

// League ids verified via each product's /leagues endpoint (2026-07-12).
export const API_SPORTS_LEAGUES = {
  NBA: { product: 'basketball' as const, leagueId: 12 },
  MLB: { product: 'baseball' as const, leagueId: 1 },
  NFL: { product: 'american-football' as const, leagueId: 1 },
} as const;

// Common /games envelope across basketball & baseball, verified live against
// real games on both products. The american-football shape could not be
// verified (no NFL games in July) — it is assumed to share this envelope, and
// every consumer treats missing fields as "no data" rather than crashing.
// Sport-specific score breakdowns (quarters/innings) are intentionally not
// modeled — only the totals both verified products share.
export interface ApiSportsGame {
  readonly id: number;
  readonly date: string;
  readonly status: { readonly long: string; readonly short: string };
  readonly league: { readonly id: number; readonly name: string; readonly season: number | string };
  readonly teams: {
    readonly home: { readonly id: number; readonly name: string; readonly logo: string };
    readonly away: { readonly id: number; readonly name: string; readonly logo: string };
  };
  readonly scores: {
    readonly home: { readonly total: number | null } | null;
    readonly away: { readonly total: number | null } | null;
  };
}

class ApiSportsError extends Error {
  constructor(product: string, endpoint: string, cause: string) {
    super(`API-Sports (${product}) request to ${endpoint} failed: ${cause}`);
    this.name = 'ApiSportsError';
  }
}

async function apiSportsFetch<T>(
  product: ApiSportsProduct,
  endpoint: string,
  params: Record<string, string | number>
): Promise<T[]> {
  const url = new URL(`https://${API_SPORTS_HOSTS[product]}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), { headers: { 'x-apisports-key': env.APIFOOTBALL_KEY } });
  } catch (err) {
    throw new ApiSportsError(product, endpoint, err instanceof Error ? err.message : String(err));
  }
  if (!res.ok) {
    throw new ApiSportsError(product, endpoint, `HTTP ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { response: T[]; errors: unknown };
  const hasErrors = Array.isArray(data.errors)
    ? data.errors.length > 0
    : Boolean(data.errors && Object.keys(data.errors).length > 0);
  if (hasErrors) {
    throw new ApiSportsError(product, endpoint, JSON.stringify(data.errors));
  }

  return data.response;
}

export async function getGamesByDate(product: ApiSportsProduct, date: string, leagueId?: number): Promise<ApiSportsGame[]> {
  const games = await apiSportsFetch<ApiSportsGame>(product, '/games', { date });
  return leagueId === undefined ? games : games.filter((g) => g.league.id === leagueId);
}

export async function getGamesH2H(product: ApiSportsProduct, teamAId: number, teamBId: number): Promise<ApiSportsGame[]> {
  return apiSportsFetch<ApiSportsGame>(product, '/games', { h2h: `${teamAId}-${teamBId}` });
}

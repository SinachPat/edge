import { env } from './env';
import type { OddsApiEvent } from '@/types/api';

const BASE_URL = 'https://api.the-odds-api.com/v4';
const DEFAULT_MARKETS = ['h2h', 'spreads', 'totals', 'btts', 'player_props'];
const DEFAULT_REGIONS = 'eu,uk';

export const SPORT_KEYS = {
  EPL: 'soccer_epl',
  CHAMPIONS_LEAGUE: 'soccer_uefa_champs_league',
  LA_LIGA: 'soccer_spain_la_liga',
  SERIE_A: 'soccer_italy_serie_a',
  BUNDESLIGA: 'soccer_germany_bundesliga',
  LIGUE_1: 'soccer_france_ligue_one',
  NBA: 'basketball_nba',
  NFL: 'americanfootball_nfl',
  TENNIS_ATP: 'tennis_atp_french_open',
} as const;

class OddsApiError extends Error {
  constructor(endpoint: string, cause: string) {
    super(`Odds API request to ${endpoint} failed: ${cause}`);
    this.name = 'OddsApiError';
  }
}

async function oddsApiFetch(endpoint: string, params: Record<string, string>, init?: RequestInit) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('apiKey', env.ODDS_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), init);
  } catch (err) {
    throw new OddsApiError(endpoint, err instanceof Error ? err.message : String(err));
  }

  const remaining = res.headers.get('x-requests-remaining');
  if (remaining !== null) {
    console.log(`[odds-api] ${endpoint} — credits remaining: ${remaining}`);
  }

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new OddsApiError(endpoint, `HTTP ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getUpcomingOdds(
  sportKey: string,
  markets: string[] = DEFAULT_MARKETS
): Promise<OddsApiEvent[]> {
  const data = await oddsApiFetch(
    `/sports/${sportKey}/odds/`,
    { regions: DEFAULT_REGIONS, markets: markets.join(','), oddsFormat: 'decimal' },
    { next: { revalidate: 1800 } } // cache 30 minutes — called once per pipeline run
  );
  return data ?? [];
}

export async function getHistoricalOdds(sportKey: string, eventId: string): Promise<OddsApiEvent | null> {
  const data = await oddsApiFetch(`/sports/${sportKey}/odds-history/`, {
    regions: DEFAULT_REGIONS,
    eventId,
  });
  return data ?? null;
}

export async function getSupportedSports(): Promise<{ key: string; title: string; active: boolean }[]> {
  const data = await oddsApiFetch('/sports/', {});
  return data ?? [];
}

export async function getLiveOdds(sportKey: string): Promise<OddsApiEvent[]> {
  // The Odds API doesn't expose a separate "live only" endpoint — live and
  // upcoming events share /odds/. Filter to events that have already started.
  const events = await getUpcomingOdds(sportKey);
  const now = Date.now();
  return events.filter((event) => new Date(event.commence_time).getTime() <= now);
}

export function getBestOdds(event: OddsApiEvent, market: string, selection: string): number {
  let best = 0;
  for (const bookmaker of event.bookmakers) {
    const marketData = bookmaker.markets.find((m) => m.key === market);
    if (!marketData) continue;
    const outcome = marketData.outcomes.find((o) => o.name === selection);
    if (outcome && outcome.price > best) {
      best = outcome.price;
    }
  }
  return best;
}

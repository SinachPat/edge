import { env } from './env';
import type { OddsApiEvent, OddsApiScoreEvent } from '@/types/api';

const BASE_URL = 'https://api.the-odds-api.com/v4';
// Only h2h/spreads/totals are valid on the bulk /odds endpoint. Additional
// markets (btts, player props, alternates) are per-event, sport-specific keys —
// requesting them here 422s the whole call. Fetch those via the event endpoint.
const DEFAULT_MARKETS = ['h2h', 'spreads', 'totals'];
const DEFAULT_REGIONS = 'eu,uk';

// Per-event market keys, verified live against api.the-odds-api.com on 2026-07-12
// (soccer_epl and soccer_brazil_campeonato fixtures). The API silently omits any
// key a bookmaker doesn't offer for that match rather than erroring — and only
// bills for markets actually returned (x-requests-last == populated markets ×
// regions, confirmed across 4 live calls), so requesting the full list is free
// when a market isn't offered. Live-confirmed to return real bookmaker data:
// btts, double_chance, draw_no_bet, correct_score, halftime_fulltime,
// alternate_totals_corners. The rest were accepted (no error) on live calls but
// never populated for the two test fixtures used — availability for EPL/
// Champions League/La Liga specifically is unverified beyond that.
//
// Deliberately excludes alternate_spreads_corners, alternate_spreads_cards, and
// player_shots_on_target: Stage 1 is never instructed to pick from them and
// inngest/settle-results.ts has no grading logic for them, so fetching them
// would only spend credits on data nothing can ever act on.
const EXTENDED_MARKETS = [
  'btts',
  'double_chance',
  'draw_no_bet',
  'correct_score',
  'halftime_fulltime',
  'alternate_totals_corners',
  'alternate_totals_cards',
  'player_goal_scorer_anytime',
  'player_to_receive_card',
];

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
    // The Odds API returns a JSON body on errors — {message, error_code,
    // details_url} — e.g. quota exhaustion (401, OUT_OF_USAGE_CREDITS,
    // verified live) reads only as "HTTP 401 Unauthorized" without this,
    // which isn't enough to diagnose without manually re-querying the API.
    const bodyText = await res.text().catch(() => '');
    throw new OddsApiError(endpoint, `HTTP ${res.status} ${res.statusText}${bodyText ? ` — ${bodyText}` : ''}`);
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

// The per-event endpoint returns the same shape as one element of the bulk
// /odds/ array (confirmed live: id/sport_key/sport_title/commence_time/
// home_team/away_team/bookmakers, no extra wrapper).
export async function getEventOdds(sportKey: string, eventId: string): Promise<OddsApiEvent | null> {
  const data = await oddsApiFetch(
    `/sports/${sportKey}/events/${eventId}/odds`,
    { regions: DEFAULT_REGIONS, markets: EXTENDED_MARKETS.join(','), oddsFormat: 'decimal' },
    { next: { revalidate: 1800 } }
  );
  return data ?? null;
}

// Live-verified costs (x-requests-last header, 2026-07-12): /events is FREE
// (0 credits); /scores is 1 credit for live+upcoming only, 2 credits when
// daysFrom is set (which is what includes completed games' final scores).

// Event list without odds — {id, sport_key, sport_title, commence_time,
// home_team, away_team}. Free, so safe to call per page view.
export async function getEvents(sportKey: string): Promise<OddsApiScoreEvent[]> {
  const data = await oddsApiFetch(`/sports/${sportKey}/events`, {}, { next: { revalidate: 900 } });
  return data ?? [];
}

// Scores for live, upcoming, and (within daysFrom, max 3) completed games.
// `scores` is null until a game starts; `completed` flips true at final.
// 30-minute cache bounds the cost at 2 credits per sport per half hour no
// matter how often the UI refetches.
export async function getScores(sportKey: string, daysFrom = 2): Promise<OddsApiScoreEvent[]> {
  const data = await oddsApiFetch(
    `/sports/${sportKey}/scores/`,
    { daysFrom: String(daysFrom) },
    { next: { revalidate: 1800 } }
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

export interface OddsApiSport {
  readonly key: string;
  readonly group: string;
  readonly title: string;
  readonly description: string;
  readonly active: boolean;
  readonly has_outrights: boolean;
}

// The sports catalog is free but only changes when seasons start/end — cache
// aggressively. `has_outrights: true` entries (futures like "FIFA World Cup
// Winner") aren't match fixtures and should be filtered out by most callers.
export async function getSupportedSports(): Promise<OddsApiSport[]> {
  const data = await oddsApiFetch('/sports/', {}, { next: { revalidate: 3600 } });
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

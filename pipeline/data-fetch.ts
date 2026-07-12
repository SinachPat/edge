import { getEventOdds, getSupportedSports, getUpcomingOdds } from '@/lib/odds-api';
import { getFixtures, getH2H, getInjuries, getPrediction } from '@/lib/api-football';
import { getGamesByDate, getGamesH2H, type ApiSportsGame } from '@/lib/api-sports';
import { normalizeName } from '@/lib/normalize';
import type { ApiFootballFixture, OddsApiEvent } from '@/types/api';
import type { RawFixtureData } from '@/types/edge';

const MAX_ENRICHED_FIXTURES = 15;

// Odds API and API-Football use unrelated ID systems for the same fixture —
// match by normalized team names instead. This is a best-effort match; team
// name spelling drift between providers (e.g. abbreviations) can cause misses.
export function findMatchingOdds(fixture: ApiFootballFixture, oddsEvents: OddsApiEvent[]): OddsApiEvent | null {
  const home = normalizeName(fixture.teams.home.name);
  const away = normalizeName(fixture.teams.away.name);
  return (
    oddsEvents.find((event) => normalizeName(event.home_team) === home && normalizeName(event.away_team) === away) ??
    null
  );
}

export async function fetchFixturesForDate(date: string): Promise<ApiFootballFixture[]> {
  // Passing `league` to /fixtures requires `season` too, and this account's
  // plan only permits season 2022-2024 for league-filtered queries (verified
  // live: any other season is rejected with "Free plans do not have access
  // to this season") — useless for fetching current fixtures. Querying by
  // date alone needs neither and returns EVERY league in one call. No league
  // filter here: coverage is decided by which fixtures have bookmaker odds
  // (see enrichFixtures), not by a hardcoded league list.
  return getFixtures({ date });
}

// Fetches bulk odds for every soccer league The Odds API currently has
// active, discovered from the free /sports catalog rather than a hardcoded
// list — new leagues appear automatically as their seasons start. Each league
// costs 6 credits (3 markets × 2 regions); a per-league failure (e.g. quota
// exhaustion mid-loop) skips that league instead of sinking the run.
export async function fetchAllSoccerOdds(): Promise<OddsApiEvent[]> {
  const sports = await getSupportedSports();
  const soccerKeys = sports.filter((s) => s.active && !s.has_outrights && s.group === 'Soccer').map((s) => s.key);

  const results = await Promise.all(
    soccerKeys.map(async (sportKey) => {
      try {
        return await getUpcomingOdds(sportKey);
      } catch (err) {
        console.warn(`[data-fetch] odds fetch failed for ${sportKey}: ${err instanceof Error ? err.message : err}`);
        return [];
      }
    })
  );
  return results.flat();
}

// Wraps an enrichment call so one blocked/flaky endpoint degrades that field
// to null instead of throwing through Promise.all and killing the whole
// pipeline run. Verified necessary: two enrichment endpoints hard-fail on the
// current API-Football plan, and any fixture would have sunk the session.
async function failSoft<T>(label: string, call: () => Promise<T>): Promise<T | null> {
  try {
    return await call();
  } catch (err) {
    console.warn(`[data-fetch] ${label} unavailable: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export async function enrichFixtures(
  fixtures: ApiFootballFixture[],
  oddsEvents: OddsApiEvent[]
): Promise<RawFixtureData[]> {
  // fetchFixturesForDate returns every league worldwide (300+ rows on a busy
  // day). Only fixtures a bookmaker actually prices are candidates, and the
  // enrichment budget goes to the most-traded ones first — bookmaker count is
  // a decent liquidity proxy that needs no hardcoded league ranking.
  const withOdds = fixtures
    .map((fixture) => ({ fixture, odds: findMatchingOdds(fixture, oddsEvents) }))
    .filter((entry): entry is { fixture: ApiFootballFixture; odds: OddsApiEvent } => entry.odds !== null)
    .sort((a, b) => b.odds.bookmakers.length - a.odds.bookmakers.length)
    .slice(0, MAX_ENRICHED_FIXTURES);

  return Promise.all(
    withOdds.map(async ({ fixture, odds }) => {
      const [h2h, injuries, prediction, extendedOdds] = await Promise.all([
        failSoft('h2h', () => getH2H(fixture.teams.home.id, fixture.teams.away.id)),
        failSoft('injuries', () => getInjuries(fixture.fixture.id)),
        failSoft('prediction', () => getPrediction(fixture.fixture.id)),
        failSoft('extended odds', () => getEventOdds(odds.sport_key, odds.id)),
      ]);

      return {
        sport: 'soccer',
        fixture,
        h2h,
        injuries,
        prediction,
        // Team season statistics require a season parameter the current
        // API-Football plan rejects for any current season (verified live) —
        // permanently null until the plan is upgraded, so the calls are
        // skipped entirely rather than burned on guaranteed failures.
        homeStats: null,
        awayStats: null,
        odds,
        extendedOdds,
        oddsEventId: odds.id,
        oddsSportKey: odds.sport_key,
      };
    })
  );
}

// ============================================================================
// US sports (NBA / MLB / NFL) — Phase 2 multi-sport expansion
// ============================================================================

// Which sports feed the daily pipeline beyond soccer. `product`/`leagueId`
// address API-Sports (fixtures + H2H enrichment); `oddsSportKey` addresses
// The Odds API (odds + settlement scores). All ids verified live 2026-07-12.
const TRACKED_US_SPORTS = [
  { sport: 'basketball', league: 'NBA', product: 'basketball', leagueId: 12, oddsSportKey: 'basketball_nba' },
  { sport: 'baseball', league: 'MLB', product: 'baseball', leagueId: 1, oddsSportKey: 'baseball_mlb' },
  { sport: 'american-football', league: 'NFL', product: 'american-football', leagueId: 1, oddsSportKey: 'americanfootball_nfl' },
] as const;

// Keeps each API-Sports product comfortably inside its own 100 req/day Free
// quota: 1 games-by-date call + at most this many H2H calls per day.
const MAX_GAMES_PER_US_SPORT = 8;

export async function fetchUsSportsFixtures(date: string): Promise<RawFixtureData[]> {
  const perSport = await Promise.all(
    TRACKED_US_SPORTS.map(async ({ sport, league, product, leagueId, oddsSportKey }) => {
      // A sport out of season (or a temporarily failing product) shouldn't
      // sink the whole pipeline — log and continue with the other sports.
      let games: ApiSportsGame[];
      let oddsEvents: OddsApiEvent[];
      try {
        [games, oddsEvents] = await Promise.all([
          getGamesByDate(product, date, leagueId),
          getUpcomingOdds(oddsSportKey),
        ]);
      } catch (err) {
        console.warn(`[data-fetch] ${league} fetch failed, skipping sport: ${err instanceof Error ? err.message : err}`);
        return [];
      }

      // "Not yet started" is judged by kickoff time rather than status codes —
      // the not-started status string was never observed live (only 'FT' was),
      // and timestamps need no per-product vocabulary.
      const now = Date.now();
      const upcoming = games.filter((g) => new Date(g.date).getTime() > now).slice(0, MAX_GAMES_PER_US_SPORT);

      return Promise.all(
        upcoming.map(async (game): Promise<RawFixtureData> => {
          const home = normalizeName(game.teams.home.name);
          const away = normalizeName(game.teams.away.name);
          const odds =
            oddsEvents.find(
              (ev) => normalizeName(ev.home_team) === home && normalizeName(ev.away_team) === away
            ) ?? null;

          // Free-tier API-Sports blocks team+season queries for current
          // seasons (verified live), so H2H is the only enrichment available.
          // Form/injury/stats layers will simply fail their signals — the
          // prompt treats absent evidence as a failed layer, not a guess.
          let h2h: ApiSportsGame[] = [];
          try {
            h2h = await getGamesH2H(product, game.teams.home.id, game.teams.away.id);
          } catch (err) {
            console.warn(`[data-fetch] ${league} H2H failed for game ${game.id}: ${err instanceof Error ? err.message : err}`);
          }

          return {
            sport,
            fixture: game,
            h2h,
            injuries: null,
            prediction: null,
            homeStats: null,
            awayStats: null,
            odds,
            extendedOdds: null,
            oddsEventId: odds?.id ?? null,
            oddsSportKey: odds?.sport_key ?? null,
          };
        })
      );
    })
  );

  return perSport.flat();
}

import { getUpcomingOdds, SPORT_KEYS } from '@/lib/odds-api';
import { getFixtures, getH2H, getInjuries, getPrediction, getTeamStats, LEAGUE_IDS } from '@/lib/api-football';
import type { ApiFootballFixture, OddsApiEvent } from '@/types/api';
import type { RawFixtureData } from '@/types/edge';

const MAX_ENRICHED_FIXTURES = 15;

// European football seasons span two calendar years (e.g. the "2025" season
// runs Aug 2025 - May 2026). API-Football keys stats by the season's start year.
export function currentSeason(): number {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Odds API and API-Football use unrelated ID systems for the same fixture —
// match by normalized team names instead. This is a best-effort match; team
// name spelling drift between providers (e.g. abbreviations) can cause misses.
export function findMatchingOdds(fixture: ApiFootballFixture, oddsEvents: OddsApiEvent[]): OddsApiEvent | null {
  const home = normalizeTeamName(fixture.teams.home.name);
  const away = normalizeTeamName(fixture.teams.away.name);
  return (
    oddsEvents.find(
      (event) => normalizeTeamName(event.home_team) === home && normalizeTeamName(event.away_team) === away
    ) ?? null
  );
}

export async function fetchFixturesForDate(date: string): Promise<ApiFootballFixture[]> {
  const results = await Promise.all(
    [LEAGUE_IDS.EPL, LEAGUE_IDS.CHAMPIONS_LEAGUE, LEAGUE_IDS.LA_LIGA].map((leagueId) => getFixtures({ leagueId, date }))
  );
  const combined = results.flat();
  const seen = new Set<number>();
  return combined.filter((f) => {
    if (seen.has(f.fixture.id)) return false;
    seen.add(f.fixture.id);
    return true;
  });
}

export async function fetchOddsForTrackedLeagues(): Promise<OddsApiEvent[]> {
  const results = await Promise.all(
    [SPORT_KEYS.EPL, SPORT_KEYS.CHAMPIONS_LEAGUE, SPORT_KEYS.LA_LIGA].map((sportKey) => getUpcomingOdds(sportKey))
  );
  return results.flat();
}

export async function enrichFixtures(
  fixtures: ApiFootballFixture[],
  oddsEvents: OddsApiEvent[]
): Promise<RawFixtureData[]> {
  const toEnrich = fixtures.slice(0, MAX_ENRICHED_FIXTURES);
  const season = currentSeason();

  return Promise.all(
    toEnrich.map(async (fixture) => {
      const [h2h, injuries, prediction, homeStats, awayStats] = await Promise.all([
        getH2H(fixture.teams.home.id, fixture.teams.away.id),
        getInjuries(fixture.fixture.id),
        getPrediction(fixture.fixture.id),
        getTeamStats(fixture.league.id, season, fixture.teams.home.id),
        getTeamStats(fixture.league.id, season, fixture.teams.away.id),
      ]);

      return {
        fixture,
        h2h,
        injuries,
        prediction,
        homeStats,
        awayStats,
        odds: findMatchingOdds(fixture, oddsEvents),
      };
    })
  );
}

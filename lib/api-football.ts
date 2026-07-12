import { env } from './env';
import type { ApiFootballFixture, ApiFootballFixtureEvent, ApiFootballFixtureStatistics, ApiFootballPrediction } from '@/types/api';

const BASE_URL = 'https://v3.football.api-sports.io';

export const LEAGUE_IDS = {
  EPL: 39,
  CHAMPIONS_LEAGUE: 2,
  LA_LIGA: 140,
  SERIE_A: 135,
  BUNDESLIGA: 78,
  LIGUE_1: 61,
} as const;

class ApiFootballError extends Error {
  constructor(endpoint: string, cause: string) {
    super(`API-Football request to ${endpoint} failed: ${cause}`);
    this.name = 'ApiFootballError';
  }
}

interface ApiFootballResponse<T> {
  response: T[];
  results: number;
  errors: unknown;
}

async function fetchFootball<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), { headers: { 'x-apisports-key': env.APIFOOTBALL_KEY } });
  } catch (err) {
    throw new ApiFootballError(endpoint, err instanceof Error ? err.message : String(err));
  }

  if (!res.ok) {
    throw new ApiFootballError(endpoint, `HTTP ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ApiFootballResponse<T>;
  const hasErrors = Array.isArray(data.errors) ? data.errors.length > 0 : Boolean(data.errors && Object.keys(data.errors).length > 0);
  if (hasErrors) {
    throw new ApiFootballError(endpoint, JSON.stringify(data.errors));
  }

  return data.response;
}

export async function getFixtures(params: {
  leagueId?: number;
  date?: string;
  teamId?: number;
  next?: number;
}): Promise<ApiFootballFixture[]> {
  const query: Record<string, string | number> = {};
  if (params.leagueId !== undefined) query.league = params.leagueId;
  if (params.date !== undefined) query.date = params.date;
  if (params.teamId !== undefined) query.team = params.teamId;
  if (params.next !== undefined) query.next = params.next;
  return fetchFootball<ApiFootballFixture>('/fixtures', query);
}

export async function getH2H(teamA: number, teamB: number, last = 10): Promise<ApiFootballFixture[]> {
  // The `last` query param is blocked on Free plans (verified live:
  // "Free plans do not have access to the Last parameter") — fetch the full
  // head-to-head list and take the most recent meetings client-side instead.
  const all = await fetchFootball<ApiFootballFixture>('/fixtures/headtohead', { h2h: `${teamA}-${teamB}` });
  return all.sort((a, b) => b.fixture.date.localeCompare(a.fixture.date)).slice(0, last);
}

export async function getInjuries(fixtureId: number): Promise<unknown[]> {
  return fetchFootball<unknown>('/injuries', { fixture: fixtureId });
}

export async function getLineup(fixtureId: number): Promise<unknown[]> {
  return fetchFootball<unknown>('/fixtures/lineups', { fixture: fixtureId });
}

// Verified live (v3.football.api-sports.io/fixtures/statistics, fixture 1508460):
// one entry per team. Not guaranteed populated for every finished fixture —
// results:0 was observed for several other real fixtures with no error, so
// callers must treat empty/missing stats as "unavailable", not a fetch failure.
export async function getFixtureStatistics(fixtureId: number): Promise<ApiFootballFixtureStatistics[]> {
  return fetchFootball<ApiFootballFixtureStatistics>('/fixtures/statistics', { fixture: fixtureId });
}

// Verified live (v3.football.api-sports.io/fixtures/events, fixture 1508460):
// chronological list of Goal/Card/subst/Var events with player-level detail.
export async function getFixtureEvents(fixtureId: number): Promise<ApiFootballFixtureEvent[]> {
  return fetchFootball<ApiFootballFixtureEvent>('/fixtures/events', { fixture: fixtureId });
}

export async function getPrediction(fixtureId: number): Promise<ApiFootballPrediction | null> {
  const results = await fetchFootball<ApiFootballPrediction>('/predictions', { fixture: fixtureId });
  return results[0] ?? null;
}

export async function getTeamStats(leagueId: number, season: number, teamId: number): Promise<unknown> {
  const results = await fetchFootball<unknown>('/teams/statistics', { league: leagueId, season, team: teamId });
  return results[0] ?? results;
}

// Statuses that mean the match produced a final result. AET/PEN matter for
// Champions League knockouts — a match decided in extra time still settles.
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);

export async function getFixtureResult(fixtureId: number): Promise<{
  homeGoals: number;
  awayGoals: number;
  halftimeHomeGoals: number | null;
  halftimeAwayGoals: number | null;
  status: string;
  finished: boolean;
} | null> {
  const results = await fetchFootball<ApiFootballFixture>('/fixtures', { id: fixtureId });
  const fixture = results[0];
  if (!fixture) return null;

  // Betting markets settle on the 90-minute score. For AET/PEN matches,
  // fixture.goals includes extra time — score.fulltime is the 90' result.
  const homeGoals = fixture.score?.fulltime.home ?? fixture.goals.home;
  const awayGoals = fixture.score?.fulltime.away ?? fixture.goals.away;
  if (homeGoals === null || awayGoals === null) return null;

  const status = fixture.fixture.status.short;
  return {
    homeGoals,
    awayGoals,
    halftimeHomeGoals: fixture.score?.halftime.home ?? null,
    halftimeAwayGoals: fixture.score?.halftime.away ?? null,
    status,
    finished: FINISHED_STATUSES.has(status),
  };
}

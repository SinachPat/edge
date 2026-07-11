import { env } from './env';
import type { ApiFootballFixture, ApiFootballPrediction } from '@/types/api';

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
  return fetchFootball<ApiFootballFixture>('/fixtures/headtohead', { h2h: `${teamA}-${teamB}`, last });
}

export async function getInjuries(fixtureId: number): Promise<unknown[]> {
  return fetchFootball<unknown>('/injuries', { fixture: fixtureId });
}

export async function getLineup(fixtureId: number): Promise<unknown[]> {
  return fetchFootball<unknown>('/fixtures/lineups', { fixture: fixtureId });
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

export async function getFixtureResult(
  fixtureId: number
): Promise<{ homeGoals: number; awayGoals: number; status: string; finished: boolean } | null> {
  const results = await fetchFootball<ApiFootballFixture>('/fixtures', { id: fixtureId });
  const fixture = results[0];
  if (!fixture) return null;

  // Betting markets settle on the 90-minute score. For AET/PEN matches,
  // fixture.goals includes extra time — score.fulltime is the 90' result.
  const homeGoals = fixture.score?.fulltime.home ?? fixture.goals.home;
  const awayGoals = fixture.score?.fulltime.away ?? fixture.goals.away;
  if (homeGoals === null || awayGoals === null) return null;

  const status = fixture.fixture.status.short;
  return { homeGoals, awayGoals, status, finished: FINISHED_STATUSES.has(status) };
}

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { getScores, getSupportedSports } from '@/lib/odds-api';
import { normalizeName } from '@/lib/normalize';
import { createServerClient } from '@/lib/supabase';
import type { ConfidenceTier, PickStatus } from '@/types/edge';

export interface FixturePickSummary {
  readonly id: string;
  readonly marketType: string;
  readonly selection: string;
  readonly confidenceTier: ConfidenceTier;
  readonly status: PickStatus;
}

export interface SportOption {
  readonly key: string;
  readonly group: string;
  readonly title: string;
}

export interface FixtureSummary {
  readonly eventId: string;
  readonly kickoff: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeScore: string | null;
  readonly awayScore: string | null;
  readonly completed: boolean;
  readonly live: boolean;
  readonly picks: FixturePickSummary[];
}

function scoreFor(scores: ReadonlyArray<{ name: string; score: string }> | null | undefined, team: string): string | null {
  if (!scores) return null;
  const teamKey = normalizeName(team);
  return scores.find((s) => normalizeName(s.name) === teamKey)?.score ?? null;
}

export const fixturesRouter = router({
  // Sport catalog for the picker. The /sports call is free and cached 1h in
  // lib/odds-api.ts. Outright/futures markets (e.g. "World Cup Winner") have
  // no home/away fixture structure, so they're excluded.
  getSports: protectedProcedure.query(async (): Promise<SportOption[]> => {
    const sports = await getSupportedSports();
    return sports
      .filter((s) => s.active && !s.has_outrights)
      .map(({ key, group, title }) => ({ key, group, title }))
      .sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title));
  }),

  // Live + upcoming + recently completed games for one sport, with EDGE's
  // picks overlaid. Data source is The Odds API /scores (2 credits, cached
  // 30 min server-side) — deliberately NOT API-Football, whose free tier
  // can't do league-filtered current-season queries. Picks are matched by
  // normalized team names on the same UTC date, which works for every sport
  // and for existing soccer picks that only carry an API-Football fixture id.
  getBySport: protectedProcedure
    .input(z.object({ sportKey: z.string().regex(/^[a-z0-9_]+$/, 'Invalid sport key') }))
    .query(async ({ input }): Promise<{ fixtures: FixtureSummary[]; error: string | null }> => {
      let events;
      try {
        events = await getScores(input.sportKey);
      } catch (err) {
        return { fixtures: [], error: err instanceof Error ? err.message : String(err) };
      }

      const supabase = createServerClient();
      const windowStart = new Date(Date.now() - 4 * 86400000).toISOString();
      const { data: picks } = await supabase
        .from('picks')
        .select('id, home_team, away_team, match_date, market_type, selection, confidence_tier, status')
        .gte('match_date', windowStart);

      const picksByMatch = new Map<string, FixturePickSummary[]>();
      for (const pick of picks ?? []) {
        const key = `${normalizeName(pick.home_team)}|${normalizeName(pick.away_team)}|${pick.match_date.slice(0, 10)}`;
        const list = picksByMatch.get(key) ?? [];
        list.push({
          id: pick.id,
          marketType: pick.market_type,
          selection: pick.selection,
          confidenceTier: pick.confidence_tier,
          status: pick.status,
        });
        picksByMatch.set(key, list);
      }

      const now = Date.now();
      const fixtures: FixtureSummary[] = events
        .map((ev) => {
          const completed = ev.completed ?? false;
          const matchKey = `${normalizeName(ev.home_team)}|${normalizeName(ev.away_team)}|${ev.commence_time.slice(0, 10)}`;
          return {
            eventId: ev.id,
            kickoff: ev.commence_time,
            homeTeam: ev.home_team,
            awayTeam: ev.away_team,
            homeScore: scoreFor(ev.scores, ev.home_team),
            awayScore: scoreFor(ev.scores, ev.away_team),
            completed,
            live: !completed && new Date(ev.commence_time).getTime() <= now,
            picks: picksByMatch.get(matchKey) ?? [],
          };
        })
        // Live first, then upcoming soonest-first, then completed most-recent-first.
        .sort((a, b) => {
          const rank = (f: FixtureSummary) => (f.live ? 0 : !f.completed ? 1 : 2);
          if (rank(a) !== rank(b)) return rank(a) - rank(b);
          return rank(a) === 2 ? b.kickoff.localeCompare(a.kickoff) : a.kickoff.localeCompare(b.kickoff);
        });

      return { fixtures, error: null };
    }),
});

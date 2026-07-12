import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { fetchFixturesForDate } from '@/pipeline/data-fetch';
import { createServerClient } from '@/lib/supabase';
import type { ConfidenceTier, PickStatus } from '@/types/edge';

export interface FixturePickSummary {
  readonly id: string;
  readonly marketType: string;
  readonly selection: string;
  readonly confidenceTier: ConfidenceTier;
  readonly status: PickStatus;
}

export interface FixtureSummary {
  readonly fixtureId: number;
  readonly kickoff: string;
  readonly statusShort: string;
  readonly statusLong: string;
  readonly elapsed: number | null;
  readonly league: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeLogo: string;
  readonly awayLogo: string;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly picks: FixturePickSummary[];
}

export const fixturesRouter = router({
  // Browses the live API-Football fixture list for a single date across the
  // leagues EDGE tracks (EPL, Champions League, La Liga) — independent of
  // whether EDGE generated a pick for any of them. Free-tier API-Football
  // keys only allow a narrow date window around the real current date; an
  // out-of-range date fails the underlying call, so this reports that as
  // `error` instead of throwing, letting the UI show a clear message.
  getByDate: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD') }))
    .query(async ({ input }): Promise<{ fixtures: FixtureSummary[]; error: string | null }> => {
      let fixtures;
      try {
        fixtures = await fetchFixturesForDate(input.date);
      } catch (err) {
        return { fixtures: [], error: err instanceof Error ? err.message : String(err) };
      }

      const fixtureIds = fixtures.map((f) => String(f.fixture.id));
      const supabase = createServerClient();
      const { data: picks } = fixtureIds.length
        ? await supabase
            .from('picks')
            .select('id, fixture_id, market_type, selection, confidence_tier, status')
            .in('fixture_id', fixtureIds)
        : { data: [] };

      const picksByFixture = new Map<string, FixturePickSummary[]>();
      for (const pick of picks ?? []) {
        if (!pick.fixture_id) continue;
        const list = picksByFixture.get(pick.fixture_id) ?? [];
        list.push({
          id: pick.id,
          marketType: pick.market_type,
          selection: pick.selection,
          confidenceTier: pick.confidence_tier,
          status: pick.status,
        });
        picksByFixture.set(pick.fixture_id, list);
      }

      const summaries: FixtureSummary[] = fixtures
        .map((f) => ({
          fixtureId: f.fixture.id,
          kickoff: f.fixture.date,
          statusShort: f.fixture.status.short,
          statusLong: f.fixture.status.long,
          elapsed: f.fixture.status.elapsed,
          league: f.league.name,
          homeTeam: f.teams.home.name,
          awayTeam: f.teams.away.name,
          homeLogo: f.teams.home.logo,
          awayLogo: f.teams.away.logo,
          homeGoals: f.score?.fulltime.home ?? f.goals.home,
          awayGoals: f.score?.fulltime.away ?? f.goals.away,
          picks: picksByFixture.get(String(f.fixture.id)) ?? [],
        }))
        .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

      return { fixtures: summaries, error: null };
    }),
});

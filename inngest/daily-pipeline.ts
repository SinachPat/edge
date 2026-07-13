import { inngest } from './client';
import { fetchFixturesForDate, fetchAllSoccerOdds, enrichFixtures, fetchUsSportsFixtures } from '@/pipeline/data-fetch';
import { runStage1 } from '@/pipeline/stage1-signal-scoring';
import { runStage2 } from '@/pipeline/stage2-pick-reasoning';
import { runStage3 } from '@/pipeline/stage3-ticket-assembly';
import { calculateStake } from '@/lib/kelly';
import { createServerClient } from '@/lib/supabase';

// 3 tickets × 3 non-repeating picks — the count Stage 3 needs to assemble a
// full parlay session. Below this, there still might be real edge on the
// table; only true zero qualifying picks means there's nothing to show.
const FULL_SESSION_PICKS = 9;

const LAYER_NAMES = [
  'H2H Record',
  'Current Form',
  'Home/Away Differential',
  'Injury & Lineup Intelligence',
  'Market Odds Signal',
  'EV Detection',
  'AI Statistical Model',
] as const;

function todayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

export const ALL_PIPELINE_SPORTS = ['soccer', 'basketball', 'baseball', 'american-football'] as const;
export type PipelineSport = (typeof ALL_PIPELINE_SPORTS)[number];

// Fired by the "Run Session" button (server/routers/sessions.ts) for an
// on-demand run any time of day, alongside the existing 06:00 UTC cron.
// Verified against the installed SDK's trigger schema that a mixed
// cron+event triggers array is supported (node_modules/inngest/types.d.ts).
export const RUN_SESSION_EVENT = 'session/run.requested';

export const dailyPipeline = inngest.createFunction(
  // Throttled from daily to Mon/Thu (2026-07-13) — daily runs across all 4 sports
  // were burning the monthly Odds API / API-Football / SharpAPI credit allotment
  // before the billing cycle reset. "Run Session" on /dashboard still works any
  // day for whatever credit is left. Bump this back up once budget allows.
  { id: 'daily-prediction-pipeline', triggers: [{ cron: '0 6 * * 1,4' }, { event: RUN_SESSION_EVENT }] },
  async ({ event, step }) => {
    const date = todayISODate();
    // Cron-triggered runs carry no custom data — default to soccer only (the
    // cheapest, highest-signal slice) to conserve credit. Manually trigger
    // other sports via "Run Session" when you want to spend remaining budget
    // on NBA/MLB/NFL. Manually-triggered runs specify which sports to include.
    const requestedSports: readonly PipelineSport[] =
      event?.name === RUN_SESSION_EVENT && Array.isArray(event.data?.sports) ? event.data.sports : ['soccer'];

    // Written first (upsert, not insert — sessions.date is UNIQUE, and a
    // manual run can start on a day the cron already touched) so the
    // dashboard shows the run is actually in progress rather than looking
    // identical to "no session yet" for the couple of minutes this takes.
    await step.run('mark-running', async () => {
      const supabase = createServerClient();
      await supabase.from('sessions').upsert({ date, status: 'running' }, { onConflict: 'date' });
    });

    const includeSoccer = requestedSports.includes('soccer');
    const soccerFixtures = includeSoccer
      ? await step.run('enrich-fixtures', async () => {
          const [fixtures, oddsEvents] = await Promise.all([fetchFixturesForDate(date), fetchAllSoccerOdds()]);
          return enrichFixtures(fixtures, oddsEvents);
        })
      : [];
    // NBA/MLB/NFL — fixtures + H2H from API-Sports, odds from The Odds API.
    // Failures inside are per-sport (logged and skipped), so an off-season or
    // erroring sport never blocks the others or the soccer path.
    const usSports = requestedSports.filter((s): s is Exclude<PipelineSport, 'soccer'> => s !== 'soccer');
    const usFixtures =
      usSports.length > 0 ? await step.run('fetch-us-sports', async () => fetchUsSportsFixtures(date, usSports)) : [];
    const rawFixtures = [...soccerFixtures, ...usFixtures];

    const qualified = await step.run('stage1-signal-scoring', async () => runStage1(rawFixtures));

    if (qualified.length === 0) {
      await step.run('write-held-session', async () => {
        const supabase = createServerClient();
        await supabase.from('sessions').upsert(
          {
            date,
            status: 'held',
            reason_held: 'No fixtures cleared the 4-of-7 signal bar today.',
            picks_qualified: 0,
          },
          { onConflict: 'date' }
        );
      });
      return { held: true, reason: 'insufficient_data', picksQualified: 0 };
    }

    const topCandidates = [...qualified]
      .sort((a, b) => b.signalCount - a.signalCount || (b.evScore ?? 0) - (a.evScore ?? 0))
      .slice(0, FULL_SESSION_PICKS);

    const reasonedPicks = await step.run('stage2-reasoning', async () => runStage2(topCandidates));

    // Stage 3 assembles exactly 3 non-repeating 3-leg tickets, which needs 9
    // distinct picks minimum — below that there's no valid way to fill the
    // parlay structure, so skip straight to showing the individual picks
    // instead of forcing a smaller/invalid ticket shape.
    const tickets =
      topCandidates.length >= FULL_SESSION_PICKS
        ? await step.run('stage3-assembly', async () => runStage3(reasonedPicks))
        : [];

    const result = await step.run('persist-to-supabase', async () => {
      const supabase = createServerClient();

      const { data: bankroll } = await supabase
        .from('bankroll')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      const bankrollBalance = bankroll?.closing_balance ?? bankroll?.opening_balance ?? 0;
      if (!bankroll) {
        console.warn('[daily-pipeline] no bankroll record found — stakes will be calculated against a $0 balance');
      }

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .upsert(
          {
            date,
            status: 'generated',
            picks_qualified: qualified.length,
            tickets_generated: tickets.length,
          },
          { onConflict: 'date' }
        )
        .select()
        .single();
      if (sessionError || !session) {
        throw new Error(`Failed to create session: ${sessionError?.message}`);
      }

      // Kelly-size every pick first, then enforce the session-level ceiling:
      // per-tier caps alone allow nine picks to sum well past the PRD's hard
      // 6% max-at-risk rule, so scale all stakes down proportionally if the
      // session total exceeds it (preserves relative Kelly sizing).
      const MAX_SESSION_STAKE_PCT = 6;
      const stakes = reasonedPicks.map((pick) =>
        calculateStake({
          odds: pick.odds,
          confidencePct: pick.confidencePct,
          confidenceTier: pick.finalConfidenceTier,
          bankrollBalance,
        })
      );
      const totalStakePct = stakes.reduce((sum, s) => sum + s.stakePct, 0);
      if (totalStakePct > MAX_SESSION_STAKE_PCT) {
        const scale = MAX_SESSION_STAKE_PCT / totalStakePct;
        for (const s of stakes) {
          s.stakePct = Number((s.stakePct * scale).toFixed(2));
          s.stakeAmount = Number((s.stakeAmount * scale).toFixed(2));
        }
        console.warn(
          `[daily-pipeline] session stake ${totalStakePct.toFixed(2)}% exceeded the ${MAX_SESSION_STAKE_PCT}% cap — scaled all stakes by ${scale.toFixed(3)}`
        );
      }

      const indexToPickId = new Map<string, string>();
      const stakeByIndex = new Map<string, number>();

      for (const [index, pick] of reasonedPicks.entries()) {
        const { stakePct, stakeAmount } = stakes[index];

        const { data: insertedPick, error: pickError } = await supabase
          .from('picks')
          .insert({
            session_id: session.id,
            sport: pick.sport,
            competition: pick.competition,
            home_team: pick.homeTeam,
            away_team: pick.awayTeam,
            fixture_id: pick.fixtureId,
            odds_event_id: pick.oddsEventId ?? null,
            odds_sport_key: pick.oddsSportKey ?? null,
            match_date: pick.matchDate,
            market_type: pick.marketType,
            selection: pick.selection,
            odds: pick.odds,
            confidence_tier: pick.finalConfidenceTier,
            confidence_pct: pick.confidencePct,
            ev_score: pick.evScore,
            signal_count: pick.signalCount,
            rationale: pick.rationale,
            key_risk: pick.keyRisk,
            best_odds_book: pick.bestOddsBook,
            stake_pct: stakePct,
            stake_amount: stakeAmount,
          })
          .select()
          .single();
        if (pickError || !insertedPick) {
          throw new Error(`Failed to insert pick ${pick.fixtureId}: ${pickError?.message}`);
        }

        indexToPickId.set(String(index), insertedPick.id);
        stakeByIndex.set(String(index), stakeAmount);

        const layerKeys = ['layer1', 'layer2', 'layer3', 'layer4', 'layer5', 'layer6', 'layer7'] as const;
        await supabase.from('signal_log').insert(
          layerKeys.map((key, layerIndex) => ({
            pick_id: insertedPick.id,
            layer: layerIndex + 1,
            layer_name: LAYER_NAMES[layerIndex],
            result: pick.signalResults[key],
            detail: pick.signalNotes ? { note: pick.signalNotes[key] } : null,
          }))
        );
      }

      for (const ticket of tickets) {
        const pickIds = ticket.pickIds.map((i) => indexToPickId.get(i)).filter((id): id is string => Boolean(id));
        const totalStake = ticket.pickIds.reduce((sum, i) => sum + (stakeByIndex.get(i) ?? 0), 0);

        await supabase.from('tickets').insert({
          session_id: session.id,
          ticket_type: ticket.type,
          pick_ids: pickIds,
          combined_odds: ticket.combinedOdds,
          total_stake: totalStake,
          assembly_note: ticket.rationale,
        });
      }

      return { sessionId: session.id, picksCount: reasonedPicks.length, ticketsCount: tickets.length };
    });

    return { success: true, ...result };
  }
);

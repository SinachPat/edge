import { inngest } from './client';
import { fetchFixturesForDate, fetchAllSoccerOdds, enrichFixtures, fetchUsSportsFixtures } from '@/pipeline/data-fetch';
import { runStage1 } from '@/pipeline/stage1-signal-scoring';
import { runStage2 } from '@/pipeline/stage2-pick-reasoning';
import { runStage3 } from '@/pipeline/stage3-ticket-assembly';
import { calculateStake } from '@/lib/kelly';
import { createServerClient } from '@/lib/supabase';

const MIN_QUALIFIED_PICKS = 9;

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

export const dailyPipeline = inngest.createFunction(
  { id: 'daily-prediction-pipeline', triggers: [{ cron: '0 6 * * *' }] }, // 06:00 UTC daily
  async ({ step }) => {
    const date = todayISODate();

    const fixtures = await step.run('fetch-fixtures', async () => fetchFixturesForDate(date));
    const oddsEvents = await step.run('fetch-odds', async () => fetchAllSoccerOdds());
    const soccerFixtures = await step.run('enrich-fixtures', async () => enrichFixtures(fixtures, oddsEvents));
    // NBA/MLB/NFL — fixtures + H2H from API-Sports, odds from The Odds API.
    // Failures inside are per-sport (logged and skipped), so an off-season or
    // erroring sport never blocks the others or the soccer path.
    const usFixtures = await step.run('fetch-us-sports', async () => fetchUsSportsFixtures(date));
    const rawFixtures = [...soccerFixtures, ...usFixtures];

    const qualified = await step.run('stage1-signal-scoring', async () => runStage1(rawFixtures));

    if (qualified.length < MIN_QUALIFIED_PICKS) {
      await step.run('write-held-session', async () => {
        const supabase = createServerClient();
        await supabase.from('sessions').insert({
          date,
          status: 'held',
          reason_held: `Only ${qualified.length} picks qualified (need ${MIN_QUALIFIED_PICKS})`,
          picks_qualified: qualified.length,
        });
      });
      return { held: true, reason: 'insufficient_data', picksQualified: qualified.length };
    }

    const topCandidates = [...qualified]
      .sort((a, b) => b.signalCount - a.signalCount || (b.evScore ?? 0) - (a.evScore ?? 0))
      .slice(0, MIN_QUALIFIED_PICKS);

    const reasonedPicks = await step.run('stage2-reasoning', async () => runStage2(topCandidates));

    const tickets = await step.run('stage3-assembly', async () => runStage3(reasonedPicks));

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
        .insert({
          date,
          status: 'generated',
          picks_qualified: qualified.length,
          tickets_generated: tickets.length,
        })
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

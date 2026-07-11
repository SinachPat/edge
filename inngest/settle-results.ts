import { inngest } from './client';
import { getFixtureResult } from '@/lib/api-football';
import { getClosingLineValue } from '@/lib/sharpapi';
import { createServerClient } from '@/lib/supabase';
import type { Pick } from '@/types/edge';

export type SettlementResult = 'won' | 'lost' | 'void';

// Narrowed to just the two fields this actually reads, so callers can pass a
// partial pick shape without an unsafe cast.
export function evaluatePickResult(
  pick: { market_type: Pick['market_type']; selection: Pick['selection'] },
  result: { homeGoals: number; awayGoals: number }
): SettlementResult {
  const market = `${pick.market_type} ${pick.selection}`.toLowerCase();
  const { homeGoals, awayGoals } = result;
  const total = homeGoals + awayGoals;

  // We only fetch full-time scores. Half-time and timing markets can't be
  // graded from that — without this guard, "First Half result Home" would
  // match the 1x2/result branch below and settle against the 90' score.
  if (market.includes('first half') || market.includes('1st half') || market.includes('half time') || market.includes('half-time')) {
    return 'void';
  }

  if (market.includes('btts') || market.includes('both teams to score')) {
    if (market.includes('yes')) return homeGoals > 0 && awayGoals > 0 ? 'won' : 'lost';
    if (market.includes('no')) return homeGoals === 0 || awayGoals === 0 ? 'won' : 'lost';
    return 'void';
  }

  if (market.includes('double chance')) {
    if (market.includes('1x')) return homeGoals >= awayGoals ? 'won' : 'lost';
    if (market.includes('x2')) return awayGoals >= homeGoals ? 'won' : 'lost';
    if (market.includes('12')) return homeGoals !== awayGoals ? 'won' : 'lost';
    return 'void';
  }

  const overUnder = market.match(/(over|under)\s*(\d+(?:\.\d+)?)/);
  if (overUnder) {
    const threshold = Number(overUnder[2]);
    return overUnder[1] === 'over' ? (total > threshold ? 'won' : 'lost') : total < threshold ? 'won' : 'lost';
  }

  if (market.includes('asian handicap')) {
    // Only the -0.5/+0.5/-1 handicaps Stage 1 generates are resolved here.
    // Whole-number pushes on unusual handicaps are marked void rather than guessed.
    const handicapMatch = market.match(/(-?\+?\d+(?:\.\d+)?)/);
    const isHome = market.includes('home');
    const isAway = market.includes('away');
    if (handicapMatch && (isHome || isAway)) {
      const handicap = Number(handicapMatch[1]);
      const adjustedHome = homeGoals + (isHome ? handicap : 0);
      const adjustedAway = awayGoals + (isAway ? handicap : 0);
      if (adjustedHome === adjustedAway) return 'void'; // push
      return isHome ? (adjustedHome > adjustedAway ? 'won' : 'lost') : adjustedAway > adjustedHome ? 'won' : 'lost';
    }
    return 'void';
  }

  if (market.includes('1x2') || market.includes('result')) {
    if (market.includes('home')) return homeGoals > awayGoals ? 'won' : 'lost';
    if (market.includes('away')) return awayGoals > homeGoals ? 'won' : 'lost';
    if (market.includes('draw')) return homeGoals === awayGoals ? 'won' : 'lost';
  }

  return 'void';
}

export const settleResults = inngest.createFunction(
  { id: 'settle-results', triggers: [{ cron: '0 22 * * *' }] }, // 22:00 UTC — after most European evening fixtures
  async ({ step }) => {
    const pending = await step.run('fetch-pending-picks', async () => {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('picks')
        .select('*')
        .eq('status', 'pending')
        .lte('match_date', new Date().toISOString());
      return (data ?? []) as Pick[];
    });

    const settledPickIds = await step.run('settle-picks', async () => {
      const supabase = createServerClient();
      const settled: string[] = [];

      for (const pick of pending) {
        if (!pick.fixture_id) continue;
        const result = await getFixtureResult(Number(pick.fixture_id));
        if (!result || !result.finished) continue; // match not finished yet

        const outcome = evaluatePickResult(pick, result);
        await supabase
          .from('picks')
          .update({
            status: outcome,
            settled_at: new Date().toISOString(),
            final_home_goals: result.homeGoals,
            final_away_goals: result.awayGoals,
          })
          .eq('id', pick.id);
        settled.push(pick.id);
      }

      return settled;
    });

    await step.run('log-clv', async () => {
      const supabase = createServerClient();

      for (const pickId of settledPickIds) {
        const pick = pending.find((p) => p.id === pickId);
        if (!pick?.fixture_id) continue;

        // SharpAPI's event namespace does not map 1:1 to API-Football fixture
        // IDs — best-effort lookup pending a proper cross-provider ID map.
        const clv = await getClosingLineValue(pick.fixture_id, pick.odds, pick.market_type);
        if (!clv) continue;

        await supabase.from('picks').update({ closing_odds: clv.closingOdds, clv: clv.clv }).eq('id', pickId);
      }
    });

    const ticketSettlement = await step.run('settle-tickets', async () => {
      const supabase = createServerClient();
      const { data: pendingTickets } = await supabase.from('tickets').select('*').eq('status', 'pending');

      let totalPnl = 0;
      let totalStaked = 0;
      let totalReturned = 0;
      let winCount = 0;
      let lossCount = 0;

      for (const ticket of pendingTickets ?? []) {
        const { data: legs } = await supabase.from('picks').select('status, odds').in('id', ticket.pick_ids);
        if (!legs || legs.length !== ticket.pick_ids.length || legs.some((leg) => leg.status === 'pending')) {
          continue; // not all legs settled yet
        }

        // Standard accumulator settlement: a void leg drops out at odds 1.0
        // rather than losing the ticket. The ticket only loses if a decided
        // leg lost; if every leg voided, the stake is returned (P&L 0).
        const anyLost = legs.some((leg) => leg.status === 'lost');
        const effectiveOdds = legs
          .filter((leg) => leg.status === 'won')
          .reduce((product, leg) => product * Number(leg.odds), 1);

        const stake = ticket.total_stake ?? 0;
        const won = !anyLost;
        const totalReturn = won ? stake * effectiveOdds : 0;
        const profitLoss = totalReturn - stake;

        await supabase
          .from('tickets')
          .update({ status: won ? 'won' : 'lost', profit_loss: profitLoss, total_return: totalReturn })
          .eq('id', ticket.id);

        totalPnl += profitLoss;
        totalStaked += stake;
        totalReturned += totalReturn;
        if (won) winCount += 1;
        else lossCount += 1;
      }

      return { totalPnl, totalStaked, totalReturned, winCount, lossCount };
    });

    await step.run('update-bankroll', async () => {
      const supabase = createServerClient();
      const today = new Date().toISOString().split('T')[0];

      const { data: existing } = await supabase.from('bankroll').select('*').eq('date', today).maybeSingle();
      const { data: previous } = await supabase
        .from('bankroll')
        .select('*')
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const openingBalance = existing?.opening_balance ?? previous?.closing_balance ?? 0;
      const priorClosing = existing?.closing_balance ?? openingBalance;
      const closingBalance = priorClosing + ticketSettlement.totalPnl;

      const totalStaked = (existing?.total_staked ?? previous?.total_staked ?? 0) + ticketSettlement.totalStaked;
      const totalReturned = (existing?.total_returned ?? previous?.total_returned ?? 0) + ticketSettlement.totalReturned;
      const winCount = (existing?.win_count ?? previous?.win_count ?? 0) + ticketSettlement.winCount;
      const lossCount = (existing?.loss_count ?? previous?.loss_count ?? 0) + ticketSettlement.lossCount;
      const runningRoi = totalStaked > 0 ? ((totalReturned - totalStaked) / totalStaked) * 100 : 0;

      await supabase.from('bankroll').upsert(
        {
          date: today,
          opening_balance: openingBalance,
          closing_balance: closingBalance,
          total_staked: totalStaked,
          total_returned: totalReturned,
          win_count: winCount,
          loss_count: lossCount,
          running_roi: runningRoi,
          sessions_count: existing?.sessions_count ?? previous?.sessions_count ?? 0,
        },
        { onConflict: 'date' }
      );
    });

    return { settledPicks: settledPickIds.length, ...ticketSettlement };
  }
);

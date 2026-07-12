import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createServerClient } from '@/lib/supabase';
import type { BankrollSnapshot, ConfidenceTier } from '@/types/edge';

const TIERS: ConfidenceTier[] = ['DIAMOND', 'GOLD', 'SILVER'];

// total_staked/total_returned on each row are cumulative-to-date, so a rolling
// N-day ROI is the delta between "now" and the last snapshot before the window.
function rollingRoi(rows: BankrollSnapshot[], days: number): number {
  if (rows.length === 0) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const latest = rows[rows.length - 1];
  const baseline = [...rows].reverse().find((r) => r.date <= cutoffStr);
  const stakedInPeriod = latest.total_staked - (baseline?.total_staked ?? 0);
  const returnedInPeriod = latest.total_returned - (baseline?.total_returned ?? 0);

  return stakedInPeriod > 0 ? ((returnedInPeriod - stakedInPeriod) / stakedInPeriod) * 100 : 0;
}

export const bankrollRouter = router({
  getCurrent: protectedProcedure.query(async () => {
    const supabase = createServerClient();
    const { data } = await supabase.from('bankroll').select('*').order('date', { ascending: false }).limit(1).maybeSingle();
    return data;
  }),

  getHistory: protectedProcedure.input(z.object({ days: z.number().default(90) })).query(async ({ input }) => {
    const supabase = createServerClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - input.days);
    const { data } = await supabase
      .from('bankroll')
      .select('*')
      .gte('date', cutoff.toISOString().split('T')[0])
      .order('date', { ascending: true });
    return data ?? [];
  }),

  getOverallStats: protectedProcedure.query(async () => {
    const supabase = createServerClient();
    const { data } = await supabase.from('bankroll').select('*').order('date', { ascending: true });
    const rows = data ?? [];

    const { count: sessionsCount } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'generated');

    if (rows.length === 0) {
      return {
        currentBalance: 0,
        startingBalance: 0,
        totalROI: 0,
        totalProfit: 0,
        bestDay: 0,
        worstDay: 0,
        longestWinStreak: 0,
        currentStreak: 0,
        sessionsCount: sessionsCount ?? 0,
        roi7d: 0,
        roi30d: 0,
        roi90d: 0,
      };
    }

    const startingBalance = rows[0].opening_balance;
    const latest = rows[rows.length - 1];
    const currentBalance = latest.closing_balance ?? latest.opening_balance;
    const totalROI = latest.running_roi ?? 0;
    // Manual adjustments (deposits/withdrawals/corrections) move the balance
    // without being betting profit — exclude them so "Total P&L" reflects
    // actual betting performance, not capital the user added or removed.
    const totalAdjustments = rows.reduce((sum, r) => sum + (r.adjustment_amount ?? 0), 0);
    const totalProfit = currentBalance - startingBalance - totalAdjustments;

    const dailyPnls = rows.map(
      (r) => (r.closing_balance ?? r.opening_balance) - r.opening_balance - (r.adjustment_amount ?? 0)
    );
    const bestDay = Math.max(...dailyPnls);
    const worstDay = Math.min(...dailyPnls);

    let longestWinStreak = 0;
    let run = 0;
    for (const pnl of dailyPnls) {
      run = pnl > 0 ? run + 1 : 0;
      longestWinStreak = Math.max(longestWinStreak, run);
    }

    let currentStreak = 0;
    for (let i = dailyPnls.length - 1; i >= 0; i--) {
      const pnl = dailyPnls[i];
      if (i === dailyPnls.length - 1) {
        currentStreak = pnl > 0 ? 1 : pnl < 0 ? -1 : 0;
        continue;
      }
      const continuesStreak = currentStreak > 0 ? pnl > 0 : currentStreak < 0 ? pnl < 0 : false;
      if (!continuesStreak) break;
      currentStreak += currentStreak > 0 ? 1 : -1;
    }

    return {
      currentBalance,
      startingBalance,
      totalROI,
      totalProfit,
      bestDay,
      worstDay,
      longestWinStreak,
      currentStreak,
      sessionsCount: sessionsCount ?? 0,
      roi7d: rollingRoi(rows, 7),
      roi30d: rollingRoi(rows, 30),
      roi90d: rollingRoi(rows, 90),
    };
  }),

  // Per-tier breakdown for the bankroll page. P&L is approximated at the
  // individual-pick level (stake * (odds - 1) if won, -stake if lost) since
  // real payouts settle at the ticket level, not per pick.
  getTierBreakdown: protectedProcedure.query(async () => {
    const supabase = createServerClient();
    const { data } = await supabase.from('picks').select('status, odds, stake_amount, confidence_tier');
    const rows = data ?? [];

    return TIERS.map((tier) => {
      const tierRows = rows.filter((p) => p.confidence_tier === tier);
      const won = tierRows.filter((p) => p.status === 'won');
      const lost = tierRows.filter((p) => p.status === 'lost');
      const settled = won.length + lost.length;
      const avgOdds = tierRows.length > 0 ? tierRows.reduce((sum, p) => sum + Number(p.odds), 0) / tierRows.length : 0;
      const pnl =
        won.reduce((sum, p) => sum + Number(p.stake_amount ?? 0) * (Number(p.odds) - 1), 0) -
        lost.reduce((sum, p) => sum + Number(p.stake_amount ?? 0), 0);

      return {
        tier,
        totalBets: tierRows.length,
        won: won.length,
        lost: lost.length,
        winRate: settled > 0 ? (won.length / settled) * 100 : 0,
        avgOdds,
        pnl,
      };
    });
  }),

  initializeBankroll: protectedProcedure.input(z.object({ startingBalance: z.number().positive() })).mutation(async ({ input }) => {
    const supabase = createServerClient();
    const { data: existing } = await supabase.from('bankroll').select('id').limit(1).maybeSingle();
    if (existing) {
      throw new Error('Bankroll already initialized');
    }

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('bankroll')
      .insert({ date: today, opening_balance: input.startingBalance, closing_balance: input.startingBalance })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  // Corrects the current balance (deposit, withdrawal, or fixing a mistaken
  // starting number) without touching betting history. Recorded as
  // adjustment_amount on the affected day so ROI/streak/best-day stats keep
  // measuring betting performance rather than capital moved in or out.
  adjustBalance: protectedProcedure
    .input(z.object({ newBalance: z.number().positive(), note: z.string().max(200).optional() }))
    .mutation(async ({ input }) => {
      const supabase = createServerClient();
      const { data: latest } = await supabase
        .from('bankroll')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latest) {
        throw new Error('Set up your bankroll first');
      }

      const today = new Date().toISOString().split('T')[0];
      const currentClosing = latest.closing_balance ?? latest.opening_balance;
      const delta = input.newBalance - currentClosing;

      if (latest.date === today) {
        const { data, error } = await supabase
          .from('bankroll')
          .update({
            closing_balance: input.newBalance,
            adjustment_amount: (latest.adjustment_amount ?? 0) + delta,
            adjustment_note: input.note ?? latest.adjustment_note ?? null,
          })
          .eq('date', today)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      }

      // No pipeline has run today yet — open a fresh row carrying the
      // adjustment forward, same shape settle-results.ts writes.
      const { data, error } = await supabase
        .from('bankroll')
        .insert({
          date: today,
          opening_balance: currentClosing,
          closing_balance: input.newBalance,
          adjustment_amount: delta,
          adjustment_note: input.note ?? null,
          total_staked: latest.total_staked ?? 0,
          total_returned: latest.total_returned ?? 0,
          win_count: latest.win_count ?? 0,
          loss_count: latest.loss_count ?? 0,
          running_roi: latest.running_roi ?? 0,
          sessions_count: latest.sessions_count ?? 0,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),
});

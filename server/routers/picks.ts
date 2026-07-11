import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createServerClient } from '@/lib/supabase';
import type { ConfidenceTier, Session, Ticket, Pick, SignalLog } from '@/types/edge';

const TIERS: ConfidenceTier[] = ['DIAMOND', 'GOLD', 'SILVER'];

export const picksRouter = router({
  getToday: protectedProcedure.query(async (): Promise<(Session & { tickets: Ticket[]; picks: Pick[] }) | null> => {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('sessions').select('*, tickets(*), picks(*)').eq('date', today).maybeSingle();
    return data;
  }),

  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(100) }))
    .query(async ({ input }): Promise<(Pick & { sessions: { date: string } | null })[]> => {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('picks')
        .select('*, sessions(date)')
        .order('created_at', { ascending: false })
        .limit(input.limit);
      return data ?? [];
    }),

  getById: protectedProcedure.input(z.string()).query(async ({ input }) => {
    const supabase = createServerClient();
    const { data } = await supabase.from('picks').select('*, signal_log(*)').eq('id', input).single();
    return data as (Pick & { signal_log: SignalLog[] }) | null;
  }),

  getStats: protectedProcedure.query(async () => {
    const supabase = createServerClient();
    const { data } = await supabase.from('picks').select('status, odds, ev_score, clv, confidence_tier');
    const rows = data ?? [];

    const wonPicks = rows.filter((p) => p.status === 'won').length;
    const lostPicks = rows.filter((p) => p.status === 'lost').length;
    const pendingPicks = rows.filter((p) => p.status === 'pending').length;
    const settledCount = wonPicks + lostPicks;
    const winRate = settledCount > 0 ? (wonPicks / settledCount) * 100 : 0;
    const avgOdds = rows.length > 0 ? rows.reduce((sum, p) => sum + Number(p.odds), 0) / rows.length : 0;

    const evRows = rows.filter((p) => p.ev_score !== null);
    const avgEV = evRows.length > 0 ? evRows.reduce((sum, p) => sum + Number(p.ev_score), 0) / evRows.length : 0;

    const clvRows = rows.filter((p) => p.clv !== null);
    const avgCLV = clvRows.length > 0 ? clvRows.reduce((sum, p) => sum + Number(p.clv), 0) / clvRows.length : 0;

    const picksByTier = {} as Record<ConfidenceTier, number>;
    const winRateByTier = {} as Record<ConfidenceTier, number>;
    for (const tier of TIERS) {
      const tierRows = rows.filter((p) => p.confidence_tier === tier);
      const tierSettled = tierRows.filter((p) => p.status === 'won' || p.status === 'lost');
      const tierWon = tierRows.filter((p) => p.status === 'won').length;
      picksByTier[tier] = tierRows.length;
      winRateByTier[tier] = tierSettled.length > 0 ? (tierWon / tierSettled.length) * 100 : 0;
    }

    return {
      totalPicks: rows.length,
      wonPicks,
      lostPicks,
      pendingPicks,
      winRate,
      avgOdds,
      avgEV,
      avgCLV,
      picksByTier,
      winRateByTier,
    };
  }),
});

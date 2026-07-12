import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createServerClient } from '@/lib/supabase';
import { inngest } from '@/inngest/client';
import { ALL_PIPELINE_SPORTS, RUN_SESSION_EVENT } from '@/inngest/daily-pipeline';
import type { Session, TicketType } from '@/types/edge';

export const sessionsRouter = router({
  getAll: protectedProcedure.query(
    async (): Promise<(Session & { tickets: { ticket_type: TicketType; combined_odds: number }[] })[]> => {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('sessions')
        .select('*, tickets(ticket_type, combined_odds)')
        .order('date', { ascending: true });
      return data ?? [];
    }
  ),

  // Powers the "Run Session" button — an on-demand alternative to the
  // 06:00 UTC cron, for whatever fixtures are available right now today.
  // Blocks re-running over a session that already has real picks/stakes
  // (status 'generated') or one already in flight ('running'); a 'held'
  // session or no session at all is safe to (re)trigger.
  runNow: protectedProcedure
    .input(z.object({ sports: z.array(z.enum(ALL_PIPELINE_SPORTS)).min(1, 'Pick at least one sport') }))
    .mutation(async ({ input }) => {
      const supabase = createServerClient();
      const today = new Date().toISOString().split('T')[0];

      const { data: existing } = await supabase.from('sessions').select('status').eq('date', today).maybeSingle();
      if (existing?.status === 'generated') {
        throw new Error("Today's session already ran with real picks — re-running would risk duplicate exposure.");
      }
      if (existing?.status === 'running') {
        throw new Error('A session is already running for today.');
      }

      await inngest.send({ name: RUN_SESSION_EVENT, data: { sports: input.sports } });
      return { started: true };
    }),
});

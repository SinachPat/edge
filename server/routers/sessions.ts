import { router, protectedProcedure } from '../trpc';
import { createServerClient } from '@/lib/supabase';
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
});

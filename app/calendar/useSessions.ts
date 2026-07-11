import { useMemo } from 'react';
import { trpc } from '@/lib/trpc-client';
import type { Session, TicketType } from '@/types/edge';

export type SessionWithTickets = Session & { tickets: { ticket_type: TicketType; combined_odds: number }[] };

export function useSessions() {
  const query = trpc.sessions.getAll.useQuery();

  const byDate = useMemo(() => {
    const map = new Map<string, SessionWithTickets>();
    for (const session of query.data ?? []) {
      map.set(session.date, session);
    }
    return map;
  }, [query.data]);

  return { ...query, byDate };
}

'use client';

import { format } from 'date-fns';
import { trpc } from '@/lib/trpc-client';
import { SessionStatus } from '@/components/ui/SessionStatus';
import { EmptyState } from '@/components/ui/EmptyState';
import { TicketCard } from '@/components/picks/TicketCard';
import { PickCard } from '@/components/picks/PickCard';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-52 animate-pulse rounded-full bg-[#0F2236]" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg bg-[#0F2236]" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-[#0F2236]" />
        ))}
      </div>
    </div>
  );
}

function nextScheduledRun(): Date {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export default function DashboardPage() {
  const { data: session, isLoading } = trpc.picks.getToday.useQuery();
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="min-h-screen bg-[#0D1B2A] px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">EDGE</h1>
        <p className="text-sm text-gray-500">{today}</p>
      </header>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          <SessionStatus status={session ? (session.status as 'generated' | 'held') : null} />

          {!session && (
            <EmptyState icon="⬡" title="No session yet today">
              <p>
                EDGE only picks when the data justifies it — analysis runs automatically at{' '}
                <span className="text-gray-300">06:00 UTC</span>, next at{' '}
                <span className="text-gray-300">{format(nextScheduledRun(), "h:mm a 'on' EEEE")}</span> your time.
              </p>
            </EmptyState>
          )}

          {session?.status === 'held' && (
            <EmptyState icon="⏸" title="Holding — insufficient data">
              <p>
                {session.reason_held ??
                  "Today's fixtures didn't clear the 4-of-7 signal bar. No picks means no forced bets — that's the discipline working, not a failure."}
              </p>
            </EmptyState>
          )}

          {session?.status === 'generated' && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                {session.tickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    picks={session.picks.filter((p) => ticket.pick_ids.includes(p.id))}
                  />
                ))}
              </div>

              <div>
                <h2 className="mb-3 text-lg font-semibold text-white">All picks</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {session.picks.map((pick) => (
                    <PickCard key={pick.id} pick={pick} showStake />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

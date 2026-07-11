'use client';

import { format } from 'date-fns';
import { trpc } from '@/lib/trpc-client';
import { SessionStatus } from '@/components/ui/SessionStatus';
import { TicketCard } from '@/components/picks/TicketCard';
import { PickCard } from '@/components/picks/PickCard';

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-[#0F2236]" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-[#0F2236]" />
        ))}
      </div>
    </div>
  );
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

          {session?.status === 'held' && session.reason_held && (
            <div className="rounded-lg border border-[#1A3C5E] bg-[#0F2236] p-4 text-sm text-gray-400">
              {session.reason_held}
            </div>
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
                <h2 className="mb-3 text-lg font-semibold text-white">All Picks</h2>
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

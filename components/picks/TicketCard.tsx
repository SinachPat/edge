'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { PickCard } from './PickCard';
import type { Ticket, Pick, TicketType } from '@/types/edge';

const TYPE_CONFIG: Record<TicketType, { label: string; icon: string; border: string }> = {
  anchor: { label: 'ANCHOR', icon: '🛡', border: 'border-t-[#1A3C5E]' },
  value: { label: 'VALUE', icon: '⚡', border: 'border-t-[#C8973A]' },
  diversified: { label: 'DIVERSIFIED', icon: '🌐', border: 'border-t-[#1A6B5C]' },
};

const STATUS_RING: Record<Ticket['status'], string> = {
  won: 'ring-2 ring-green-500/30',
  lost: 'ring-2 ring-red-500/30',
  pending: '',
};

function CombinedOddsBadge({ odds }: { odds: number }) {
  const color = odds > 2.0 ? 'text-[#C8973A]' : odds >= 1.5 ? 'text-amber-400' : 'text-white';
  return <span className={clsx('text-xl font-bold', color)}>{odds.toFixed(2)}</span>;
}

export function TicketCard({
  ticket,
  picks,
  defaultExpanded = false,
}: {
  ticket: Ticket;
  picks: Pick[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = TYPE_CONFIG[ticket.ticket_type];

  return (
    <div
      className={clsx(
        'rounded-lg border border-t-4 border-[#1A3C5E] bg-[#0F2236] transition-shadow duration-150',
        config.border,
        STATUS_RING[ticket.status]
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 rounded-b-lg px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.02] focus-visible:ring-1 focus-visible:ring-[#C8973A]/50 focus-visible:outline-none"
      >
        <span aria-hidden>{config.icon}</span>
        <span className="font-bold text-white">{config.label}</span>
        <span className="text-xs text-gray-500">x3 picks</span>
        <span className="ml-auto" />
        <CombinedOddsBadge odds={ticket.combined_odds} />
        {ticket.status !== 'pending' && (
          <span
            className={clsx(
              'rounded px-2 py-0.5 text-xs font-semibold uppercase',
              ticket.status === 'won' ? 'text-green-400 bg-green-950/60' : 'text-red-400 bg-red-950/60'
            )}
          >
            {ticket.status}
          </span>
        )}
        <span className={clsx('text-gray-500 transition-transform', expanded && 'rotate-180')} aria-hidden>
          ▾
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-[#1A3C5E] px-4 py-3">
          {ticket.assembly_note && <p className="text-sm italic text-gray-400">{ticket.assembly_note}</p>}

          <div className="space-y-2">
            {picks.map((pick) => (
              <PickCard key={pick.id} pick={pick} />
            ))}
          </div>

          {ticket.status === 'won' && ticket.profit_loss !== null && (
            <p className="text-sm font-semibold text-green-400">Profit: +{ticket.profit_loss.toFixed(2)}</p>
          )}
          {ticket.status === 'lost' && ticket.profit_loss !== null && (
            <p className="text-sm font-semibold text-red-400">Loss: {ticket.profit_loss.toFixed(2)}</p>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { Fragment, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { trpc } from '@/lib/trpc-client';
import { TierBadge } from '@/components/picks/TierBadge';
import type { ConfidenceTier, PickStatus } from '@/types/edge';

const PAGE_SIZE = 50;
const STATUS_FILTERS: ('all' | PickStatus)[] = ['all', 'pending', 'won', 'lost', 'void'];
const TIER_FILTERS: ('all' | ConfidenceTier)[] = ['all', 'DIAMOND', 'GOLD', 'SILVER'];

const STATUS_STYLES: Record<PickStatus, string> = {
  won: 'text-green-400 bg-green-950/60',
  lost: 'text-red-400 bg-red-950/60',
  pending: 'text-amber-400 bg-amber-950/60',
  void: 'text-gray-400 bg-gray-800/60',
};

type SortKey = 'date' | 'odds' | 'ev_score';

export default function HistoryPage() {
  const { data: picks, isLoading } = trpc.picks.getHistory.useQuery({ limit: 500 });
  const { data: stats } = trpc.picks.getStats.useQuery();

  const [statusFilter, setStatusFilter] = useState<'all' | PickStatus>('all');
  const [tierFilter, setTierFilter] = useState<'all' | ConfidenceTier>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const detail = trpc.picks.getById.useQuery(expandedId ?? '', { enabled: Boolean(expandedId) });

  const filtered = useMemo(() => {
    const rows = picks ?? [];
    return rows
      .filter((p) => statusFilter === 'all' || p.status === statusFilter)
      .filter((p) => tierFilter === 'all' || p.confidence_tier === tierFilter)
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'date') return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        if (sortKey === 'odds') return dir * (a.odds - b.odds);
        return dir * ((a.ev_score ?? 0) - (b.ev_score ?? 0));
      });
  }, [picks, statusFilter, tierFilter, sortKey, sortDir]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Pick History</h1>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Picks" value={stats.totalPicks} />
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
          <StatCard label="Avg EV" value={`${stats.avgEV.toFixed(1)}%`} />
          <StatCard label="Avg CLV" value={`${stats.avgCLV.toFixed(1)}%`} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <FilterPill key={s} active={statusFilter === s} onClick={() => { setStatusFilter(s); setPage(0); }}>
            {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}
          </FilterPill>
        ))}
        <span className="mx-1 text-gray-700">|</span>
        {TIER_FILTERS.map((t) => (
          <FilterPill key={t} active={tierFilter === t} onClick={() => { setTierFilter(t); setPage(0); }}>
            {t === 'all' ? 'All Tiers' : t}
          </FilterPill>
        ))}
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-[#0F2236]" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-[#1A3C5E] md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F2236] text-gray-400">
                <tr>
                  <Th onClick={() => toggleSort('date')}>Date</Th>
                  <th className="px-3 py-2">Match</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Competition</th>
                  <th className="px-3 py-2">Market</th>
                  <th className="px-3 py-2">Selection</th>
                  <Th onClick={() => toggleSort('odds')}>Odds</Th>
                  <th className="px-3 py-2">Tier</th>
                  <Th onClick={() => toggleSort('ev_score')}>EV</Th>
                  <th className="px-3 py-2">Signals</th>
                  <th className="px-3 py-2">CLV</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((pick) => (
                  <Fragment key={pick.id}>
                    <tr
                      onClick={() => setExpandedId((id) => (id === pick.id ? null : pick.id))}
                      className="cursor-pointer border-t border-[#1A3C5E] text-gray-300 hover:bg-[#0F2236]"
                    >
                      <td className="px-3 py-2">{pick.sessions?.date ?? new Date(pick.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        {pick.home_team} vs {pick.away_team}
                      </td>
                      <td className="px-3 py-2">
                        {pick.final_home_goals !== null && pick.final_away_goals !== null
                          ? `${pick.final_home_goals}-${pick.final_away_goals}`
                          : '-'}
                      </td>
                      <td className="px-3 py-2">{pick.competition}</td>
                      <td className="px-3 py-2">{pick.market_type}</td>
                      <td className="px-3 py-2">{pick.selection}</td>
                      <td className="px-3 py-2 font-semibold text-[#C8973A]">{pick.odds.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <TierBadge tier={pick.confidence_tier} />
                      </td>
                      <td className="px-3 py-2">{pick.ev_score !== null ? `${pick.ev_score.toFixed(1)}%` : '-'}</td>
                      <td className="px-3 py-2">{pick.signal_count}/7</td>
                      <td className="px-3 py-2">{pick.clv !== null ? `${pick.clv.toFixed(1)}%` : '-'}</td>
                      <td className="px-3 py-2">
                        <span className={clsx('rounded px-2 py-0.5 text-xs font-semibold uppercase', STATUS_STYLES[pick.status])}>
                          {pick.status}
                        </span>
                      </td>
                    </tr>
                    {expandedId === pick.id && (
                      <tr className="border-t border-[#1A3C5E] bg-[#0A1829]">
                        <td colSpan={12} className="px-4 py-3 text-sm text-gray-400">
                          {detail.isLoading ? (
                            'Loading...'
                          ) : (
                            <div className="space-y-2">
                              <p>{detail.data?.rationale}</p>
                              {detail.data?.key_risk && <p className="text-amber-300">{detail.data.key_risk}</p>}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {pageRows.map((pick) => (
              <div key={pick.id} className="rounded-lg border border-[#1A3C5E] bg-[#0F2236] p-3">
                <div className="mb-1 flex items-center justify-between">
                  <TierBadge tier={pick.confidence_tier} />
                  <span className={clsx('rounded px-2 py-0.5 text-xs font-semibold uppercase', STATUS_STYLES[pick.status])}>
                    {pick.status}
                  </span>
                </div>
                <p className="font-medium text-white">
                  {pick.home_team} vs {pick.away_team}
                </p>
                <p className="text-sm text-gray-400">
                  {pick.market_type} — {pick.selection}
                </p>
                <div className="mt-1 flex justify-between text-sm text-gray-500">
                  <span className="text-[#C8973A]">{pick.odds.toFixed(2)}</span>
                  <span>{pick.signal_count}/7 signals</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded border border-[#1A3C5E] px-3 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="rounded border border-[#1A3C5E] px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[#1A3C5E] bg-[#0F2236] p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-full border px-3 py-1 text-xs font-medium',
        active ? 'border-[#C8973A] text-[#C8973A]' : 'border-[#1A3C5E] text-gray-400'
      )}
    >
      {children}
    </button>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <th className="cursor-pointer select-none px-3 py-2" onClick={onClick}>
      {children}
    </th>
  );
}

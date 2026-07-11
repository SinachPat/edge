'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { trpc } from '@/lib/trpc-client';
import { BankrollChart } from '@/components/ui/BankrollChart';
import { EmptyState } from '@/components/ui/EmptyState';

function InitializeForm() {
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState('100000');
  const init = trpc.bankroll.initializeBankroll.useMutation({
    onSuccess: () => {
      utils.bankroll.getCurrent.invalidate();
      utils.bankroll.getOverallStats.invalidate();
      utils.bankroll.getHistory.invalidate();
    },
  });

  const isValid = Number(amount) > 0;

  return (
    <div className="max-w-sm rounded-2xl border border-[#1A3C5E] bg-[#0F2236] p-6">
      <h2 className="text-lg font-semibold text-white">Set up your bankroll</h2>
      <p className="mt-1.5 text-sm text-gray-400">
        Enter your starting balance. Every stake EDGE recommends is sized as a percentage of this, so it&apos;s worth
        getting right.
      </p>
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">₦</span>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-[#1A3C5E] bg-[#0A1829] py-2 pr-3 pl-7 text-white outline-none transition-colors duration-150 focus:border-[#C8973A] focus:ring-1 focus:ring-[#C8973A]/40"
          />
        </div>
        <button
          type="button"
          disabled={init.isPending || !isValid}
          onClick={() => init.mutate({ startingBalance: Number(amount) })}
          className="rounded-lg bg-[#C8973A] px-4 py-2 font-semibold text-[#0D1B2A] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:shadow-[0_8px_20px_-6px_rgba(200,151,58,0.5)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {init.isPending ? 'Starting...' : 'Start'}
        </button>
      </div>
      {init.error && <p className="mt-2 text-sm text-red-400">{init.error.message}</p>}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg border border-[#1A3C5E] bg-[#0F2236] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={clsx('text-xl font-bold', tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-red-400' : 'text-white')}>
        {value}
      </p>
    </div>
  );
}

export default function BankrollPage() {
  const { data: current, isLoading: currentLoading } = trpc.bankroll.getCurrent.useQuery();
  const { data: stats } = trpc.bankroll.getOverallStats.useQuery();
  const { data: history } = trpc.bankroll.getHistory.useQuery({ days: 365 });
  const { data: tierBreakdown } = trpc.bankroll.getTierBreakdown.useQuery();

  const hasSettledPicks = (tierBreakdown ?? []).some((row) => row.totalBets > 0);

  if (currentLoading) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] px-4 py-8 sm:px-8">
        <div className="h-7 w-32 animate-pulse rounded-full bg-[#0F2236]" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-[#0F2236]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Bankroll</h1>

      {!current ? (
        <InitializeForm />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Current Balance" value={`₦${(stats?.currentBalance ?? 0).toLocaleString()}`} />
            <StatCard
              label="Total ROI"
              value={`${(stats?.totalROI ?? 0).toFixed(2)}%`}
              tone={(stats?.totalROI ?? 0) >= 0 ? 'good' : 'bad'}
            />
            <StatCard
              label="Total P&L"
              value={`₦${(stats?.totalProfit ?? 0).toLocaleString()}`}
              tone={(stats?.totalProfit ?? 0) >= 0 ? 'good' : 'bad'}
            />
            <StatCard label="Sessions" value={String(stats?.sessionsCount ?? 0)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="7-day ROI" value={`${(stats?.roi7d ?? 0).toFixed(1)}%`} tone={(stats?.roi7d ?? 0) >= 0 ? 'good' : 'bad'} />
            <StatCard label="30-day ROI" value={`${(stats?.roi30d ?? 0).toFixed(1)}%`} tone={(stats?.roi30d ?? 0) >= 0 ? 'good' : 'bad'} />
            <StatCard label="90-day ROI" value={`${(stats?.roi90d ?? 0).toFixed(1)}%`} tone={(stats?.roi90d ?? 0) >= 0 ? 'good' : 'bad'} />
          </div>

          <BankrollChart history={history ?? []} />

          {hasSettledPicks ? (
            <div className="overflow-x-auto rounded-lg border border-[#1A3C5E]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0F2236] text-gray-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tier</th>
                    <th className="px-3 py-2 font-medium">Total Bets</th>
                    <th className="px-3 py-2 font-medium">Won</th>
                    <th className="px-3 py-2 font-medium">Lost</th>
                    <th className="px-3 py-2 font-medium">Win Rate</th>
                    <th className="px-3 py-2 font-medium">Avg Odds</th>
                    <th className="px-3 py-2 font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {tierBreakdown!.map((row) => (
                    <tr key={row.tier} className="border-t border-[#1A3C5E] text-gray-300">
                      <td className="px-3 py-2 font-medium text-white">{row.tier}</td>
                      <td className="px-3 py-2">{row.totalBets}</td>
                      <td className="px-3 py-2 text-green-400">{row.won}</td>
                      <td className="px-3 py-2 text-red-400">{row.lost}</td>
                      <td className="px-3 py-2">{row.winRate.toFixed(1)}%</td>
                      <td className="px-3 py-2">{row.avgOdds.toFixed(2)}</td>
                      <td className={clsx('px-3 py-2 font-medium', row.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {row.pnl >= 0 ? '+' : ''}
                        {row.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-[#1A3C5E] font-semibold text-white">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2">{tierBreakdown!.reduce((s, r) => s + r.totalBets, 0)}</td>
                    <td className="px-3 py-2 text-green-400">{tierBreakdown!.reduce((s, r) => s + r.won, 0)}</td>
                    <td className="px-3 py-2 text-red-400">{tierBreakdown!.reduce((s, r) => s + r.lost, 0)}</td>
                    <td className="px-3 py-2">-</td>
                    <td className="px-3 py-2">-</td>
                    <td className="px-3 py-2">{tierBreakdown!.reduce((s, r) => s + r.pnl, 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="◆" title="No settled picks yet">
              The tier breakdown fills in as picks resolve — check back after your first session settles.
            </EmptyState>
          )}
        </div>
      )}
    </div>
  );
}

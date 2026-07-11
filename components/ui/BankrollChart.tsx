'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { EmptyState } from './EmptyState';
import type { BankrollSnapshot } from '@/types/edge';

export function BankrollChart({ history }: { history: BankrollSnapshot[] }) {
  const [range, setRange] = useState<30 | 'all'>(30);

  const startingBalance = history[0]?.opening_balance ?? 0;
  const visible = range === 30 ? history.slice(-30) : history;
  const data = visible.map((row) => ({
    date: row.date,
    balance: row.closing_balance ?? row.opening_balance,
    dailyPnl: (row.closing_balance ?? row.opening_balance) - row.opening_balance,
  }));

  return (
    <div className="rounded-lg border border-[#1A3C5E] bg-[#0D1B2A] p-4">
      <div className="mb-3 flex justify-end gap-2">
        {([30, 'all'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
              range === r
                ? 'border-[#C8973A] bg-[#C8973A]/10 text-[#C8973A]'
                : 'border-[#1A3C5E] text-gray-400 hover:border-gray-500 hover:text-white'
            }`}
          >
            {r === 30 ? '30 days' : 'All time'}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center">
          <EmptyState icon="◈" title="Not enough data yet">
            The balance history chart fills in once a few days have settled.
          </EmptyState>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A3C5E" />
            <XAxis dataKey="date" tickFormatter={(d: string) => format(new Date(d), 'MMM d')} stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: '#0F2236', border: '1px solid #1A3C5E', borderRadius: 8 }}
              labelFormatter={(label) => format(new Date(String(label)), 'PP')}
              formatter={(value, name) => [`₦${Number(value).toLocaleString()}`, name === 'balance' ? 'Balance' : 'Daily P&L']}
            />
            <ReferenceLine y={startingBalance} stroke="#666" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="balance" stroke="#C8973A" fill="#1A3C5E" fillOpacity={0.4} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

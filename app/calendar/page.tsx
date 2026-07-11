'use client';

import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, addMonths, subMonths, isToday } from 'date-fns';
import { useSessions } from './useSessions';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const { byDate, isLoading } = useSessions();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const allSessions = useMemo(() => Array.from(byDate.values()), [byDate]);

  const stats = useMemo(() => {
    const generated = allSessions.filter((s) => s.status === 'generated').length;
    const held = allSessions.filter((s) => s.status === 'held').length;
    const holdRate = allSessions.length > 0 ? (held / allSessions.length) * 100 : 0;

    const sortedDates = allSessions.map((s) => new Date(s.date).getTime()).sort((a, b) => a - b);
    const weeksSpan =
      sortedDates.length > 1 ? Math.max(1, (sortedDates[sortedDates.length - 1] - sortedDates[0]) / (7 * 86400000)) : 1;
    const avgPerWeek = allSessions.length > 0 ? allSessions.length / weeksSpan : 0;

    return { generated, held, holdRate, avgPerWeek };
  }, [allSessions]);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const leadingBlanks = (getDay(startOfMonth(month)) + 6) % 7; // Monday-first offset

  const selectedSession = selectedDate ? byDate.get(selectedDate) : undefined;

  return (
    <div className="min-h-screen bg-[#0D1B2A] px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Session Calendar</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sessions Generated" value={stats.generated} />
        <StatCard label="Sessions Held" value={stats.held} />
        <StatCard label="Hold Rate" value={`${stats.holdRate.toFixed(0)}%`} />
        <StatCard label="Avg Sessions / Week" value={stats.avgPerWeek.toFixed(1)} />
      </div>

      {isLoading ? (
        <div className="h-96 animate-pulse rounded-lg bg-[#0F2236]" />
      ) : (
        <div className="rounded-lg border border-[#1A3C5E] bg-[#0F2236] p-4">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => setMonth((m) => subMonths(m, 1))} className="rounded px-2 py-1 text-gray-400 hover:text-white">
              ‹ Prev
            </button>
            <span className="font-semibold text-white">{format(month, 'MMMM yyyy')}</span>
            <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded px-2 py-1 text-gray-400 hover:text-white">
              Next ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const session = byDate.get(dateStr);
              const today = isToday(day);
              const selected = selectedDate === dateStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={!session}
                  onClick={() => setSelectedDate((d) => (d === dateStr ? null : dateStr))}
                  className={clsx(
                    'aspect-square rounded text-sm transition-colors',
                    session?.status === 'generated' && 'bg-green-900/50 text-green-300 hover:bg-green-900/70',
                    session?.status === 'held' && 'bg-amber-900/50 text-amber-300 hover:bg-amber-900/70',
                    !session && 'text-gray-600',
                    today && 'ring-2 ring-[#C8973A]',
                    selected && 'outline outline-2 outline-white'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedSession && (
        <div className="mt-4 rounded-lg border border-[#1A3C5E] bg-[#0F2236] p-4">
          <p className="mb-2 font-semibold text-white">{format(new Date(selectedSession.date), 'PPPP')}</p>
          {selectedSession.status === 'generated' ? (
            <div className="space-y-1 text-sm text-gray-300">
              <p>Picks qualified: {selectedSession.picks_qualified}</p>
              <p>Tickets generated: {selectedSession.tickets_generated}</p>
              <ul className="mt-2 space-y-0.5">
                {selectedSession.tickets.map((t, i) => (
                  <li key={i} className="text-gray-400">
                    {t.ticket_type}: <span className="text-[#C8973A]">{t.combined_odds.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-400">{selectedSession.reason_held}</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[#1A3C5E] bg-[#0F2236] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

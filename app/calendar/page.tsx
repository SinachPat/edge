'use client';

import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, addMonths, subMonths, isToday } from 'date-fns';
import { useSessions } from './useSessions';
import { useFixtures, useSports } from './useFixtures';
import { EmptyState } from '@/components/ui/EmptyState';
import { TierBadge } from '@/components/picks/TierBadge';
import type { FixtureSummary } from '@/server/routers/fixtures';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Quick-access chips, shown only when that sport is currently in season
// (present in the live catalog). Everything else is reachable via the
// full dropdown.
const FEATURED_SPORTS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'soccer_epl', label: 'EPL' },
  { key: 'soccer_uefa_champs_league', label: 'UCL' },
  { key: 'soccer_spain_la_liga', label: 'La Liga' },
  { key: 'americanfootball_nfl', label: 'NFL' },
  { key: 'basketball_nba', label: 'NBA' },
  { key: 'baseball_mlb', label: 'MLB' },
  { key: 'icehockey_nhl', label: 'NHL' },
];

export default function CalendarPage() {
  const { byDate, isLoading } = useSessions();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { sports } = useSports();
  const [sportKey, setSportKey] = useState('soccer_epl');
  const { fixtures, error: fixturesError, isLoading: fixturesLoading } = useFixtures(sportKey);

  const featuredAvailable = useMemo(() => {
    const activeKeys = new Set(sports.map((s) => s.key));
    return FEATURED_SPORTS.filter((f) => activeKeys.has(f.key));
  }, [sports]);

  const selectedSportTitle = sports.find((s) => s.key === sportKey)?.title ?? sportKey;

  const allSessions = useMemo(() => Array.from(byDate.values()), [byDate]);
  const hasAnySessions = allSessions.length > 0;

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

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Fixtures</h2>
          <div className="flex flex-wrap items-center gap-2">
            {featuredAvailable.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setSportKey(f.key)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  sportKey === f.key ? 'bg-[#C8973A]/20 text-[#C8973A]' : 'text-gray-500 hover:text-white'
                )}
              >
                {f.label}
              </button>
            ))}
            <div className="relative">
              <select
                value={sportKey}
                onChange={(e) => setSportKey(e.target.value)}
                aria-label="All sports"
                className="appearance-none rounded-lg border border-[#1A3C5E] bg-[#0F2236] py-1 pr-7 pl-2 text-xs text-gray-300 focus:border-[#C8973A] focus:outline-none"
              >
                {!sports.some((s) => s.key === sportKey) && <option value={sportKey}>{sportKey}</option>}
                {sports.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.group} — {s.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"
                aria-hidden
              />
            </div>
          </div>
        </div>

        {fixturesLoading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-[#0F2236]" />
        ) : fixturesError ? (
          <EmptyState icon="⚠" title="Fixtures unavailable">
            {fixturesError}
          </EmptyState>
        ) : fixtures.length === 0 ? (
          <EmptyState icon="⬡" title="No games right now">
            {selectedSportTitle} has no live, upcoming, or recent games in the bookmakers&apos; window — likely off-season
            or between rounds.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {fixtures.map((fixture) => (
              <FixtureRow key={fixture.eventId} fixture={fixture} />
            ))}
          </div>
        )}
      </section>

      {hasAnySessions && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Sessions Generated" value={stats.generated} />
          <StatCard label="Sessions Held" value={stats.held} />
          <StatCard label="Hold Rate" value={`${stats.holdRate.toFixed(0)}%`} />
          <StatCard label="Avg Sessions / Week" value={stats.avgPerWeek.toFixed(1)} />
        </div>
      )}

      {isLoading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-[#0F2236]" />
      ) : !hasAnySessions ? (
        <EmptyState icon="⬡" title="No sessions yet">
          Once EDGE runs its first analysis, every day — generated or held — will show up on this calendar.
        </EmptyState>
      ) : (
        <div className="rounded-2xl border border-[#1A3C5E] bg-[#0F2236] p-4">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="rounded px-2 py-1 text-gray-400 transition-colors hover:text-white"
              aria-label="Previous month"
            >
              ‹ Prev
            </button>
            <span className="font-semibold text-white">{format(month, 'MMMM yyyy')}</span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="rounded px-2 py-1 text-gray-400 transition-colors hover:text-white"
              aria-label="Next month"
            >
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
                    'aspect-square rounded text-sm transition-colors duration-150',
                    session?.status === 'generated' && 'bg-green-900/50 text-green-300 hover:bg-green-900/70',
                    session?.status === 'held' && 'bg-amber-900/50 text-amber-300 hover:bg-amber-900/70',
                    session?.status === 'running' && 'animate-pulse bg-[#C8973A]/20 text-[#C8973A]',
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

          <div className="mt-4 flex items-center gap-4 border-t border-[#1A3C5E] pt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-green-900/50" aria-hidden /> Generated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-900/50" aria-hidden /> Held
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-[#C8973A]" aria-hidden /> Today
            </span>
          </div>
        </div>
      )}

      {selectedSession && (
        <div className="mt-4 rounded-2xl border border-[#1A3C5E] bg-[#0F2236] p-4">
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
          ) : selectedSession.status === 'running' ? (
            <p className="text-sm text-[#C8973A]">Session in progress — check back in a minute.</p>
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

function FixtureRow({ fixture }: { fixture: FixtureSummary }) {
  const hasScore = fixture.homeScore !== null && fixture.awayScore !== null;

  return (
    <div className="rounded-xl border border-[#1A3C5E] bg-[#0F2236] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {fixture.homeTeam} <span className="text-gray-500">vs</span> {fixture.awayTeam}
          </p>
          <p className="text-xs text-gray-500">{format(new Date(fixture.kickoff), 'EEE, MMM d · h:mm a')}</p>
        </div>

        <div className="shrink-0 text-right">
          {hasScore ? (
            <p className="font-mono text-lg font-bold text-white">
              {fixture.homeScore} – {fixture.awayScore}
            </p>
          ) : (
            <p className="font-mono text-sm text-gray-300">{format(new Date(fixture.kickoff), 'h:mm a')}</p>
          )}
          <p
            className={clsx(
              'text-xs',
              fixture.live && 'font-semibold text-green-400',
              fixture.statusUncertain && 'text-amber-400',
              !fixture.live && !fixture.statusUncertain && (fixture.completed ? 'text-gray-500' : 'text-gray-400')
            )}
            title={fixture.statusUncertain ? "Kicked off a while ago with no result yet — can't confirm it's still live" : undefined}
          >
            {fixture.live
              ? '● Live'
              : fixture.statusUncertain
                ? 'Status unknown'
                : fixture.completed
                  ? 'Final'
                  : 'Upcoming'}
          </p>
        </div>
      </div>

      {fixture.picks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#1A3C5E] pt-3">
          {fixture.picks.map((pick) => (
            <div key={pick.id} className="flex items-center gap-1.5 text-xs">
              <TierBadge tier={pick.confidenceTier} />
              <span className="text-gray-400">
                {pick.marketType} — {pick.selection}
              </span>
              <span
                className={clsx(
                  'font-medium',
                  pick.status === 'won' && 'text-green-400',
                  pick.status === 'lost' && 'text-red-400',
                  pick.status === 'void' && 'text-gray-500',
                  pick.status === 'pending' && 'text-amber-400'
                )}
              >
                {pick.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

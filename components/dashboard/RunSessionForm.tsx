'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';

type PipelineSport = 'soccer' | 'basketball' | 'baseball' | 'american-football';

const SPORT_OPTIONS: { value: PipelineSport; label: string }[] = [
  { value: 'soccer', label: 'Soccer' },
  { value: 'basketball', label: 'Basketball (NBA)' },
  { value: 'baseball', label: 'Baseball (MLB)' },
  { value: 'american-football', label: 'American Football (NFL)' },
];

export function RunSessionForm() {
  const utils = trpc.useUtils();
  const [sports, setSports] = useState<Set<PipelineSport>>(new Set(SPORT_OPTIONS.map((s) => s.value)));
  const [justStarted, setJustStarted] = useState(false);
  const run = trpc.sessions.runNow.useMutation({
    onSuccess: () => {
      setJustStarted(true);
      utils.picks.getToday.invalidate();
    },
  });

  function toggleSport(value: PipelineSport) {
    setSports((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  if (justStarted) {
    return (
      <div className="rounded-2xl border border-[#1A3C5E] bg-[#0F2236] p-4 text-sm text-[#C8973A]">
        Session started — this page updates automatically as it runs.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1A3C5E] bg-[#0F2236] p-4">
      <h2 className="text-sm font-semibold text-white">Run a session now</h2>
      <p className="mt-1 text-xs text-gray-500">
        Analyzes today&apos;s available fixtures on demand, any time of day — uses the same real API credits and
        Claude tokens as the automatic 06:00 UTC run.
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        {SPORT_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={sports.has(opt.value)}
              onChange={() => toggleSport(opt.value)}
              className="accent-[#C8973A]"
            />
            {opt.label}
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={run.isPending || sports.size === 0}
        onClick={() => run.mutate({ sports: Array.from(sports) })}
        className="mt-3 rounded-lg bg-[#C8973A] px-4 py-2 text-sm font-semibold text-[#0D1B2A] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:shadow-[0_8px_20px_-6px_rgba(200,151,58,0.5)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        {run.isPending ? 'Starting...' : 'Run Session'}
      </button>

      {run.error && <p className="mt-2 text-sm text-red-400">{run.error.message}</p>}
    </div>
  );
}

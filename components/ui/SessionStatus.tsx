'use client';

import { clsx } from 'clsx';

const STATUS_CONFIG = {
  generated: {
    label: 'Pick session ready',
    className: 'bg-green-950/60 text-green-400 border-green-500/40',
    dot: 'bg-green-400',
    pulse: false,
  },
  held: {
    label: 'Holding — insufficient data',
    className: 'bg-amber-950/60 text-amber-400 border-amber-500/40',
    dot: 'bg-amber-400',
    pulse: false,
  },
  none: {
    label: 'Awaiting next session',
    className: 'bg-gray-800/60 text-gray-400 border-gray-600/40',
    dot: 'bg-gray-500',
    pulse: true,
  },
} as const;

export function SessionStatus({ status }: { status: 'generated' | 'held' | null }) {
  const config = STATUS_CONFIG[status ?? 'none'];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold tracking-wide',
        config.className
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', config.dot, config.pulse && 'animate-pulse')} aria-hidden />
      {config.label}
    </span>
  );
}

'use client';

import { clsx } from 'clsx';

const STATUS_CONFIG = {
  generated: { label: 'PICK SESSION READY', className: 'bg-green-950/60 text-green-400 border-green-500/40' },
  held: { label: 'HOLDING — INSUFFICIENT DATA', className: 'bg-amber-950/60 text-amber-400 border-amber-500/40' },
  loading: { label: 'ANALYSIS RUNNING...', className: 'bg-gray-800/60 text-gray-400 border-gray-600/40' },
} as const;

export function SessionStatus({ status }: { status: 'generated' | 'held' | null }) {
  const config = STATUS_CONFIG[status ?? 'loading'];

  return (
    <span
      className={clsx('inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold tracking-wide', config.className)}
    >
      {config.label}
    </span>
  );
}

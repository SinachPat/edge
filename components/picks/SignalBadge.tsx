'use client';

import { clsx } from 'clsx';

export function SignalBadge({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className={clsx('h-2 w-2 rounded-full', i < count ? 'bg-[#1A3C5E]' : 'border border-[#2A4C6E] bg-transparent')}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400">{count}/7</span>
    </div>
  );
}

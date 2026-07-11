'use client';

import { clsx } from 'clsx';
import type { ConfidenceTier } from '@/types/edge';

const TIER_CONFIG: Record<ConfidenceTier, { icon: string; text: string; border: string }> = {
  DIAMOND: { icon: '◆', text: 'text-[#C8973A]', border: 'border-[#C8973A]' },
  GOLD: { icon: '◈', text: 'text-amber-400', border: 'border-amber-400' },
  SILVER: { icon: '◇', text: 'text-gray-400', border: 'border-gray-400' },
};

export function TierBadge({ tier, pct }: { tier: ConfidenceTier; pct?: number }) {
  const config = TIER_CONFIG[tier];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        config.text,
        config.border
      )}
    >
      <span aria-hidden>{config.icon}</span>
      {tier}
      {pct !== undefined && <span className="opacity-75">{pct}%</span>}
    </span>
  );
}

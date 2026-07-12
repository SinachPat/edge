'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { TierBadge } from './TierBadge';
import { SignalBadge } from './SignalBadge';
import type { Pick, SignalLog } from '@/types/edge';

const LAYER_KEYS = ['layer1', 'layer2', 'layer3', 'layer4', 'layer5', 'layer6', 'layer7'] as const;

const STATUS_STYLES: Record<string, string> = {
  won: 'text-green-400 bg-green-950/60',
  lost: 'text-red-400 bg-red-950/60',
  void: 'text-gray-400 bg-gray-800/60',
};

// picks.getToday/getHistory don't join signal_log — only picks.getById does.
// The layer breakdown only renders when the caller supplies it.
export type PickWithSignalLog = Pick & { signal_log?: SignalLog[] };

export function PickCard({
  pick,
  defaultExpanded = false,
  showStake = false,
}: {
  pick: PickWithSignalLog;
  defaultExpanded?: boolean;
  showStake?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const signalByLayer = new Map((pick.signal_log ?? []).map((s) => [s.layer, s]));

  return (
    <div className="rounded-lg border border-[#1A3C5E] bg-[#0F2236] transition-colors duration-150 hover:border-[#2A4C6E]">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.02] focus-visible:ring-1 focus-visible:ring-[#C8973A]/50 focus-visible:outline-none"
      >
        <div className="flex flex-col gap-1.5">
          <TierBadge tier={pick.confidence_tier} pct={pick.confidence_pct ?? undefined} />
          <SignalBadge count={pick.signal_count} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">
            {pick.home_team} vs {pick.away_team}
            {pick.final_home_goals !== null && pick.final_away_goals !== null && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                (Final: {pick.final_home_goals}-{pick.final_away_goals})
              </span>
            )}
          </p>
          <p className="truncate text-sm text-gray-400">
            {pick.sport && pick.sport.toLowerCase() !== 'soccer' && (
              <span className="mr-1.5 rounded bg-[#1A3C5E]/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-300">
                {pick.sport}
              </span>
            )}
            {pick.market_type} — {pick.selection}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-bold text-[#C8973A]">{pick.odds.toFixed(2)}</span>
          {pick.ev_score !== null && (
            <span className={clsx('text-xs font-medium', pick.ev_score >= 0 ? 'text-green-400' : 'text-red-400')}>
              {pick.ev_score >= 0 ? '+' : ''}
              {pick.ev_score.toFixed(1)}% EV
            </span>
          )}
        </div>

        {pick.status !== 'pending' && (
          <span className={clsx('rounded px-2 py-0.5 text-xs font-semibold uppercase', STATUS_STYLES[pick.status])}>
            {pick.status}
          </span>
        )}

        <span className={clsx('text-gray-500 transition-transform', expanded && 'rotate-180')} aria-hidden>
          ▾
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-[#1A3C5E] px-4 py-3">
          <p className="rounded bg-[#0A1829] p-3 text-sm text-gray-300">{pick.rationale}</p>

          {pick.key_risk && (
            <p className="border-l-2 border-amber-500 pl-3 text-sm text-amber-300">{pick.key_risk}</p>
          )}

          {pick.signal_log && pick.signal_log.length > 0 && (
            <div className="space-y-1">
              {LAYER_KEYS.map((key, i) => {
                const layer = signalByLayer.get(i + 1);
                if (!layer) return null;
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className={layer.result === 'pass' ? 'text-green-400' : 'text-red-400'} aria-hidden>
                      {layer.result === 'pass' ? '✓' : '✗'}
                    </span>
                    <span className="w-56 shrink-0 text-gray-400">{layer.layer_name}</span>
                    <span className="truncate text-gray-500">
                      {typeof layer.detail === 'object' && layer.detail && 'note' in layer.detail
                        ? String((layer.detail as { note?: string }).note ?? '')
                        : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {showStake && (
            <p className="text-sm text-gray-300">
              Recommended stake: <span className="font-semibold text-white">{pick.stake_pct.toFixed(2)}%</span> of bankroll
            </p>
          )}

          {pick.best_odds_book && <p className="text-xs text-gray-500">Best price: {pick.best_odds_book}</p>}
        </div>
      )}
    </div>
  );
}

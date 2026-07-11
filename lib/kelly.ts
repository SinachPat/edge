import type { ConfidenceTier, ReasonedPick } from '@/types/edge';

export const STAKE_CAPS: Record<ConfidenceTier, number> = {
  DIAMOND: 3,
  GOLD: 2,
  SILVER: 1,
};

export const FRACTIONAL_KELLY = 0.5;

const MIN_STAKE_PCT = 0.25;
const MAX_SESSION_STAKE_PCT = 6;

// Kelly formula: f* = (bp - q) / b, where b = odds - 1, p = win probability, q = 1 - p
export function calculateKellyFraction(odds: number, winProbability: number): number {
  const b = odds - 1;
  const p = winProbability;
  const q = 1 - p;
  const fraction = (b * p - q) / b;
  return fraction > 0 ? fraction : 0;
}

export function calculateStake(params: {
  odds: number;
  confidencePct: number;
  confidenceTier: ConfidenceTier;
  bankrollBalance: number;
}): { stakePct: number; stakeAmount: number } {
  const { odds, confidencePct, confidenceTier, bankrollBalance } = params;

  const winProbability = confidencePct / 100;
  const kellyFraction = calculateKellyFraction(odds, winProbability);
  const fractionalKellyPct = kellyFraction * FRACTIONAL_KELLY * 100;

  const cap = STAKE_CAPS[confidenceTier];
  let stakePct = Math.min(fractionalKellyPct, cap);

  if (stakePct > 0 && stakePct < MIN_STAKE_PCT) {
    stakePct = MIN_STAKE_PCT;
  }

  const stakeAmount = (stakePct / 100) * bankrollBalance;
  return { stakePct, stakeAmount };
}

export function validateSessionStake(tickets: { totalStake: number }[], bankrollBalance: number): boolean {
  const totalStake = tickets.reduce((sum, t) => sum + t.totalStake, 0);
  return totalStake <= (MAX_SESSION_STAKE_PCT / 100) * bankrollBalance;
}

export function getSessionStakeSummary(
  picks: ReasonedPick[],
  bankrollBalance: number
): { totalStakePct: number; totalStakeAmount: number; safeToPlace: boolean; warning: string | null } {
  let totalStakePct = 0;
  let totalStakeAmount = 0;

  for (const pick of picks) {
    const { stakePct, stakeAmount } = calculateStake({
      odds: pick.odds,
      confidencePct: pick.confidencePct,
      confidenceTier: pick.finalConfidenceTier,
      bankrollBalance,
    });
    totalStakePct += stakePct;
    totalStakeAmount += stakeAmount;
  }

  const safeToPlace = totalStakePct <= MAX_SESSION_STAKE_PCT;
  const warning = safeToPlace
    ? null
    : `Total proposed stake ${totalStakePct.toFixed(2)}% exceeds the ${MAX_SESSION_STAKE_PCT}% session cap`;

  return { totalStakePct, totalStakeAmount, safeToPlace, warning };
}

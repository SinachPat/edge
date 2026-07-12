import { callClaude, parseJsonResponse, MODEL_CONFIG } from '@/lib/anthropic';
import { STAGE_2_SYSTEM_PROMPT } from './prompts/stage2';
import type { ConfidenceTier, SignalScore, ReasonedPick } from '@/types/edge';

const MAX_CANDIDATES = 9;

// The tier thresholds the Stage 2 prompt itself states ("DIAMOND: all 7
// signal layers passed, EV >= +15%", etc). Stage 3 has a hard-rule validator
// for ticket assembly; tier assignment had no equivalent check even though
// finalConfidenceTier directly sets the Kelly stake multiplier (lib/kelly.ts)
// — a misclassified tier straight-line inflates real-money stake sizing with
// nothing to catch it. This re-derives the tier the pick's own signalCount/
// evScore actually support and clamps down to it, mirroring the "downgrade,
// never upgrade" rule the prompt already states, enforced server-side rather
// than trusted blindly.
const TIER_ORDER: ConfidenceTier[] = ['DIAMOND', 'GOLD', 'SILVER'];
const TIER_EV_THRESHOLDS: Record<ConfidenceTier, number> = { DIAMOND: 15, GOLD: 8, SILVER: 4 };

function clampToVerifiedTier(pick: ReasonedPick): ReasonedPick {
  let tier = pick.finalConfidenceTier;

  // DIAMOND's own stated requirement is signalCount === 7, independent of
  // EV — check it first since it's unambiguous.
  if (tier === 'DIAMOND' && pick.signalCount !== 7) {
    tier = 'GOLD';
  }

  // evScore === null means EV wasn't determinable — nothing to verify
  // against, so leave the assigned tier as-is rather than guessing.
  if (pick.evScore !== null) {
    while (tier !== 'SILVER' && pick.evScore < TIER_EV_THRESHOLDS[tier]) {
      tier = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
    }
  }

  if (tier === pick.finalConfidenceTier) return pick;

  console.warn(
    `[stage2] downgrading pick (fixture ${pick.fixtureId}, ${pick.marketType} ${pick.selection}) from ${pick.finalConfidenceTier} to ${tier} — signalCount=${pick.signalCount}, evScore=${pick.evScore} doesn't meet its own stated tier threshold`
  );
  return { ...pick, finalConfidenceTier: tier };
}

export async function runStage2(candidates: SignalScore[]): Promise<ReasonedPick[]> {
  const selected = candidates.slice(0, MAX_CANDIDATES);

  const raw = await callClaude({
    model: MODEL_CONFIG.STAGE_2,
    systemPrompt: STAGE_2_SYSTEM_PROMPT,
    userContent: JSON.stringify(selected),
    // 9 picks × (echoed signal fields + rationale) can brush past 8k output
    // tokens, and truncation aborts the whole session — keep real headroom.
    maxTokens: 16000,
    stage: 2,
  });

  return parseJsonResponse<ReasonedPick[]>(raw).map(clampToVerifiedTier);
}

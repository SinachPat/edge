import { callClaude, parseJsonResponse, MODEL_CONFIG } from '@/lib/anthropic';
import { STAGE_2_SYSTEM_PROMPT } from './prompts/stage2';
import type { SignalScore, ReasonedPick } from '@/types/edge';

const MAX_CANDIDATES = 9;

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

  return parseJsonResponse<ReasonedPick[]>(raw);
}

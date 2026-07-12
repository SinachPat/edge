import { callClaude, parseJsonResponse, MODEL_CONFIG } from '@/lib/anthropic';
import { STAGE_1_SYSTEM_PROMPT } from './prompts/stage1';
import type { RawFixtureData, SignalScore } from '@/types/edge';

export async function runStage1(fixtures: RawFixtureData[]): Promise<SignalScore[]> {
  // Deliberately no try/catch here (Stage 2 and Stage 3 don't have one
  // either): a Claude API failure must fail this Inngest step visibly, not
  // get swallowed into an empty array. daily-pipeline.ts treats a
  // zero-length result as "no fixtures qualified today" and writes a normal
  // 'held' session for it — if an actual API/parse error produced that same
  // empty array, the dashboard would show "insufficient data" for what was
  // really an infrastructure failure, with no signal that anything broke.
  const raw = await callClaude({
    model: MODEL_CONFIG.STAGE_1,
    systemPrompt: STAGE_1_SYSTEM_PROMPT,
    userContent: JSON.stringify(fixtures),
    maxTokens: 16000,
    stage: 1,
  });

  const candidates = parseJsonResponse<SignalScore[]>(raw);
  return candidates.filter((candidate) => candidate.signalCount >= 4);
}

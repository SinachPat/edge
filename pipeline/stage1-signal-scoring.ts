import { callClaude, parseJsonResponse, MODEL_CONFIG } from '@/lib/anthropic';
import { STAGE_1_SYSTEM_PROMPT } from './prompts/stage1';
import type { RawFixtureData, SignalScore } from '@/types/edge';

export async function runStage1(fixtures: RawFixtureData[]): Promise<SignalScore[]> {
  try {
    const raw = await callClaude({
      model: MODEL_CONFIG.STAGE_1,
      systemPrompt: STAGE_1_SYSTEM_PROMPT,
      userContent: JSON.stringify(fixtures),
      maxTokens: 16000,
      stage: 1,
    });

    const candidates = parseJsonResponse<SignalScore[]>(raw);
    return candidates.filter((candidate) => candidate.signalCount >= 4);
  } catch (err) {
    console.error('[stage1] signal scoring failed:', err);
    return [];
  }
}

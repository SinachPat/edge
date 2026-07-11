import Anthropic from '@anthropic-ai/sdk';
import { env } from './env';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export const MODEL_CONFIG = {
  STAGE_1: 'claude-sonnet-5',
  STAGE_2: 'claude-opus-4-8',
  STAGE_3: 'claude-sonnet-5',
} as const;

export class EdgeAIError extends Error {
  readonly stage?: number;
  readonly model?: string;
  readonly rawResponse: string;

  constructor(message: string, rawResponse: string, stage?: number, model?: string) {
    super(message);
    this.name = 'EdgeAIError';
    this.stage = stage;
    this.model = model;
    this.rawResponse = rawResponse;
  }
}

interface CallClaudeParams {
  model: string;
  systemPrompt: string;
  userContent: string;
  maxTokens: number;
  stage: 1 | 2 | 3;
}

const OVERLOAD_RETRY_DELAY_MS = 5000;

export async function callClaude(params: CallClaudeParams): Promise<string> {
  const { model, systemPrompt, userContent, maxTokens, stage } = params;

  // Stage 2 is the only genuine reasoning step — give it adaptive thinking.
  // Stages 1 & 3 are structured formatting/assembly; keep thinking off so they
  // stay fast and cheap (Sonnet 5 defaults to adaptive thinking when omitted).
  const request = () =>
    anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      ...(stage === 2
        ? { thinking: { type: 'adaptive' as const }, output_config: { effort: 'high' as const } }
        : { thinking: { type: 'disabled' as const } }),
      messages: [{ role: 'user', content: userContent }],
    });

  let response;
  try {
    response = await request();
  } catch (err) {
    if (err instanceof Anthropic.APIError && err.status === 529) {
      console.warn(`[anthropic] stage ${stage} overloaded, retrying once in ${OVERLOAD_RETRY_DELAY_MS}ms`);
      await new Promise((resolve) => setTimeout(resolve, OVERLOAD_RETRY_DELAY_MS));
      response = await request();
    } else {
      throw err;
    }
  }

  console.log(
    `[anthropic] stage ${stage} model=${model} input_tokens=${response.usage.input_tokens} output_tokens=${response.usage.output_tokens}`
  );

  if (response.stop_reason === 'max_tokens') {
    throw new EdgeAIError(
      `Stage ${stage} output truncated at ${maxTokens} tokens — raise maxTokens`,
      JSON.stringify(response.content),
      stage,
      model
    );
  }

  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
  if (!textBlock) {
    throw new EdgeAIError(`No text block in stage ${stage} response`, JSON.stringify(response.content), stage, model);
  }

  return textBlock.text;
}

export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new EdgeAIError(
      `Failed to parse JSON response: ${err instanceof Error ? err.message : String(err)}`,
      raw
    );
  }
}

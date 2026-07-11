import { z } from 'zod';

const envSchema = z.object({
  ODDS_API_KEY: z.string().min(1, 'ODDS_API_KEY is required'),
  SHARPAPI_KEY: z.string().min(1, 'SHARPAPI_KEY is required'),
  APIFOOTBALL_KEY: z.string().min(1, 'APIFOOTBALL_KEY is required'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  NEXT_PUBLIC_SUPABASE_URL: z.url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
  INNGEST_EVENT_KEY: z.string().min(1, 'INNGEST_EVENT_KEY is required'),
  INNGEST_SIGNING_KEY: z.string().min(1, 'INNGEST_SIGNING_KEY is required'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Missing or invalid environment variables:\n${missing}\n\n` +
        'Copy .env.local.example to .env.local and fill in the values.'
    );
  }

  return parsed.data;
}

// All app code must import env from here — never read process.env directly.
export const env = loadEnv();

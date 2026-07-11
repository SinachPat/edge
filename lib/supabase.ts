// Server-side only — imports lib/env.ts, which validates server-only vars.
// Client components must use lib/supabase-browser.ts instead.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let serverClient: SupabaseClient | undefined;

// Service-role client — server-side only (Inngest functions, tRPC procedures). Bypasses RLS.
export function createServerClient(): SupabaseClient {
  if (!serverClient) {
    serverClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return serverClient;
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let serverClient: SupabaseClient | undefined;
let browserClient: SupabaseClient | undefined;

// Service-role client — server-side only (Inngest functions, tRPC procedures). Bypasses RLS.
export function createServerClient(): SupabaseClient {
  if (!serverClient) {
    serverClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return serverClient;
}

// Anon-key client — safe to use in client components.
export function createBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return browserClient;
}

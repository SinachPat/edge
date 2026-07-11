import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | undefined;

// Browser-safe client. Must NOT import lib/env.ts: that file validates
// server-only vars and would throw in the browser. NEXT_PUBLIC_* vars are
// inlined at build time only when referenced statically like this.
//
// Uses the @supabase/ssr browser client (not plain @supabase/supabase-js) so
// the auth session is stored in cookies rather than localStorage — that's
// what lets middleware.ts and server components read the logged-in user.
export function createBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set at build time');
    }
    browserClient = createSSRBrowserClient(url, anonKey);
  }
  return browserClient;
}

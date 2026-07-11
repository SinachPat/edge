import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// Anon-key client that reads the caller's auth session from cookies — for use
// in Server Components, Route Handlers, and tRPC's createContext. Distinct
// from lib/supabase.ts's createServerClient (service-role, bypasses RLS,
// used by the Inngest pipeline which has no user session to read).
export async function createAuthedServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component that can't set cookies — the
          // middleware refreshes the session instead, so this is safe to ignore.
        }
      },
    },
  });
}

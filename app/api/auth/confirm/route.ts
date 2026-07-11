import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createAuthedServerClient } from '@/lib/supabase-server-auth';

// The `next` param arrives as {{ .RedirectTo }} from the Supabase email
// template, which is a FULL URL (e.g. https://app.example.com/reset-password),
// not a path. Never redirect to another origin from here — that would let a
// crafted link bounce a fresh session to an attacker's site.
function safeNextPath(next: string | null, origin: string): string {
  if (!next) return '/dashboard';
  try {
    const url = new URL(next, origin);
    if (url.origin !== origin) return '/dashboard';
    return url.pathname + url.search;
  } catch {
    return '/dashboard';
  }
}

// Lands here after the user clicks the link in a Supabase auth email
// (password recovery, invite, etc). Verifies the token and establishes a
// session, then redirects into the app. Kept under /api/ so proxy.ts's
// matcher skips it — the visitor has no session yet when this runs, so a
// page-route version would get redirected to /login before it could execute.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNextPath(searchParams.get('next'), origin);

  if (tokenHash && type) {
    const supabase = await createAuthedServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('That link is invalid or has expired. Request a new one.')}`);
}

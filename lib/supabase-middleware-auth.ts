import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Reachable without a signed-in session.
const PUBLIC_PAGE_PATHS = ['/', '/login', '/signup', '/forgot-password'];

// Bounced to /dashboard if the visitor is already signed in — /signup is
// deliberately excluded so a signed-in owner can still reach it to add more
// accounts, and /reset-password is excluded so a recovery session (which
// getUser() also reports as "signed in") can complete the reset form.
const REDIRECT_IF_AUTHED_PATHS = ['/', '/login', '/forgot-password'];

// Refreshes the Supabase session cookie on every request and redirects to
// /login when there's no authenticated user. Only runs on page routes — see
// proxy.ts's matcher, which excludes /api/* entirely. API routes are
// protected separately (tRPC's protectedProcedure, Inngest's own signing key).
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PAGE_PATHS.some((path) => path === '/' ? pathname === '/' : pathname.startsWith(path));
  const isRedirectIfAuthedPath = REDIRECT_IF_AUTHED_PATHS.some((path) => (path === '/' ? pathname === '/' : pathname.startsWith(path)));

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (user && isRedirectIfAuthedPath) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

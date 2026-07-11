import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase-middleware-auth';

// Next.js 16 renamed Middleware to Proxy — same runtime, same file-convention
// role. See node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

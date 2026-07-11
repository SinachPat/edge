import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { createAuthedServerClient } from '@/lib/supabase-server-auth';

const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// EDGE isn't a public service — new accounts are only created by someone who
// already belongs: either the very first account (nobody exists yet, so
// there's nothing to gate), or an already-signed-in user adding another seat.
// Both checks use the service-role admin API (never exposed to the browser),
// so this can't be bypassed by calling supabase.auth.signUp() directly.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const authedSupabase = await createAuthedServerClient();
  const {
    data: { user: requester },
  } = await authedSupabase.auth.getUser();

  const adminSupabase = createServerClient();

  if (!requester) {
    const { data: existing, error: listError } = await adminSupabase.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: 'Could not check existing accounts' }, { status: 500 });
    }
    if (existing.users.length > 0) {
      return NextResponse.json({ error: 'Sign in first to add another account.' }, { status: 403 });
    }
  }

  const { error: createError } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, addedByExistingUser: Boolean(requester) });
}

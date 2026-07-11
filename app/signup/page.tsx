import { createAuthedServerClient } from '@/lib/supabase-server-auth';
import { SignupForm } from '@/components/auth/SignupForm';

export default async function SignupPage() {
  const supabase = await createAuthedServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SignupForm isAuthenticated={Boolean(user)} />;
}

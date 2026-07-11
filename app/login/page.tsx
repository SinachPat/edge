'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase-browser';
import { AuthCard, authInputClass, authButtonClass, authLinkClass } from '@/components/auth/AuthCard';

function LoginForm() {
  const router = useRouter();
  // /api/auth/confirm redirects here with ?error=... when a recovery link is
  // invalid or expired — surface it instead of showing a bare form.
  const urlError = useSearchParams().get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(urlError);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials' ? 'Incorrect email or password.' : signInError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push('/dashboard');
  }

  return (
    <AuthCard>
      <h1 className="text-lg font-semibold text-white">Welcome back</h1>
      <p className="mt-1.5 text-sm text-gray-400">Sign in to see today&apos;s picks.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-400">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
        </label>

        <label className="block">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Password</span>
            <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-[#C8973A]">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-500">
        No account yet?{' '}
        <Link href="/signup" className={authLinkClass}>
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

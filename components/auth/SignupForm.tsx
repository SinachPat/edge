'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase-browser';
import { AuthCard, authInputClass, authButtonClass, authLinkClass } from './AuthCard';

export function SignupForm({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addedEmail, setAddedEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setClosed(false);

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();

    if (!res.ok) {
      if (res.status === 403) setClosed(true);
      else setError(body.error ?? 'Something went wrong — try again.');
      setLoading(false);
      return;
    }

    if (isAuthenticated) {
      // Adding a seat while already signed in — don't touch the current
      // session by signing in as the new account.
      setAddedEmail(email);
      setEmail('');
      setPassword('');
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push('/dashboard');
  }

  if (addedEmail) {
    return (
      <AuthCard>
        <h1 className="text-lg font-semibold text-white">Account created</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          <span className="text-white">{addedEmail}</span> can now sign in with full access to your picks and bankroll.
        </p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => setAddedEmail(null)} className={authButtonClass}>
            Add another
          </button>
          <Link
            href="/dashboard"
            className="flex w-full items-center justify-center rounded-lg border border-[#1A3C5E] px-4 py-2.5 font-medium text-gray-300 transition-colors hover:border-[#C8973A] hover:text-white"
          >
            Done
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (closed) {
    return (
      <AuthCard>
        <h1 className="text-lg font-semibold text-white">Sign in to add an account</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          EDGE already has an account. Sign in first, then you can add more from here anytime.
        </p>
        <Link href="/login" className={`${authButtonClass} mt-6 flex items-center justify-center no-underline`}>
          Go to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className="text-lg font-semibold text-white">{isAuthenticated ? 'Add an account' : 'Create your account'}</h1>
      <p className="mt-1.5 text-sm text-gray-400">
        {isAuthenticated
          ? 'Anyone signed in with these details gets full access to your picks and bankroll.'
          : "You're setting up EDGE for the first time — this account gets full access."}
      </p>

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
          <span className="mb-1.5 block text-xs font-medium text-gray-400">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
          />
          <span className="mt-1.5 block text-xs text-gray-500">At least 8 characters.</span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      {!isAuthenticated && (
        <p className="mt-6 text-center text-xs text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className={authLinkClass}>
            Sign in
          </Link>
        </p>
      )}
    </AuthCard>
  );
}

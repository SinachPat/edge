'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase-browser';
import { AuthCard, authInputClass, authButtonClass, authLinkClass } from '@/components/auth/AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Becomes {{ .RedirectTo }} in the Supabase "Reset Password" email template,
    // which must point at /api/auth/confirm first — see README's Authentication
    // section for the exact template string this depends on.
    const supabase = createBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard>
        <h1 className="text-lg font-semibold text-white">Check your email</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          If <span className="text-white">{email}</span> has an EDGE account, a reset link is on its way.
        </p>
        <Link href="/login" className={`${authLinkClass} mt-6 block text-sm`}>
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className="text-lg font-semibold text-white">Reset your password</h1>
      <p className="mt-1.5 text-sm text-gray-400">Enter your email and we&apos;ll send you a reset link.</p>

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

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-500">
        Remembered it?{' '}
        <Link href="/login" className={authLinkClass}>
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

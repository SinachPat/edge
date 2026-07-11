'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-browser';
import { AuthCard, authInputClass, authButtonClass } from '@/components/auth/AuthCard';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push('/dashboard');
  }

  return (
    <AuthCard>
      <h1 className="text-lg font-semibold text-white">Set a new password</h1>
      <p className="mt-1.5 text-sm text-gray-400">Choose something you haven&apos;t used before.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-400">New password</span>
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

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-gray-400">Confirm password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={authInputClass}
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Saving...' : 'Save new password'}
        </button>
      </form>
    </AuthCard>
  );
}

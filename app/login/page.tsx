'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D1B2A] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-[#1A3C5E] bg-[#0F2236] p-6">
        <div className="mb-6 flex items-center gap-2">
          <span className="text-xl text-[#C8973A]" aria-hidden>
            ⬡
          </span>
          <span className="text-lg font-bold text-[#C8973A]">EDGE</span>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-gray-400">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-[#1A3C5E] bg-[#0A1829] px-3 py-2 text-white"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-gray-400">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-[#1A3C5E] bg-[#0A1829] px-3 py-2 text-white"
          />
        </label>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-[#C8973A] px-4 py-2 font-medium text-[#0D1B2A] disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

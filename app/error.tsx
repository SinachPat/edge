'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D1B2A] px-4 text-center">
      <span className="text-3xl text-red-400/60" aria-hidden>
        ⬡
      </span>
      <h1 className="mt-4 text-xl font-semibold text-white">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-400">
        That wasn&apos;t supposed to happen. Try again, or come back in a moment.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-6 rounded-lg bg-[#C8973A] px-5 py-2.5 font-semibold text-[#0D1B2A] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:shadow-[0_8px_20px_-6px_rgba(200,151,58,0.5)] active:scale-[0.98]"
      >
        Try again
      </button>
    </div>
  );
}

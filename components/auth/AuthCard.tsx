import Link from 'next/link';

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D1B2A] px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 transition-opacity hover:opacity-80">
          <span className="text-2xl text-[#C8973A]" aria-hidden>
            ⬡
          </span>
          <span className="text-xl font-bold tracking-tight text-[#C8973A]">EDGE</span>
        </Link>
        <div className="rounded-2xl border border-[#1A3C5E] bg-[#0F2236] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export const authInputClass =
  'w-full rounded-lg border border-[#1A3C5E] bg-[#0A1829] px-3.5 py-2.5 text-white placeholder:text-gray-600 transition-colors duration-150 outline-none focus:border-[#C8973A] focus:ring-1 focus:ring-[#C8973A]/40';

export const authButtonClass =
  'w-full rounded-lg bg-[#C8973A] px-4 py-2.5 font-semibold text-[#0D1B2A] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:shadow-[0_8px_20px_-6px_rgba(200,151,58,0.5)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

export const authLinkClass = 'text-[#C8973A] underline-offset-2 hover:underline';

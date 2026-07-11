'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Zap, Clock, TrendingUp, CalendarDays, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { trpc } from '@/lib/trpc-client';
import { createBrowserClient } from '@/lib/supabase-browser';

const LINKS = [
  { href: '/dashboard', label: 'Today', icon: Zap },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/bankroll', label: 'Bankroll', icon: TrendingUp },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: bankroll } = trpc.bankroll.getCurrent.useQuery();
  const balance = bankroll?.closing_balance ?? bankroll?.opening_balance;

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="fixed inset-y-0 left-0 hidden w-60 flex-col justify-between border-r border-[#1A3C5E] bg-[#0A1829] md:flex">
        <div>
          <div className="flex items-center gap-2 px-6 py-5">
            <span className="text-xl text-[#C8973A]" aria-hidden>
              ⬡
            </span>
            <span className="text-lg font-bold text-[#C8973A]">EDGE</span>
          </div>

          <div className="flex flex-col gap-1 px-3">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-[#1A3C5E] text-[#C8973A]' : 'text-gray-400 hover:text-white'
                  )}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[#1A3C5E] px-6 py-4">
          {balance !== undefined && (
            <>
              <p className="text-xs text-gray-500">Bankroll</p>
              <p className="mb-3 text-sm font-semibold text-white">₦{balance.toLocaleString()}</p>
            </>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-white"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-[#1A3C5E] bg-[#0A1829] md:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs',
                active ? 'text-[#C8973A]' : 'text-gray-500'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

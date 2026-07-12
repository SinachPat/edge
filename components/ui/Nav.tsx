'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Zap, Clock, TrendingUp, CalendarDays, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { trpc } from '@/lib/trpc-client';
import { createBrowserClient } from '@/lib/supabase-browser';

const LINKS = [
  { href: '/dashboard', label: 'Today', icon: Zap },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/bankroll', label: 'Bankroll', icon: TrendingUp },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
];

export function Nav({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
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
      <nav
        className={clsx(
          'fixed inset-y-0 left-0 hidden flex-col justify-between border-r border-[#1A3C5E] bg-[#0A1829] transition-[width] duration-200 md:flex',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div>
          <div className={clsx('flex items-center py-5', collapsed ? 'justify-center px-2' : 'justify-between px-6')}>
            <div className="flex items-center gap-2">
              <span className="text-xl text-[#C8973A]" aria-hidden>
                ⬡
              </span>
              {!collapsed && <span className="text-lg font-bold text-[#C8973A]">EDGE</span>}
            </div>
            {!collapsed && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="Collapse sidebar"
                className="text-gray-500 transition-colors duration-150 hover:text-white"
              >
                <PanelLeftClose size={18} />
              </button>
            )}
          </div>

          {collapsed && (
            <div className="flex justify-center px-2 pb-3">
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="Expand sidebar"
                className="text-gray-500 transition-colors duration-150 hover:text-white"
              >
                <PanelLeftOpen size={18} />
              </button>
            </div>
          )}

          <div className={clsx('flex flex-col gap-1', collapsed ? 'px-2' : 'px-3')}>
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors duration-150',
                    collapsed ? 'justify-center px-0' : 'px-3',
                    active ? 'bg-[#1A3C5E] text-[#C8973A]' : 'text-gray-400 hover:bg-[#0F2236] hover:text-white'
                  )}
                >
                  <Icon size={18} />
                  {!collapsed && label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className={clsx('border-t border-[#1A3C5E] py-4', collapsed ? 'px-2' : 'px-6')}>
          {balance !== undefined && !collapsed && (
            <>
              <p className="text-xs text-gray-500">Bankroll</p>
              <p className="mb-3 text-sm font-semibold text-white">₦{balance.toLocaleString()}</p>
            </>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            title={collapsed ? 'Sign out' : undefined}
            className={clsx(
              'flex items-center gap-2 text-xs text-gray-500 transition-colors duration-150 hover:text-white',
              collapsed && 'justify-center'
            )}
          >
            <LogOut size={14} />
            {!collapsed && 'Sign out'}
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
                'flex flex-1 flex-col items-center gap-0.5 border-t-2 py-2 text-xs transition-colors duration-150',
                active ? 'border-[#C8973A] text-[#C8973A]' : 'border-transparent text-gray-500 hover:text-gray-300'
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

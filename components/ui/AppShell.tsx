'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Nav } from './Nav';

const NO_SHELL_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];
const COLLAPSE_STORAGE_KEY = 'edge-nav-collapsed';

// The auth pages have no sidebar/tab bar, so they must not reserve the layout
// space for one — a single client component owns both decisions so they can
// never drift out of sync (unlike Nav silently rendering null while a server
// layout still pads for it). Collapse state lives here too, for the same
// reason: main's left padding must always match Nav's actual rendered width.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !NO_SHELL_PATHS.includes(pathname);
  const [collapsed, setCollapsed] = useState(false);

  // Read the saved preference after mount rather than during initial render —
  // localStorage isn't available during SSR, and seeding useState from it
  // directly would produce a server/client markup mismatch. This is a
  // one-time read, not an ongoing subscription, so useSyncExternalStore
  // (built for the latter) would be overkill here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a non-reactive external value (localStorage) on mount, not derived render state
    if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1') setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <>
      {showNav && <Nav collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />}
      <main
        className={
          showNav
            ? clsx('pb-16 transition-[padding-left] duration-200 md:pb-0', collapsed ? 'md:pl-16' : 'md:pl-60')
            : ''
        }
      >
        {children}
      </main>
    </>
  );
}

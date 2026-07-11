'use client';

import { usePathname } from 'next/navigation';
import { Nav } from './Nav';

const NO_SHELL_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

// The auth pages have no sidebar/tab bar, so they must not reserve the layout
// space for one — a single client component owns both decisions so they can
// never drift out of sync (unlike Nav silently rendering null while a server
// layout still pads for it).
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !NO_SHELL_PATHS.includes(pathname);

  return (
    <>
      {showNav && <Nav />}
      <main className={showNav ? 'pb-16 md:pb-0 md:pl-60' : ''}>{children}</main>
    </>
  );
}

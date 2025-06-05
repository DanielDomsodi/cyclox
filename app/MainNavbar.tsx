'use client';

import { buttonVariants } from '@/components/ui/button';
import clsx from 'clsx';
import { Activity, ChartNoAxesCombined, Home, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: <Home className="size-6" />,
  },
  {
    href: '/training',
    label: 'Training',
    icon: <Activity className="size-6" />,
  },
  {
    href: '/trends',
    label: 'Trends',
    icon: <ChartNoAxesCombined className="size-6" />,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: <User className="size-6" />,
  },
] satisfies Array<{ href: string; label: string; icon: React.ReactNode }>;

export function MainNavbar() {
  const pathname = usePathname();

  return (
    <ul className="flex h-full w-full flex-wrap items-center justify-evenly gap-6">
      {links.map((link) => (
        <li key={link.label}>
          <Link
            className={clsx(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              pathname === link.href ? 'text-orange-500' : undefined,
              'size-12 gap-0'
            )}
            href={link.href}
          >
            <div className="flex size-full flex-col items-center gap-0.5">
              {link.icon}
              <span>{link.label}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

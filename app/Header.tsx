import { auth } from '@/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import Link from 'next/link';

export default async function Header() {
  const session = await auth();
  const user = session?.user;
  console.log('### Header ~ session', session);

  return (
    <header className="flex h-16 items-center justify-between px-4">
      <h1 className="text-2xl font-bold">CycloX</h1>
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Link href="/" legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                Home
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href="/api/auth/signin" legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                Sign in
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link href="/api/auth/signout" legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                Sign out
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      <div>
        {user && (
          <Avatar>
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || 'Avatar'}
            />
            <AvatarFallback>
              {user.name?.charAt(0).toUpperCase() || ''}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
}

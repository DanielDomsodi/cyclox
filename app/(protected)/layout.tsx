import { SWRProvider } from '@/components/SWRProvider';
import Header from '../Header';
import { MainNavbar } from '../MainNavbar';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session) redirect('/getting-started');

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col antialiased">
      <header className="bg-background fixed top-0 right-0 left-0 z-50 flex h-16 items-center justify-between px-4">
        <Header />
      </header>
      <main className="flex-1 overflow-y-auto p-4 pt-16 pb-20">
        <SWRProvider>{children}</SWRProvider>
      </main>
      <nav className="border-t-border bg-background fixed right-0 bottom-0 left-0 z-50 row-start-3 h-20 w-full border-t pb-3">
        <MainNavbar />
      </nav>
    </div>
  );
}

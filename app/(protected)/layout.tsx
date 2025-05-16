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
    <div className="flex h-dvh flex-col bg-neutral-100 text-neutral-900 antialiased">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between bg-white px-4">
        <Header />
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <SWRProvider>{children}</SWRProvider>
      </main>
      <nav className="sticky bottom-0 z-50 row-start-3 h-20 w-full bg-white pb-3">
        <MainNavbar />
      </nav>
    </div>
  );
}

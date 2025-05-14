import { buttonVariants } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';

export default async function GettingStartedPage() {
  return (
    <main className="flex flex-col items-center gap-[32px] sm:items-start">
      <section className="flex w-full flex-col gap-6">getting started</section>
      <Image src="/cyclox-logo.svg" alt="CycloX" width={192} height={192} />
      <Link className={buttonVariants({ size: 'lg' })} href="/signin">
        Sign In
      </Link>
    </main>
  );
}

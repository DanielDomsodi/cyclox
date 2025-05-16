import { DailyFitness } from './DailyFitness';

export default async function DashboardPage() {
  return (
    <main className="flex flex-col items-center gap-[32px] sm:items-start">
      <section className="flex w-full flex-col gap-6">
        <DailyFitness />
      </section>
    </main>
  );
}

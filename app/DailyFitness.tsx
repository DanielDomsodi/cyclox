import { Card } from '@/components/ui/card';
import { fitnessService } from '@/lib/fitness/services';

export async function DailyFitness() {
  const dailyFitness = await fitnessService.getDailyFitness();

  return (
    <>
      <div className="flex flex-nowrap gap-4">
        <Card className="w-full p-4">
          Fitness: {dailyFitness?.fitness}{' '}
          <span>{dailyFitness.fitnessChange}%</span>
        </Card>
        <Card className="w-full p-4">
          Fatigue: {dailyFitness?.fatigue}{' '}
          <span>{dailyFitness.fatigueChange}%</span>
        </Card>
        <Card className="w-full p-4">
          Form: {dailyFitness?.form} <span>{dailyFitness.formChange}%</span>
        </Card>
      </div>
      <Card className="w-full p-4">
        Training load ratio: {dailyFitness?.acwr}
      </Card>
    </>
  );
}

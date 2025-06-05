import { Card } from '@/components/ui/card';
import { fitnessService } from '@/lib/fitness/services';
import { TrainingLoadRatio } from './TrainingLoadRatio';

export async function DailyFitness() {
  const dailyFitness = await fitnessService.getDailyFitness();

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-nowrap gap-4">
        <Card className="w-full gap-1 p-3">
          <div className="flex flex-nowrap justify-between">
            <span className="text-muted-foreground text-sm">Fitness</span>
            <span className="text-muted-foreground text-sm">
              {Math.round(dailyFitness.fitnessChange)}%
            </span>
          </div>
          <span className="text-2xl font-bold">{dailyFitness?.fitness}</span>
        </Card>

        <Card className="w-full gap-1 p-3">
          <div className="flex flex-nowrap justify-between">
            <span className="text-muted-foreground text-sm">Fatigue</span>
            <span className="text-muted-foreground text-sm">
              {Math.round(dailyFitness.fatigueChange)}%
            </span>
          </div>
          <span className="text-2xl font-bold">{dailyFitness?.fatigue}</span>
        </Card>

        <Card className="w-full gap-1 p-3">
          <div className="flex flex-nowrap justify-between">
            <span className="text-muted-foreground text-sm">Form</span>
            <span className="text-muted-foreground text-sm">
              {Math.round(dailyFitness.formChange)}%
            </span>
          </div>
          <span className="text-2xl font-bold">{dailyFitness?.form}</span>
        </Card>
      </div>
      <TrainingLoadRatio acwr={dailyFitness.acwr} />
    </div>
  );
}

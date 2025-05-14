import { prisma } from '@/lib/db/prisma';
import { average, change } from '@/lib/utils/math';
import { utc } from '@date-fns/utc';
import { addDays, isAfter, isBefore, isEqual, startOfToday } from 'date-fns';

async function getDailyFitness() {
  const today = startOfToday({ in: utc });
  const prevWeekStartDay = addDays(today, -13);
  const currentWeekStartDay = addDays(today, -6);

  const fitnessValues = await prisma.fitness.findMany({
    where: {
      date: {
        gte: prevWeekStartDay,
        lte: today,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  const todayFitness = fitnessValues.find((f) => isEqual(f.date, today));
  const prevWeekFitness = fitnessValues.filter((f) =>
    isBefore(f.date, currentWeekStartDay)
  );
  const currentWeekFitness = fitnessValues.filter((f) =>
    isAfter(f.date, addDays(currentWeekStartDay, -1))
  );

  const prevWeekFitnessAvg = average(
    prevWeekFitness.map((f) => f.fitness ?? 0)
  );

  const currentWeekFitnessAvg = average(
    currentWeekFitness.map((f) => f.fitness ?? 0)
  );

  const prevWeekFatigueAvg = average(
    prevWeekFitness.map((f) => f.fatigue ?? 0)
  );
  const currentWeekFatigueAvg = average(
    currentWeekFitness.map((f) => f.fatigue ?? 0)
  );

  const prevWeekFormAvg = average(
    prevWeekFitness.map((f) =>
      f.fitness && f.fatigue ? f.fitness - f.fatigue : 0
    )
  );
  const currentWeekFormAvg = average(
    currentWeekFitness.map((f) =>
      f.fitness && f.fatigue ? f.fitness - f.fatigue : 0
    )
  );

  const fitnessChange = change(currentWeekFitnessAvg, prevWeekFitnessAvg);
  const fatigueChange = change(currentWeekFatigueAvg, prevWeekFatigueAvg);
  const formChange = change(currentWeekFormAvg, prevWeekFormAvg);

  const roundedFitness = Math.round(todayFitness?.fitness ?? 0);
  const roundedFatigue = Math.round(todayFitness?.fatigue ?? 0);
  const calculatedForm = roundedFitness - roundedFatigue;
  const roundedAcwr = Math.round((todayFitness?.acwr ?? 0) * 100) / 100;

  return {
    fitness: roundedFitness,
    fitnessChange,
    fatigue: roundedFatigue,
    fatigueChange,
    form: calculatedForm,
    formChange,
    acwr: roundedAcwr,
  };
}

export const fitnessService = {
  getDailyFitness,
};

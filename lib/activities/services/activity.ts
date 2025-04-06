import { TransformedStravaActivity } from '@/lib/connections/strava/schemas/activities';
import { calculateCalories } from '@/lib/metrics/general';
import { calculateNP, calculateTSS } from '@/lib/metrics/power';
import { activityProcessSchema } from '../schemas';

function processActivity(
  userId: string,
  activity: TransformedStravaActivity,
  powerStream: (number | null)[] | null,
  ftp: number | null
) {
  let normalizedPower = null;
  let trainingLoad = null;
  let calories = null;

  if (powerStream && powerStream.length) {
    normalizedPower = calculateNP(powerStream);
  }

  if (normalizedPower && ftp) {
    trainingLoad = calculateTSS(normalizedPower, activity.movingTime, ftp);
  }

  if (activity.movingTime > 0 && activity.averageWatts) {
    calories = calculateCalories(activity.movingTime, activity.averageWatts);
  }

  const processedActivity = {
    ...activity,
    normalizedPower: normalizedPower ? Math.round(normalizedPower) : null,
    trainingLoad: trainingLoad ? Math.round(trainingLoad) : null,
    calories,
    userId,
  };

  return activityProcessSchema.parse(processedActivity);
}

export const activitiesService = {
  processActivity,
};

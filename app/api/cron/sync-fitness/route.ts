import { activitiesRepository } from '@/lib/activities/repository';
import { activitiesSyncService } from '@/lib/activities/services';
import {
  calculateContinuousMetrics,
  getMetricsArray,
  TrainingMetrics,
} from '@/lib/metrics/fitness';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const dateRange = activitiesSyncService.parseDateRangeFromRequest(req);
  const isAuthorized = activitiesSyncService.isAuthorizedCron(req);
  const isDryRun = activitiesSyncService.isDryRun(req);

  if (!isAuthorized) {
    console.warn('[ActivitySync] Unauthorized access attempt');
    return new Response('Unauthorized', { status: 401 });
  }

  // TODO: Implement dry run option
  /* TODO: Implement logic to handle the initial metrics
   * - if there is no activity in the date range, use the initial metrics
   * - if there are no activities, use the initial metrics
   * - if there are activities, use the last activity's metrics
   */

  try {
    const activities = await activitiesRepository.findMany(
      {
        where: {
          startDate: {
            lte: new Date(dateRange.endDate),
            gte: new Date(dateRange.startDate),
          },
        },
        orderBy: { startDate: 'asc' },
      },
      { trainingLoad: true, startDate: true }
    );

    const transformedActivities = activities.map((a) => ({
      trainingLoad: a.trainingLoad,
      date: a.startDate,
    }));

    const initialMetrics: TrainingMetrics = {
      ctl: 53,
      atl: 63,
      tsb: -10,
      date: new Date('2024-09-06'),
    };

    const metricsMap = calculateContinuousMetrics(
      transformedActivities,
      dateRange.startDate,
      dateRange.endDate,
      initialMetrics
    );

    const metricsArray = getMetricsArray(metricsMap);

    console.log('### activities', activities);

    console.log('Daily Training Metrics:');

    // const orderedDates = Array.from(metricsMap.keys()).sort();

    metricsArray.forEach((metrics) => {
      // const metrics = metricsMap.get(dateString)!;
      console.log(
        `Metric (${metrics.date!.toISOString().split('T')[0]}): ` +
          `Fitness (CTL): ${metrics.ctl} | ` +
          `Fatigue (ATL): ${metrics.atl} | ` +
          `Form (TSB): ${metrics.tsb}`
      );
    });

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Activities synced successfully',
        // data: activities,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[ActivitySync] Failed to sync activities`, error);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Unknown error occurred',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

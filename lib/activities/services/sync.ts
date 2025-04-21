import {
  StravaActivityStream,
  TransformedStravaActivity,
  transformedStravaActivitySchema,
} from '@/lib/connections/strava/schemas/activities';
import { stravaService } from '@/lib/connections/strava/service';
import { serverEnv } from '@/lib/env/server-env';
import {
  DateRange,
  dateRangeSchema,
  dateToUnixTimestampSchema,
} from '@/lib/schemas/date';
import { NextRequest } from 'next/server';
import { activitiesRepository } from '../repository';
import {
  ftpHistoriesRepository,
  ftpHistoriesService,
} from '@/lib/ftp-history/services';
import { activitiesService } from './activity';
import { ActivityProcess } from '../schemas';
import { connectionsRepository } from '@/app/api/connections/services';
import { ActivitiesSyncResultInfo } from '../types';
import { serviceError, serviceSuccess } from '@/lib/utils/service';
import pLimit from 'p-limit';
import { FtpHistory } from '@prisma/client';

function parseDateRangeFromRequest(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const afterDate = searchParams.get('after_date');
  const beforeDate =
    searchParams.get('before_date') || new Date().toISOString().split('T')[0];

  return dateRangeSchema.parse({
    startDate: afterDate,
    endDate: beforeDate,
  });
}

function isAuthorizedCron(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  return (
    !!serverEnv.CRON_SECRET && authHeader === `Bearer ${serverEnv.CRON_SECRET}`
  );
}

function isDryRun(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  return searchParams.get('dry_run') === 'true';
}

async function syncActivities(dateRange: DateRange) {
  const startTime = Date.now();
  const limit = pLimit(5);

  try {
    const stravaConnections = await connectionsRepository.findMany({
      provider: 'strava',
    });

    const results = await Promise.allSettled(
      stravaConnections.map((connection) =>
        limit(() => syncUserActivities(connection.userId, dateRange))
      )
    );

    const summary = aggregateResults(results);
    const totalDuration = (Date.now() - startTime) / 1000;

    console.log(
      `[ActivitySync] Sync completed in ${totalDuration.toFixed(2)}s:`,
      summary
    );

    return serviceSuccess({
      ...summary,
      totalConnections: stravaConnections.length,
      totalDuration,
    });
  } catch (error) {
    const errorDuration = (Date.now() - startTime) / 1000;
    console.error(
      `[ActivitySync] Fatal error after ${errorDuration.toFixed(2)}s:`,
      error
    );

    return serviceError('Failed to sync activities');
  }
}

async function syncUserActivities(userId: string, dateRange: DateRange) {
  const userStart = Date.now();

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalActivities = 0;
  let totalErrors = 0;

  console.log(`[ActivitySync] Processing user ${userId}`);

  try {
    const afterEpoch = dateToUnixTimestampSchema.parse(dateRange.startDate);
    const beforeEpoch = dateToUnixTimestampSchema.parse(dateRange.endDate);

    const stravaActivities = await stravaService.getActivities(userId, {
      after: afterEpoch,
      before: beforeEpoch,
      per_page: 100,
    });

    totalActivities += stravaActivities.length;
    console.log(
      `[ActivitySync] User ${userId}: Found ${stravaActivities.length} activities`
    );

    const stravaActivityIds = stravaActivities.map((activity) => activity.id);

    const transformedActivities = stravaActivities.map((activity) =>
      transformedStravaActivitySchema.parse(activity)
    );

    // Fetch existing activities to determine create vs update operations
    const existingActivities =
      await activitiesRepository.findExistingActivityIdsBySource(
        stravaActivityIds.map(String),
        'strava'
      );

    // Create a map for quick lookups
    const existingActivityIdMap = new Map(
      existingActivities.map((activity) => [activity.sourceId, activity])
    );

    const [activityStreams, ftpHistories] = await Promise.all([
      stravaService.getActivityStreams(userId, stravaActivityIds),
      ftpHistoriesRepository.findMany({ userId }),
    ]);

    const processedActivities = transformedActivities.map((activity) => {
      const activityStream = activityStreams.data[activity.sourceId];
      return createProcessedActivity(
        userId,
        activity,
        activityStream,
        ftpHistories
      );
    });

    // Prepare create and update operations
    const {
      totalCreated: totalCreatedOperation,
      totalUpdated: totalUpdatedOperation,
    } = await processBatchOperations(
      processedActivities,
      existingActivityIdMap
    );

    totalCreated += totalCreatedOperation;
    totalUpdated += totalUpdatedOperation;

    const userDuration = (Date.now() - userStart) / 1000;
    console.log(
      `[ActivitySync] User ${userId} completed in ${userDuration.toFixed(
        2
      )}s (Created: ${totalCreatedOperation}, Updated: ${totalUpdatedOperation})`
    );
  } catch (userError) {
    console.error(`[ActivitySync] Error processing user ${userId}:`, userError);
    totalErrors++;
  }

  return {
    totalActivities,
    totalCreated,
    totalUpdated,
    totalErrors,
  };
}

function createProcessedActivity(
  userId: string,
  activity: TransformedStravaActivity,
  activityStream: StravaActivityStream | null,
  ftpHistories: FtpHistory[]
) {
  const powerStream = activityStream?.watts?.data || null;

  const ftp = ftpHistoriesService.getFtpForDate(
    activity.startDate,
    ftpHistories
  );

  if (!ftp) {
    console.warn(
      `[ActivitySync] No FTP found for user ${userId} on activity date ${activity.startDate}`
    );
  }

  return activitiesService.processActivity(userId, activity, powerStream, ftp);
}

async function syncActivity(userId: string, sourceId: string) {
  try {
    const activity = await stravaService.getActivity(userId, sourceId);
    const transformedActivity = transformedStravaActivitySchema.parse(activity);

    const [activityStream, ftpHistories] = await Promise.all([
      // TODO: Handle properly the 'Resource not found' error
      stravaService.getActivityStream(userId, activity.id).catch((error) => {
        /**
         * Returns null for 'Resource Not Found' errors as this is valid in our app
         * (activity may have been deleted on Strava).
         * Other errors are logged and rethrown.
         */
        if (error instanceof Error) {
          if (error.message.includes('Resource Not Found')) {
            console.warn(
              `Activity stream not found on Strava for activity ${activity.id}: ${error.message}`
            );
            return null;
          }
        }

        throw error;
      }),
      ftpHistoriesRepository.findMany({ userId }),
    ]);

    const processedActivity = createProcessedActivity(
      userId,
      transformedActivity,
      activityStream,
      ftpHistories
    );

    const createdActivity = await activitiesRepository.create(
      processedActivity
    );

    return serviceSuccess({
      activity: createdActivity,
      message: 'Activity synced successfully',
    });
  } catch (error) {
    return serviceError(`Failed to sync activity ${sourceId}: ${error}`);
  }
}

async function processBatchOperations(
  processedActivities: ActivityProcess[],
  existingActivityMap: Map<string, { sourceId: string }>
) {
  let totalCreated = 0;
  let totalUpdated = 0;

  const createOperations: ActivityProcess[] = [];
  const updateOperations: ActivityProcess[] = [];

  for (const activity of processedActivities) {
    const existingActivity = existingActivityMap.get(String(activity.sourceId));

    if (!existingActivity) {
      createOperations.push(activity);
    } else {
      updateOperations.push(activity);
    }
  }

  // Execute create operations in batches
  if (createOperations.length > 0) {
    const result = await activitiesRepository.createMany(createOperations);

    if (result) {
      totalCreated += result.count;
    }
  }

  for (const activity of updateOperations) {
    const result = await activitiesRepository.updateActivityBySource(
      activity,
      'strava'
    );

    if (result) totalUpdated++;
  }

  return { totalCreated, totalUpdated };
}

function aggregateResults(
  results: PromiseSettledResult<ActivitiesSyncResultInfo>[]
) {
  let totalActivities = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      totalActivities += result.value.totalActivities;
      totalCreated += result.value.totalCreated;
      totalUpdated += result.value.totalUpdated;
    } else {
      totalErrors++;
    }
  });

  return {
    totalActivities,
    totalCreated,
    totalUpdated,
    totalErrors,
  };
}

export const activitiesSyncService = {
  isAuthorizedCron,
  parseDateRangeFromRequest,
  isDryRun,
  syncActivities,
  syncActivity,
};

import {
  StravaActivityStream,
  TransformedStravaActivity,
  transformedStravaActivitySchema,
} from '@/lib/connections/strava/schemas/activities';
import { stravaService } from '@/lib/connections/strava/service';
import { DateRange, dateToUnixTimestampSchema } from '@/lib/schemas/date';
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

const LOG_PREFIX = '[ActivitySync]';

interface SyncOptions {
  concurrencyLimit: number;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
}

interface SyncSummary extends ActivitiesSyncResultInfo {
  totalConnections: number;
  totalDurationSeconds: number;
  successRate: number;
}

// TODO: Implement a generic solution to handle multiple activity sources
// TODO: Write unit tests for this service
/**
 * Synchronizes activities from Strava for all users with Strava connections
 * @param dateRange Date range to sync activities for
 * @param isDryRun If true, no data will be written to the database
 * @param options Optional configuration for the sync process
 */
async function syncActivities(
  dateRange: DateRange,
  isDryRun = false,
  options: Partial<SyncOptions> = {}
) {
  const startTime = performance.now();

  // Default options with sensible values
  const syncOptions: SyncOptions = {
    concurrencyLimit: 5,
    batchSize: 100,
    retryAttempts: 3,
    retryDelay: 1000,
    ...options,
  };

  const limit = pLimit(syncOptions.concurrencyLimit);

  try {
    console.log(
      `${LOG_PREFIX} Starting sync for date range: ${dateRange.startDate.toISOString()} to ${
        dateRange.endDate?.toISOString() || 'now'
      }`
    );
    console.log(
      `${LOG_PREFIX} Mode: ${
        isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'
      }`
    );

    const stravaConnections = await connectionsRepository.findMany({
      provider: 'strava',
    });

    if (stravaConnections.length === 0) {
      console.log(`${LOG_PREFIX} No Strava connections found, nothing to sync`);
      return serviceSuccess<SyncSummary>({
        totalActivities: 0,
        totalCreated: 0,
        totalUpdated: 0,
        totalErrors: 0,
        totalConnections: 0,
        totalDurationSeconds: 0,
        successRate: 100,
      });
    }

    console.log(
      `${LOG_PREFIX} Found ${stravaConnections.length} Strava connections to process`
    );

    const results = await Promise.allSettled(
      stravaConnections.map((connection, index) =>
        limit(async () => {
          console.log(
            `${LOG_PREFIX} Processing connection ${index + 1}/${
              stravaConnections.length
            } for user ${connection.userId}`
          );

          let attempts = 0;
          let lastError: unknown;

          while (attempts < syncOptions.retryAttempts) {
            try {
              return await syncUserActivities(
                connection.userId,
                dateRange,
                isDryRun,
                {
                  batchSize: syncOptions.batchSize,
                }
              );
            } catch (error) {
              lastError = error;
              attempts++;

              if (attempts < syncOptions.retryAttempts) {
                const delay =
                  syncOptions.retryDelay * Math.pow(2, attempts - 1);
                console.warn(
                  `${LOG_PREFIX} Retry ${attempts}/${syncOptions.retryAttempts} for user ${connection.userId} after ${delay}ms`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          }

          // If all retries failed, throw the last error
          console.error(
            `${LOG_PREFIX} Failed to process user ${connection.userId} after ${syncOptions.retryAttempts} attempts`
          );
          throw lastError;
        })
      )
    );

    const summary = aggregateResults(results);
    const elapsedMs = performance.now() - startTime;
    const totalDurationSeconds = elapsedMs / 1000;

    // Calculate success rate
    const totalConnections = stravaConnections.length;
    const successfulConnections = totalConnections - summary.totalErrors;
    const successRate = Math.round(
      (successfulConnections / totalConnections) * 100
    );

    console.log(
      `${LOG_PREFIX} Sync completed in ${totalDurationSeconds.toFixed(2)}s\n` +
        `  Connections: ${successfulConnections}/${totalConnections} (${successRate}% success)\n` +
        `  Activities: ${summary.totalActivities} total\n` +
        `  Created: ${summary.totalCreated}, Updated: ${summary.totalUpdated}\n` +
        `  ${isDryRun ? 'DRY RUN - No data was modified' : ''}`
    );

    return serviceSuccess({
      ...summary,
      totalConnections,
      totalDurationSeconds,
      successRate,
    });
  } catch (error) {
    const elapsedMs = performance.now() - startTime;
    const errorDuration = elapsedMs / 1000;

    console.error(
      `${LOG_PREFIX} Fatal error after ${errorDuration.toFixed(2)}s:`,
      error instanceof Error ? error.message : String(error)
    );

    return serviceError('Failed to sync activities');
  }
}

/**
 * Synchronizes activities for a single user from Strava
 * @param userId User ID to sync activities for
 * @param dateRange Date range to sync activities for
 * @param isDryRun If true, no data will be written to the database
 * @param options Optional configuration for the sync process
 */
async function syncUserActivities(
  userId: string,
  dateRange: DateRange,
  isDryRun = false,
  options: { batchSize?: number } = {}
) {
  const userStart = performance.now();
  const batchSize = options.batchSize || 100;

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalActivities = 0;
  let totalErrors = 0;

  console.log(`${LOG_PREFIX} Processing user ${userId}`);

  try {
    const afterEpoch = dateToUnixTimestampSchema.parse(dateRange.startDate);
    const beforeEpoch = dateToUnixTimestampSchema.parse(dateRange.endDate);

    // Fetch activities from Strava with pagination support
    let page = 1;
    const allActivities: TransformedStravaActivity[] = [];
    let hasMorePages = true;

    while (hasMorePages) {
      const activities = await stravaService.getActivities(userId, {
        after: afterEpoch,
        before: beforeEpoch,
        per_page: batchSize,
        page,
      });

      if (activities.length === 0) {
        hasMorePages = false;
      } else {
        const transformedBatch = activities.map((activity) =>
          transformedStravaActivitySchema.parse(activity)
        );

        allActivities.push(...transformedBatch);
        page++;

        // Break if we received fewer than the requested number (last page)
        if (activities.length < batchSize) {
          hasMorePages = false;
        }
      }
    }

    totalActivities = allActivities.length;
    console.log(
      `${LOG_PREFIX} User ${userId}: Found ${totalActivities} activities`
    );

    // Early return if no activities found
    if (totalActivities === 0) {
      const userDuration = (performance.now() - userStart) / 1000;
      console.log(
        `${LOG_PREFIX} User ${userId} completed in ${userDuration.toFixed(
          2
        )}s (No activities found)`
      );

      return {
        totalActivities: 0,
        totalCreated: 0,
        totalUpdated: 0,
        totalErrors: 0,
      };
    }

    // Extract activity IDs for efficient querying
    const stravaActivityIds = allActivities.map(
      (activity) => activity.sourceId
    );

    // Fetch existing activities to determine create vs update operations
    const existingActivities =
      await activitiesRepository.findExistingActivityIdsBySource(
        stravaActivityIds,
        'strava'
      );

    // Create a map for quick lookups
    const existingActivityIdMap = new Map(
      existingActivities.map((activity) => [activity.sourceId, activity])
    );

    // Fetch FTP history for this user
    const ftpHistories = await ftpHistoriesRepository.findMany({ userId });

    // Process activities in smaller batches for better memory usage and parallelism
    const activityBatches = [];

    for (let i = 0; i < stravaActivityIds.length; i += batchSize) {
      activityBatches.push(stravaActivityIds.slice(i, i + batchSize));
    }

    const processedActivities: ActivityProcess[] = [];

    for (const [batchIndex, activityIdBatch] of activityBatches.entries()) {
      console.log(
        `${LOG_PREFIX} User ${userId}: Processing activity batch ${
          batchIndex + 1
        }/${activityBatches.length}`
      );
      // Fetch activity streams in batches
      const activityStreams = await stravaService.getActivityStreams(
        userId,
        activityIdBatch.map((id) => Number(id))
      );

      // Find the activities in this batch
      const activitiesBatch = allActivities.filter((a) =>
        activityIdBatch.includes(a.sourceId)
      );

      // Process each activity in the batch
      const batchProcessed = activitiesBatch.map((activity) => {
        const activityStream = activityStreams.data[activity.sourceId];
        return createProcessedActivity(
          userId,
          activity,
          activityStream,
          ftpHistories
        );
      });

      processedActivities.push(...batchProcessed);
    }

    // In dry run mode, return stats without making changes
    if (isDryRun) {
      const createCount = processedActivities.filter(
        (a) => !existingActivityIdMap.has(String(a.sourceId))
      ).length;

      const updateCount = processedActivities.length - createCount;

      console.log(
        `${LOG_PREFIX} User ${userId}: Dry run complete. Would create ${createCount} and update ${updateCount} activities.`
      );

      return {
        totalActivities,
        totalCreated: createCount,
        totalUpdated: updateCount,
        totalErrors: 0,
      };
    }

    // Process database operations with better error handling
    try {
      const { totalCreated: created, totalUpdated: updated } =
        await processBatchOperations(
          processedActivities,
          existingActivityIdMap
        );

      totalCreated = created;
      totalUpdated = updated;
    } catch (dbError) {
      console.error(
        `${LOG_PREFIX} Database operation error for user ${userId}:`,
        dbError
      );
      totalErrors++;

      // Re-throw to trigger retry at the higher level
      throw dbError;
    }

    const userDuration = (performance.now() - userStart) / 1000;
    console.log(
      `${LOG_PREFIX} User ${userId} completed in ${userDuration.toFixed(2)}s ` +
        `(Created: ${totalCreated}, Updated: ${totalUpdated}, Total: ${totalActivities})`
    );

    return {
      totalActivities,
      totalCreated,
      totalUpdated,
      totalErrors,
    };
  } catch (error) {
    const userDuration = (performance.now() - userStart) / 1000;
    console.error(
      `${LOG_PREFIX} Error processing user ${userId} after ${userDuration.toFixed(
        2
      )}s:`,
      error instanceof Error ? error.message : String(error)
    );

    totalErrors++;

    // Re-throw error to allow for retry at the parent level
    throw error;
  }
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
  syncActivities,
  syncActivity,
};

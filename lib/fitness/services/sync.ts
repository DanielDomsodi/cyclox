import { activitiesRepository } from '@/lib/activities/repository';
import { prisma } from '@/lib/db/prisma';
import {
  calculateACWR,
  calculateContinuousMetrics,
  getMetricsArray,
  TrainingMetrics,
} from '@/lib/metrics/fitness';
import { DateRange } from '@/lib/schemas/date';
import { usersRepository } from '@/lib/users/services';
import { formatYYYYMMDD, getYesterday } from '@/lib/utils/date';
import { serviceError, serviceSuccess } from '@/lib/utils/service';
import { Prisma } from '@prisma/client';
import pLimit from 'p-limit';
import { logger } from '@/lib/logging/client';

interface SyncOptions {
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  concurrencyLimit: number;
}

interface SyncStats {
  success: number;
  error: number;
  retries: number;
  totalUsers: number;
  createdMetrics: number;
  updatedMetrics: number;
  processingTimeMs: number;
}

async function syncFitness(
  dateRange: DateRange,
  isDryRun = false,
  options: Partial<SyncOptions> = {}
) {
  const startTime = performance.now();
  const syncOptions: SyncOptions = {
    batchSize: 10,
    maxRetries: 3,
    retryDelayMs: 1000,
    concurrencyLimit: 5,
    ...options,
  };
  const limit = pLimit(syncOptions.concurrencyLimit);

  const stats: SyncStats = {
    success: 0,
    error: 0,
    retries: 0,
    totalUsers: 0,
    createdMetrics: 0,
    updatedMetrics: 0,
    processingTimeMs: 0,
  };

  try {
    logger.info(
      `[FitnessSync] Starting sync process${
        isDryRun ? ' (DRY RUN)' : ''
      } for date range: ${dateRange.startDate.toISOString()} to ${dateRange.endDate?.toISOString()}`
    );

    const usersWithFitness = await usersRepository.findUsersWithFitness();
    stats.totalUsers = usersWithFitness.length;

    const batches = [];

    for (let i = 0; i < usersWithFitness.length; i += syncOptions.batchSize) {
      batches.push(usersWithFitness.slice(i, i + syncOptions.batchSize));
    }

    let processedUsers = 0;

    for (const [batchIndex, userBatch] of batches.entries()) {
      logger.info(
        `[FitnessSync] Processing batch ${batchIndex + 1}/${batches.length} (${
          userBatch.length
        } users)`
      );
      const batchResults = await Promise.allSettled(
        userBatch.map((user) =>
          limit(async () => {
            let retries = 0;
            let lastError: unknown = null;

            while (retries <= syncOptions.maxRetries) {
              try {
                const result = await syncUserFitness(
                  user.id,
                  dateRange,
                  isDryRun
                );
                processedUsers++;
                const progressPercent = Math.round(
                  (processedUsers / stats.totalUsers) * 100
                );
                logger.info(
                  `[FitnessSync] Progress: ${progressPercent}% (${processedUsers}/${stats.totalUsers})`
                );

                return { userId: user.id, metrics: result };
              } catch (error) {
                lastError = error;
                retries++;
                stats.retries++;

                if (retries <= syncOptions.maxRetries) {
                  logger.warn(
                    `[FitnessSync] Retry ${retries}/${
                      syncOptions.maxRetries
                    } for user ${user.id}: ${
                      error instanceof Error ? error.message : String(error)
                    }`
                  );

                  await new Promise((resolve) =>
                    setTimeout(
                      resolve,
                      syncOptions.retryDelayMs * Math.pow(2, retries - 1)
                    )
                  );
                }
              }
            }

            throw new Error(
              `Failed after ${retries} attempts for user ${user.id}: ${
                lastError instanceof Error
                  ? lastError.message
                  : String(lastError)
              }`
            );
          })
        )
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          stats.success++;
        } else {
          stats.error++;
          logger.error(`[FitnessSync] Error syncing user: ${result.reason}`);
        }
      }
    }

    stats.processingTimeMs = Math.round(performance.now() - startTime);
    const totalDuration = (stats.processingTimeMs / 1000).toFixed(2);

    if (isDryRun) {
      logger.info(
        `[FitnessSync] Dry run completed in ${totalDuration}s. No changes were made. ` +
          `Success: ${stats.success}, Errors: ${stats.error}, Retries: ${stats.retries}`
      );
    } else {
      logger.info(
        `[FitnessSync] Sync completed in ${totalDuration}s. ` +
          `Success: ${stats.success}, Errors: ${stats.error}, Retries: ${stats.retries}, ` +
          `Total Users: ${stats.totalUsers}`
      );
    }

    return serviceSuccess({
      ...stats,
      totalDurationSeconds: Number(totalDuration),
    });
  } catch (error) {
    stats.processingTimeMs = Math.round(performance.now() - startTime);
    logger.error(
      `[FitnessSync] Error during sync: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return serviceError('Error during sync');
  }
}

async function syncUserFitness(
  userId: string,
  dateRange: DateRange,
  isDryRun = false
) {
  try {
    logger.info(`[FitnessSync] Starting sync for user ${userId}`);

    const activities = await activitiesRepository.findMany(
      {
        where: {
          userId,
          startDate: {
            lte: new Date(dateRange.endDate),
            gte: new Date(dateRange.startDate),
          },
        },
        orderBy: { startDate: 'asc' },
      },
      { trainingLoad: true, startDate: true }
    );

    logger.info(
      `[FitnessSync] User ${userId}: Found ${activities.length} activities in date range`
    );

    const transformedActivities = activities.map((a) => ({
      trainingLoad: a.trainingLoad ?? 0,
      date: a.startDate,
    }));

    let initialMetrics: TrainingMetrics = {
      ctl: 0,
      atl: 0,
      tsb: 0,
      date: getYesterday(dateRange.startDate),
    };

    // Find the most recent metrics before the start date to use as initial values
    const prevDayMetrics = await prisma.fitness.findFirst({
      where: {
        userId,
        date: {
          lt: new Date(dateRange.startDate),
        },
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        fitness: true,
        fatigue: true,
        form: true,
        date: true,
      },
    });

    if (prevDayMetrics) {
      initialMetrics = {
        ctl: prevDayMetrics.fitness ?? 0,
        atl: prevDayMetrics.fatigue ?? 0,
        tsb: prevDayMetrics.form ?? 0,
        date: prevDayMetrics.date,
      };
      logger.info(
        `[FitnessSync] User ${userId}: Using previous metrics from ${formatYYYYMMDD(
          initialMetrics.date!
        )}`
      );
    }

    const metricsMap = calculateContinuousMetrics(
      transformedActivities,
      dateRange.startDate,
      dateRange.endDate,
      initialMetrics
    );

    const metricsArray = getMetricsArray(metricsMap);

    // Only log a sample of metrics for readability
    const sampleSize = 3;
    const sampleMetrics =
      metricsArray.length <= sampleSize * 2
        ? metricsArray
        : [
            ...metricsArray.slice(0, sampleSize),
            ...metricsArray.slice(-sampleSize),
          ];

    sampleMetrics.forEach((metrics) => {
      const date = formatYYYYMMDD(metrics.date!);
      const acwr = calculateACWR(metrics.atl, metrics.ctl);
      logger.info(
        `[FitnessSync] User ${userId} Metric (${date}): ` +
          `Fitness: ${metrics.ctl.toFixed(2)} | ` +
          `Fatigue: ${metrics.atl.toFixed(2)} | ` +
          `Form: ${metrics.tsb.toFixed(2)} | ` +
          `ACWR: ${acwr?.toFixed(2) ?? 'N/A'}`
      );
    });

    if (isDryRun) {
      logger.info(
        `[FitnessSync] User ${userId}: Dry run complete, calculated ${metricsArray.length} metrics`
      );
      return metricsArray;
    }

    const existingMetrics = await prisma.fitness.findMany({
      where: {
        userId,
        date: {
          lte: new Date(dateRange.endDate),
          gte: new Date(dateRange.startDate),
        },
      },
      select: {
        date: true,
      },
    });

    const existingMetricsMap = new Map(
      existingMetrics.map((metric) => [formatYYYYMMDD(metric.date), metric])
    );

    const update: TrainingMetrics[] = [];
    const create: TrainingMetrics[] = [];

    for (const metric of metricsArray) {
      const dateKey = formatYYYYMMDD(metric.date!);
      const existingMetric = existingMetricsMap.get(dateKey);

      if (existingMetric) {
        update.push(metric);
      } else {
        create.push(metric);
      }
    }

    logger.info(
      `[FitnessSync] User ${userId}: Updating ${update.length} metrics, creating ${create.length} metrics`
    );

    // SOLUTION 1: Increase transaction timeout
    // For larger data sets, increase the timeout to avoid transaction expiration
    const TRANSACTION_TIMEOUT = 30000; // 30 seconds

    // SOLUTION 2: Process in smaller batches
    const BATCH_SIZE = 50;

    // Update existing metrics (potential bottleneck)
    if (update.length > 0) {
      // Process updates in smaller batches to prevent transaction timeout
      for (let i = 0; i < update.length; i += BATCH_SIZE) {
        const batch = update.slice(i, i + BATCH_SIZE);

        await prisma.$transaction(
          async (tx) => {
            await Promise.all(
              batch.map(async (metric) => {
                const acwr = calculateACWR(metric.atl, metric.ctl);
                await tx.fitness.update({
                  where: {
                    userId_date: {
                      userId,
                      date: new Date(formatYYYYMMDD(metric.date!)),
                    },
                  },
                  data: {
                    fitness: metric.ctl,
                    fatigue: metric.atl,
                    form: metric.tsb,
                    acwr,
                  },
                });
              })
            );
          },
          {
            timeout: TRANSACTION_TIMEOUT, // Explicit timeout setting
            maxWait: 10000, // Maximum time to wait for transaction to start
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // Less strict isolation for better performance
          }
        );
      }
    }

    // Create new metrics
    if (create.length > 0) {
      // Process creation in smaller batches
      for (let i = 0; i < create.length; i += BATCH_SIZE) {
        const batch = create.slice(i, i + BATCH_SIZE);

        await prisma.fitness.createMany({
          data: batch.map((metric) => ({
            userId,
            fitness: metric.ctl,
            fatigue: metric.atl,
            form: metric.tsb,
            acwr: calculateACWR(metric.atl, metric.ctl),
            date: new Date(formatYYYYMMDD(metric.date!)),
          })),
          skipDuplicates: true,
        });
      }
    }

    logger.info(
      `[FitnessSync] User ${userId}: Successfully synced ${metricsArray.length} metrics`
    );
    return metricsArray;
  } catch (error) {
    logger.error(
      `[FitnessSync] Error syncing user ${userId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error; // Re-throw for the retry mechanism in the parent function
  }
}

export const fitnessSyncService = {
  syncFitness,
};

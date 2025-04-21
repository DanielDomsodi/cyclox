import { activitiesSyncService } from '@/lib/activities/services';
import { fitnessSyncService } from '@/lib/fitness/services';
import { ApiErrorResponse, ApiSuccessResponse } from '@/lib/types/api';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const LOG_PREFIX = '[FitnessSync]';

  try {
    const dateRange = activitiesSyncService.parseDateRangeFromRequest(req);
    const isAuthorized = activitiesSyncService.isAuthorizedCron(req);
    const isDryRun = activitiesSyncService.isDryRun(req);

    if (!isAuthorized) {
      console.warn(`${LOG_PREFIX} Unauthorized access attempt`);
      return Response.json(
        {
          status: 'error',
          message: 'Unauthorized access',
          error: 'Invalid or missing authorization token',
        } satisfies ApiErrorResponse,
        { status: 401 }
      );
    }

    const result = await fitnessSyncService.syncFitness(dateRange, isDryRun);

    return Response.json(
      {
        status: 'success',
        message: `Fitness metrics synced successfully${
          isDryRun ? ' (dry run)' : ''
        }`,
        data: result,
      } satisfies ApiSuccessResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to sync fitness metrics:`, error);

    return Response.json(
      {
        status: 'error',
        message: 'Failed to sync fitness metrics',
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      } satisfies ApiErrorResponse,
      { status: 500 }
    );
  }
}

import { fitnessSyncService } from '@/lib/fitness/services';
import { ApiErrorResponse, ApiSuccessResponse } from '@/lib/types/api';
import {
  isAuthorizedCron,
  isDryRun,
  parseDateRangeFromRequest,
} from '@/lib/utils/api-request';
import { BetterStackRequest, withBetterStack } from '@logtail/next';

export const POST = withBetterStack(async (req: BetterStackRequest) => {
  const LOG_PREFIX = '[FitnessSync]';

  try {
    const dateRange = parseDateRangeFromRequest(req);
    const isAuthorized = isAuthorizedCron(req);
    const isDryRunMode = isDryRun(req);

    if (!isAuthorized) {
      req.log.warn(`${LOG_PREFIX} Unauthorized access attempt`);
      return Response.json(
        {
          status: 'error',
          message: 'Unauthorized access',
          error: 'Invalid or missing authorization token',
        } satisfies ApiErrorResponse,
        { status: 401 }
      );
    }

    const result = await fitnessSyncService.syncFitness(
      dateRange,
      isDryRunMode
    );

    return Response.json(
      {
        status: 'success',
        message: `Fitness metrics synced successfully${
          isDryRunMode ? ' (dry run)' : ''
        }`,
        data: result,
      } satisfies ApiSuccessResponse,
      { status: 200 }
    );
  } catch (error) {
    req.log.error(`${LOG_PREFIX} Failed to sync fitness metrics:`, { error });

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
});

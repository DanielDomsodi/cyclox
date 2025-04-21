import { activitiesSyncService } from '@/lib/activities/services';
import { ApiErrorResponse, ApiSuccessResponse } from '@/lib/types/api';
import {
  isAuthorizedCron,
  isDryRun,
  parseDateRangeFromRequest,
} from '@/lib/utils/api-request';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// TODO: Implement a generic solution to handle multiple activity sources
export async function POST(req: NextRequest) {
  const LOG_PREFIX = '[ActivitySync]';

  try {
    const dateRange = parseDateRangeFromRequest(req);
    const isAuthorized = isAuthorizedCron(req);
    const isDryRunMode = isDryRun(req);

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

    const result = await activitiesSyncService.syncActivities(
      dateRange,
      isDryRunMode
    );

    if (!result.success) {
      console.error(`${LOG_PREFIX} Failed to sync activities: ${result.error}`);
      return Response.json(
        {
          status: 'error',
          message: 'Failed to sync activities',
          error: result.error?.toString() ?? 'Unknown error',
        } satisfies ApiErrorResponse,
        { status: 500 }
      );
    }

    return Response.json(
      {
        status: 'success',
        message: `Activities synced successfully${
          isDryRunMode ? ' (dry run)' : ''
        }`,
        data: result.data,
      } satisfies ApiSuccessResponse,
      { status: 200 }
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

import { activitiesSyncService } from '@/lib/activities/services';
import { serverEnv } from '@/lib/env/server-env';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// TODO: Implement a generic solution to handle multiple activity sources
export async function GET(req: NextRequest) {
  const dateRange = activitiesSyncService.parseDateRangeFromRequest(req);

  // TODO: Remove this when the cron job is set up
  req.headers.set('Authorization', 'Bearer ' + serverEnv.CRON_SECRET);

  const isAuthorized = activitiesSyncService.isAuthorizedCron(req);

  if (!isAuthorized) {
    console.warn('[ActivitySync] Unauthorized access attempt');
    return new Response('Unauthorized', { status: 401 });
  }

  console.log(
    `[ActivitySync] Starting sync process for date range: ${dateRange.startDate.toISOString()} to ${dateRange.endDate?.toISOString()}`
  );

  try {
    const result = await activitiesSyncService.syncActivities(dateRange);

    if (!result.success) {
      console.error('[ActivitySync] Failed to sync activities');
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Failed to sync activities',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Activities synced successfully',
        data: result.data,
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

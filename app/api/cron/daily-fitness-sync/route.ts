import { fitnessSyncService } from '@/lib/fitness/services';
import { isAuthorizedCron } from '@/lib/utils/api-request';
import { BetterStackRequest, withBetterStack } from '@logtail/next';
import { addDays, endOfDay, startOfYesterday } from 'date-fns';
import { utc, UTCDate } from '@date-fns/utc';

export const GET = withBetterStack(async (req: BetterStackRequest) => {
  const LOG_PREFIX = '[DailyFitnessSync]';

  try {
    req.log.info(`${LOG_PREFIX} Job started`);

    const isAuthorized = isAuthorizedCron(req);

    if (!isAuthorized) {
      req.log.warn(`${LOG_PREFIX} Unauthorized access attempt`);
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Unauthorized access',
          error: 'Invalid or missing authorization token',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const yesterday = startOfYesterday({ in: utc });
    const nextWeek = endOfDay(addDays(new UTCDate(), 7), { in: utc });

    const res = await fitnessSyncService.syncFitness({
      startDate: yesterday,
      endDate: nextWeek,
    });

    return new Response(
      JSON.stringify({
        status: 'success',
        message: `Job executed successfully`,
        data: res.data,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    req.log.error(`${LOG_PREFIX} Unexpected error:`, { error });
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

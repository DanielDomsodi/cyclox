import { cronJobs } from '@/lib/cron/config';
import { isAuthorizedCron } from '@/lib/utils/api-request';
import { BetterStackRequest, withBetterStack } from '@logtail/next';

export const GET = withBetterStack(async (req: BetterStackRequest) => {
  const LOG_PREFIX = '[FitnessSync]';

  try {
    const searchParams = req.nextUrl.searchParams;
    const isAuthorized = isAuthorizedCron(req);
    const job = searchParams.get('job') as keyof typeof cronJobs;

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

    if (!job) {
      req.log.warn(`${LOG_PREFIX} No job specified`);
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'No job specified',
          error: 'Job parameter is required',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    const jobConfig = cronJobs[job];

    if (!jobConfig) {
      req.log.warn(`${LOG_PREFIX} Invalid job specified: ${job}`);
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Invalid job specified',
          error: `Job "${job}" does not exist`,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const params = jobConfig.getParams();

    const url = new URL(jobConfig.endpoint, req.nextUrl.origin);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    const headers = new Headers();
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      headers.set('Authorization', req.headers.get('Authorization') || '');
    }

    req.log.info(`${LOG_PREFIX} Executing job "${job}" with params:`, {
      params,
    });
    req.log.info(`${LOG_PREFIX} Fetching URL: ${url.toString()}`);
    req.log.info(`${LOG_PREFIX} Headers:`, {
      headers: Object.fromEntries(headers.entries()),
    });

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const data = await response.json();

    req.log.info(`${LOG_PREFIX} Response:`, { data });

    if (!response.ok) {
      req.log.error(
        `${LOG_PREFIX} Job "${job}" failed with status ${response.status}`
      );
      return new Response(
        JSON.stringify({
          status: 'error',
          message: `Job "${job}" failed with status ${response.status}`,
          error: data.error || 'Unknown error',
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    req.log.info(`${LOG_PREFIX} Job "${job}" executed successfully`);
    return new Response(
      JSON.stringify({
        status: 'success',
        message: `Job "${job}" executed successfully`,
        data,
      }),
      {
        status: response.status,
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

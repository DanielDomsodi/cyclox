import { cronJobs } from '@/lib/cron/config';
import { ApiErrorResponse, ApiSuccessResponse } from '@/lib/types/api';
import { isAuthorizedCron } from '@/lib/utils/api-request';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const LOG_PREFIX = '[FitnessSync]';

  try {
    const searchParams = req.nextUrl.searchParams;
    const isAuthorized = isAuthorizedCron(req);
    const job = searchParams.get('job') as keyof typeof cronJobs;

    if (!isAuthorized) {
      console.warn(`${LOG_PREFIX} Unauthorized access attempt`);
      return Response.json(
        {
          status: 'error',
          message: 'Unauthorized access',
          error: 'Invalid or missing authorization token',
        },
        { status: 401 }
      );
    }
    if (!job) {
      console.warn(`${LOG_PREFIX} No job specified`);
      return Response.json(
        {
          status: 'error',
          message: 'No job specified',
          error: 'Job parameter is required',
        },
        { status: 400 }
      );
    }
    const jobConfig = cronJobs[job];

    if (!jobConfig) {
      console.warn(`${LOG_PREFIX} Invalid job specified: ${job}`);
      return Response.json(
        {
          status: 'error',
          message: 'Invalid job specified',
          error: `Job "${job}" does not exist`,
        },
        { status: 400 }
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

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        `${LOG_PREFIX} Job "${job}" failed with status ${response.status}`
      );
      return Response.json(
        {
          status: 'error',
          message: `Job "${job}" failed with status ${response.status}`,
          error: data.error || 'Unknown error',
        } satisfies ApiErrorResponse,
        { status: response.status }
      );
    }

    console.info(`${LOG_PREFIX} Job "${job}" executed successfully`);
    return Response.json(
      {
        status: 'success',
        message: `Job "${job}" executed successfully`,
        data,
      } satisfies ApiSuccessResponse,
      { status: response.status }
    );
  } catch (error) {
    console.error(`${LOG_PREFIX} Unexpected error:`, error);
    return Response.json(
      {
        status: 'error',
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      } satisfies ApiErrorResponse,
      { status: 500 }
    );
  }
}

import { auth } from '@/auth';
import { stravaService } from '@/lib/connections/strava/service';
import { serverEnv } from '@/lib/env/server-env';
import { BetterStackRequest, withBetterStack } from '@logtail/next';
import { NextResponse } from 'next/server';

export const GET = withBetterStack(async (request: BetterStackRequest) => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session || !userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return new Response('Invalid request', { status: 400 });
  }

  try {
    stravaService.connect(userId, code);

    return NextResponse.redirect(`${serverEnv.BASE_URL}/settings?success=true`);
  } catch (error) {
    request.log.error('Error connecting to Strava:', { error });
    return NextResponse.redirect(
      `${serverEnv.BASE_URL}?error=connection_failed`
    );
  }
});

import { auth } from '@/auth';
import { stravaService } from '@/lib/connections/strava/service';
import { serverEnv } from '@/lib/env/server-env';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
    console.error('Error connecting to Strava:', error);
    return NextResponse.redirect(
      `${serverEnv.BASE_URL}?error=connection_failed`
    );
  }
}

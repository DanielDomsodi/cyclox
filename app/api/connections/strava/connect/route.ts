import { stravaService } from '@/lib/connections/strava/service';
import { NextResponse } from 'next/server';

export async function GET() {
  const authUrl = stravaService.createAuthUrl();

  return NextResponse.redirect(authUrl);
}

import { Button, buttonVariants } from '@/components/ui/button';
import { auth } from '@/auth';
import { connectionsService } from '@/lib/connections/service';
import { stravaService } from '@/lib/connections/strava/service';
import { AthleteProfile } from './StravaAthlete';

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session || !userId) {
    throw new Error('User not authenticated');
  }

  const stravaAthlete = null;
  const activeConnections = await connectionsService.getActiveConnections();

  return (
    <div className="flex h-screen">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div>
          <h2 className="text-xl font-bold">Connections</h2>
          <a
            className={buttonVariants({ variant: 'outline' })}
            href="/api/connections/strava/connect"
          >
            Connect to Strava
          </a>
          <Button
            onClick={async () => {
              'use server';
              await stravaService.revoke(userId);
            }}
          >
            Revoke Strava connection
          </Button>
        </div>
        {stravaAthlete && (
          <div>
            <h2 className="text-xl font-bold">Strava Athlete</h2>
            <pre>{JSON.stringify(stravaAthlete, null, 2)}</pre>
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold">Connections</h2>
          <pre>{JSON.stringify(activeConnections, null, 2)}</pre>
        </div>
        {!!activeConnections.includes('strava') && <AthleteProfile />}
      </div>
    </div>
  );
}

import { auth } from '@/auth';
import { stravaService } from '@/lib/connections/strava/service';

export async function AthleteProfile() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session || !userId) {
    return null;
  }

  const athlete = await stravaService.getAthlete(userId);

  return (
    <div className="flex flex-col gap-8">
      <h2>Athlete Profile</h2>
      <pre>{JSON.stringify(athlete, null, 2)}</pre>
    </div>
  );
}

import { auth } from '@/auth';
import { Bell } from 'lucide-react';

export default async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">Hi, {user?.name?.split(' ')[0]}!</h1>
      </div>

      <div>
        <Bell />
      </div>
    </>
  );
}

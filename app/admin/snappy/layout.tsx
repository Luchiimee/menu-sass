import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-server';
import { hasAdminSnappyAccess } from '@/lib/access';

export default async function AdminSnappyLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user || !hasAdminSnappyAccess(user.email)) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}

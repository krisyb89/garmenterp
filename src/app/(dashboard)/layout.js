// src/app/(dashboard)/layout.js
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardShell from '@/components/DashboardShell';

export default async function DashboardLayout({ children }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error('[DashboardLayout] getCurrentUser failed:', err?.message);
    user = null;
  }

  if (!user) {
    redirect('/login');
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}

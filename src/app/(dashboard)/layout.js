// src/app/(dashboard)/layout.js
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { I18nProvider } from '@/i18n/I18nProvider';

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

  return (
    <I18nProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </I18nProvider>
  );
}
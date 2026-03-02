// src/app/(dashboard)/layout.js
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { I18nProvider } from '@/i18n/I18nProvider';
import prisma from '@/lib/prisma';

export default async function DashboardLayout({ children }) {
  let user = null;
  try {
    // Direct cookie handling with full error protection
    const cookieStore = await cookies();
    const token = cookieStore?.get('auth-token')?.value;
    if (token) {
      const payload = verifyToken(token);
      if (payload?.userId) {
        // Verify user still exists in DB
        const dbUser = await prisma.user.findUnique({ 
          where: { id: payload.userId }, 
          select: { id: true, email: true, role: true, name: true, isActive: true } 
        });
        if (dbUser) {
          user = { ...payload, ...dbUser };
        }
      }
    }
  } catch (err) {
    console.error('[DashboardLayout] Auth check failed:', err?.message || err);
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
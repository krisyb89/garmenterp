// src/components/Sidebar.js
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import LocaleSwitcher from './LocaleSwitcher';
import { useTranslation } from '@/i18n/I18nProvider';

const getNavItems = (t) => [
  {
    group: t('nav.overview'),
    items: [
      { href: '/dashboard', label: t('nav.dashboard'), icon: '📊' },
    ],
  },
  {
    group: t('nav.salesDev'),
    items: [
      { href: '/dashboard/customers', label: t('nav.customers'), icon: '🏢' },
      { href: '/dashboard/srs', label: t('nav.srs'), icon: '📋' },
      { href: '/dashboard/styles', label: t('nav.styles'), icon: '👔' },
      { href: '/dashboard/approvals', label: t('nav.approvals'), icon: '✅' },
      { href: '/dashboard/packages', label: t('nav.packages'), icon: '📫' },
    ],
  },
  {
    group: t('nav.orders'),
    items: [
      { href: '/dashboard/purchase-orders', label: t('nav.purchaseOrders'), icon: '📦' },
      { href: '/dashboard/costing', label: t('nav.costing'), icon: '💰' },
    ],
  },
  {
    group: t('nav.wip'),
    items: [
      { href: '/dashboard/wip/approvals', label: t('nav.wipApprovals'), icon: '🎯' },
      { href: '/dashboard/wip/srs', label: t('nav.wipSRS'), icon: '🧾' },
    ],
  },
  {
    group: t('nav.supplyChain'),
    items: [
      { href: '/dashboard/suppliers', label: t('nav.suppliers'), icon: '🏭' },
      { href: '/dashboard/materials', label: t('nav.materials'), icon: '🧶' },
      { href: '/dashboard/supplier-pos', label: t('nav.supplierPOs'), icon: '📄' },
      { href: '/dashboard/inventory', label: t('nav.inventory'), icon: '📦' },
    ],
  },
  {
    group: t('nav.production'),
    items: [
      { href: '/dashboard/factories', label: t('nav.factories'), icon: '🏗️' },
      { href: '/dashboard/production', label: t('nav.production'), icon: '⚙️' },
      { href: '/dashboard/qc', label: t('nav.qc'), icon: '🔍' },
    ],
  },
  {
    group: t('nav.shipping'),
    items: [
      { href: '/dashboard/packing-lists', label: t('nav.packingLists'), icon: '📋' },
      { href: '/dashboard/shipments', label: t('nav.shipments'), icon: '🚢' },
    ],
  },
  {
    group: t('nav.finance'),
    items: [
      { href: '/dashboard/invoices', label: t('nav.invoices'), icon: '🧾' },
      { href: '/dashboard/payments', label: t('nav.payments'), icon: '💳' },
      { href: '/dashboard/order-pnl', label: t('nav.pnl'), icon: '📈' },
      { href: '/dashboard/pnl-summary', label: t('nav.pnlSummary'), icon: '📊' },
    ],
  },
  {
    group: t('nav.admin'),
    adminOnly: true,
    items: [
      { href: '/dashboard/admin/users', label: t('nav.users'), icon: '👥' },
      { href: '/dashboard/admin/wip-columns', label: t('nav.wipColumns'), icon: '🧩' },
    ],
  },
];

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const navItems = getNavItems(t);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-full flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="OHO Global" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg text-gray-800">OHO Global</span>
        </Link>
      </div>

      {/* Locale Switcher */}
      <div className="px-4 py-2 border-b border-gray-200">
        <LocaleSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems
          .filter((g) => !g.adminOnly || user?.role === 'ADMIN')
          .map((group) => (
          <div key={group.group} className="mb-4">
            <div className="px-4 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {group.group}
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-red-600 transition-colors"
            title="Sign out"
          >
            ↗ Out
          </button>
        </div>
      </div>
    </aside>
  );
}
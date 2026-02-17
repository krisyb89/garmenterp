// src/components/Sidebar.js
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  {
    group: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    group: 'Sales & Development',
    items: [
      { href: '/dashboard/customers', label: 'Customers', icon: '🏢' },
      { href: '/dashboard/srs', label: 'SRS / Dev Requests', icon: '📋' },
      { href: '/dashboard/styles', label: 'Styles', icon: '👔' },
      { href: '/dashboard/samples', label: 'Samples', icon: '🧵' },
      { href: '/dashboard/approvals', label: 'Approvals', icon: '✅' },
    ],
  },
  {
    group: 'Orders',
    items: [
      { href: '/dashboard/purchase-orders', label: 'Purchase Orders', icon: '📦' },
      { href: '/dashboard/costing', label: 'Costing Sheets', icon: '💰' },
    ],
  },
  {
    group: 'WIP',
    items: [
      { href: '/dashboard/wip/srs', label: 'SRS WIP', icon: '🧾' },
      { href: '/dashboard/wip/pos', label: 'PO WIP', icon: '📑' },
    ],
  },
  {
    group: 'Supply Chain',
    items: [
      { href: '/dashboard/suppliers', label: 'Suppliers', icon: '🏭' },
      { href: '/dashboard/materials', label: 'Materials', icon: '🧶' },
      { href: '/dashboard/supplier-pos', label: 'Supplier POs', icon: '📄' },
      { href: '/dashboard/inventory', label: 'Inventory', icon: '📦' },
    ],
  },
  {
    group: 'Production',
    items: [
      { href: '/dashboard/factories', label: 'Factories', icon: '🏗️' },
      { href: '/dashboard/production', label: 'Production Orders', icon: '⚙️' },
      { href: '/dashboard/qc', label: 'QC / Inspection', icon: '🔍' },
    ],
  },
  {
    group: 'Shipping',
    items: [
      { href: '/dashboard/packing-lists', label: 'Packing Lists', icon: '📋' },
      { href: '/dashboard/shipments', label: 'Shipments', icon: '🚢' },
    ],
  },
  {
    group: 'Finance',
    items: [
      { href: '/dashboard/invoices', label: 'Customer Invoices', icon: '🧾' },
      { href: '/dashboard/payments', label: 'Payments / AR', icon: '💳' },
      { href: '/dashboard/order-pnl', label: 'Order P&L', icon: '📈' },
    ],
  },
];

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">📦</span>
          <span className="font-bold text-lg text-gray-800">Garment ERP</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((group) => (
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

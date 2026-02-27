// src/components/Sidebar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/i18n/I18nProvider';
import LocaleSwitcher from './LocaleSwitcher';

export default function Sidebar({ user, onClose }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    {
      group: t('nav.overview') || 'Overview',
      items: [
        { href: '/dashboard', label: t('nav.dashboard') || 'Dashboard', icon: '📊' },
      ],
    },
    {
      group: t('nav.salesDev') || 'Sales & Development',
      items: [
        { href: '/dashboard/customers', label: t('nav.customers') || 'Customers', icon: '🏢' },
        { href: '/dashboard/srs', label: t('nav.srs') || 'SRS', icon: '📋' },
        { href: '/dashboard/styles', label: t('nav.styles') || 'Styles', icon: '👔' },
        { href: '/dashboard/approvals', label: t('nav.approvals') || 'Approvals', icon: '✅' },
        { href: '/dashboard/packages', label: t('nav.packages') || 'Packages', icon: '📫' },
      ],
    },
    {
      group: t('nav.orders') || 'Orders',
      items: [
        { href: '/dashboard/purchase-orders', label: t('nav.purchaseOrders') || 'Purchase Orders', icon: '📦' },
        { href: '/dashboard/costing', label: t('nav.costing') || 'Costing Sheets', icon: '💰' },
      ],
    },
    {
      group: t('nav.wip') || 'WIP',
      items: [
        { href: '/dashboard/wip/approvals', label: t('nav.wipApprovals') || 'Approval WIP', icon: '🎯' },
        { href: '/dashboard/wip/srs', label: t('nav.wipSRS') || 'SRS WIP', icon: '🧾' },
      ],
    },
    {
      group: t('nav.supplyChain') || 'Supply Chain',
      items: [
        { href: '/dashboard/suppliers', label: t('nav.suppliers') || 'Suppliers', icon: '🏭' },
        { href: '/dashboard/materials', label: t('nav.materials') || 'Materials', icon: '🧶' },
        { href: '/dashboard/supplier-pos', label: t('nav.supplierPOs') || 'Supplier POs', icon: '📄' },
        { href: '/dashboard/inventory', label: t('nav.inventory') || 'Inventory', icon: '📦' },
      ],
    },
    {
      group: t('nav.production') || 'Production',
      items: [
        { href: '/dashboard/factories', label: t('nav.factories') || 'Factories', icon: '🏗️' },
        { href: '/dashboard/production', label: t('nav.productionOrders') || 'Production Orders', icon: '⚙️' },
        { href: '/dashboard/qc', label: t('nav.qc') || 'QC', icon: '🔍' },
      ],
    },
    {
      group: t('nav.shipping') || 'Shipping',
      items: [
        { href: '/dashboard/packing-lists', label: t('nav.packingLists') || 'Packing Lists', icon: '📋' },
        { href: '/dashboard/shipments', label: t('nav.shipments') || 'Shipments', icon: '🚢' },
      ],
    },
    {
      group: t('nav.finance') || 'Finance',
      items: [
        { href: '/dashboard/invoices', label: t('nav.invoices') || 'Invoices', icon: '🧾' },
        { href: '/dashboard/payments', label: t('nav.payments') || 'Payments', icon: '💳' },
        { href: '/dashboard/order-pnl', label: t('nav.pnl') || 'Order P&L', icon: '📈' },
        { href: '/dashboard/pnl-summary', label: t('nav.pnlSummary') || 'P&L Summary', icon: '📊' },
      ],
    },
    {
      group: t('nav.admin') || 'Admin',
      adminOnly: true,
      items: [
        { href: '/dashboard/admin/users', label: t('nav.users') || 'Users', icon: '👥' },
        { href: '/dashboard/admin/wip-columns', label: t('nav.wipColumns') || 'WIP Columns', icon: '🧩' },
      ],
    },
  ];

  const isActive = (href) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="OHO" className="w-8 h-8 object-contain bg-white rounded p-0.5" />
          <span className="font-bold text-lg">OHO Global</span>
        </Link>
        
        {/* 手机端关闭按钮 */}
        {onClose && (
          <button 
            onClick={onClose} 
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="hidden lg:block p-4 border-b border-slate-700">
        <LocaleSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {navItems.map((group, idx) => {
          if (group.adminOnly && user?.role !== 'ADMIN') return null;
          
          return (
            <div key={idx} className="mb-6">
              <h3 className="text-xs uppercase text-slate-400 font-semibold mb-2 px-2">
                {group.group}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-2 px-2 py-2 rounded transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default function DashboardShell({ user, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 手机端遮罩层 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      
      {/* 侧边栏 */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 主内容 */}
      <main className="flex-1 overflow-y-auto w-full bg-gray-50">
        {/* 手机端顶部导航栏 */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="text-gray-600 hover:text-gray-900 p-1 -ml-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="OHO" className="w-6 h-6 object-contain" />
              <span className="font-bold text-gray-800">OHO Global</span>
            </Link>
          </div>
          <LocaleSwitcher />
        </div>
        
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

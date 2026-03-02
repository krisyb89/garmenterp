// src/app/(dashboard)/dashboard/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import StatCard from '@/components/StatCard';
import ListWidget from '@/components/ListWidget';
import DashboardCustomizer from '@/components/DashboardCustomizer';
import {
  KPI_WIDGETS,
  LIST_WIDGETS,
  loadDashboardConfig,
  saveDashboardConfig,
  resetDashboardConfig,
  buildWidgetsQuery,
  getDefaultLayout,
} from '@/lib/dashboard-widgets';

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// Settings icon
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('ADMIN');
  const [config, setConfig] = useState(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Load user and config on mount
  useEffect(() => {
    // Get user role from API
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(({ user }) => {
        if (user?.role) {
          setUserRole(user.role);
          // Load config after we know the role
          const savedConfig = loadDashboardConfig(user.role);
          setConfig(savedConfig);
        } else {
          const defaultConfig = getDefaultLayout('ADMIN');
          setConfig(defaultConfig);
        }
        setConfigLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load user:', err);
        const defaultConfig = getDefaultLayout('ADMIN');
        setConfig(defaultConfig);
        setConfigLoaded(true);
      });
  }, []);

  // Fetch dashboard data when config changes
  const fetchData = useCallback(async () => {
    if (!config) return;
    
    setLoading(true);
    try {
      const widgetsQuery = buildWidgetsQuery(config);
      const url = `/api/dashboard?widgets=${encodeURIComponent(widgetsQuery)}`;
      
      const response = await fetch(url);
      const json = await response.json();
      
      if (!response.ok) {
        throw new Error(json.error || 'Failed to load dashboard');
      }
      
      setData(json);
      setError(null);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config]);

  // Fetch data when config is loaded or changes
  useEffect(() => {
    if (configLoaded && config) {
      fetchData();
    }
  }, [config, configLoaded, fetchData]);

  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    saveDashboardConfig(newConfig);
  };

  const handleResetConfig = () => {
    const defaultConfig = resetDashboardConfig(userRole);
    setConfig(defaultConfig);
  };

  if (!configLoaded || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-red-500 mb-4">Failed to load dashboard: {error}</div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div>
      {/* Header with Customize button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => setIsCustomizerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <SettingsIcon />
          Customize
        </button>
      </div>

      {/* KPI Cards */}
      {config.kpi.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {loading ? (
            // Loading skeletons
            Array.from({ length: config.kpi.length }).map((_, i) => (
              <div key={i} className="card p-4">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))
          ) : (
            // Render enabled KPI widgets in order
            config.kpi.map((widgetId) => {
              const widget = KPI_WIDGETS[widgetId];
              if (!widget) return null;
              
              return (
                <StatCard
                  key={widgetId}
                  title={widget.title}
                  value={stats[widgetId] ?? 0}
                  subtitle={widget.subtitle}
                  icon={widget.icon}
                  color={widget.color}
                />
              );
            })
          )}
        </div>
      )}

      {/* List Widgets */}
      {config.list.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {config.list.map((widgetId) => {
            const widget = LIST_WIDGETS[widgetId];
            if (!widget) return null;
            
            return (
              <ListWidget
                key={widgetId}
                widgetId={widgetId}
                title={widget.title}
                viewAllLink={widget.viewAllLink}
                data={data?.[widgetId] || []}
                loading={loading}
                emptyMessage={`No ${widget.title.toLowerCase()} yet`}
              />
            );
          })}
        </div>
      )}

      {/* Empty state if no widgets enabled */}
      {config.kpi.length === 0 && config.list.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-xl">
          <p className="text-gray-500 mb-4">No widgets enabled</p>
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Customize Dashboard
          </button>
        </div>
      )}

      {/* Dashboard Customizer Drawer */}
      <DashboardCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={config}
        onSave={handleSaveConfig}
        onReset={handleResetConfig}
      />
    </div>
  );
}


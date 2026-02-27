// src/components/DashboardCustomizer.js
'use client';

import { useState, useEffect } from 'react';
import { ALL_WIDGETS, KPI_WIDGETS, LIST_WIDGETS } from '@/lib/dashboard-widgets';

// Icons as simple SVG components
const DragHandleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
    <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// Sortable widget item component
function SortableWidgetItem({ 
  widget, 
  isEnabled, 
  onToggle, 
  onMoveUp, 
  onMoveDown, 
  isFirst, 
  isLast,
  isKpi 
}) {
  const widgetConfig = ALL_WIDGETS[widget.id];
  
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isEnabled 
          ? 'bg-white border-gray-200 shadow-sm' 
          : 'bg-gray-50 border-gray-100 opacity-60'
      }`}
    >
      <div className="cursor-grab text-gray-400 hover:text-gray-600">
        <DragHandleIcon />
      </div>
      
      <label className="flex items-center gap-3 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => onToggle(widget.id, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div className="flex items-center gap-2">
          {isKpi && widgetConfig?.icon && (
            <span className="text-lg">{widgetConfig.icon}</span>
          )}
          <div>
            <p className="font-medium text-sm text-gray-900">{widgetConfig?.title || widget.id}</p>
            {widgetConfig?.description && (
              <p className="text-xs text-gray-500">{widgetConfig.description}</p>
            )}
          </div>
        </div>
      </label>
      
      {isEnabled && (
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
            title="Move up"
          >
            <ChevronUpIcon />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
            title="Move down"
          >
            <ChevronDownIcon />
          </button>
        </div>
      )}
    </div>
  );
}

// Main DashboardCustomizer component
export default function DashboardCustomizer({ 
  isOpen, 
  onClose, 
  config, 
  onSave,
  onReset 
}) {
  const [localConfig, setLocalConfig] = useState(config);
  const [activeTab, setActiveTab] = useState('kpi');

  // Update local config when prop changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleToggle = (widgetId, enabled) => {
    setLocalConfig(prev => {
      const isKpi = widgetId in KPI_WIDGETS;
      const key = isKpi ? 'kpi' : 'list';
      
      if (enabled) {
        // Add to list if not already there
        if (!prev[key].includes(widgetId)) {
          return { ...prev, [key]: [...prev[key], widgetId] };
        }
      } else {
        // Remove from list
        return { ...prev, [key]: prev[key].filter(id => id !== widgetId) };
      }
      return prev;
    });
  };

  const handleMove = (widgetId, direction) => {
    const isKpi = widgetId in KPI_WIDGETS;
    const key = isKpi ? 'kpi' : 'list';
    
    setLocalConfig(prev => {
      const list = [...prev[key]];
      const index = list.indexOf(widgetId);
      if (index === -1) return prev;
      
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= list.length) return prev;
      
      // Swap items
      [list[index], list[newIndex]] = [list[newIndex], list[index]];
      
      return { ...prev, [key]: list };
    });
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Reset to default layout? This will clear your customizations.')) {
      onReset();
      onClose();
    }
  };

  // Get ordered list of all KPI widgets with enabled status
  const kpiWidgets = Object.keys(KPI_WIDGETS).map(id => ({
    id,
    order: localConfig.kpi.indexOf(id),
    enabled: localConfig.kpi.includes(id)
  })).sort((a, b) => {
    // Enabled items first, then by order
    if (a.enabled && !b.enabled) return -1;
    if (!a.enabled && b.enabled) return 1;
    return a.order - b.order;
  });

  // Get ordered list of all list widgets with enabled status
  const listWidgets = Object.keys(LIST_WIDGETS).map(id => ({
    id,
    order: localConfig.list.indexOf(id),
    enabled: localConfig.list.includes(id)
  })).sort((a, b) => {
    if (a.enabled && !b.enabled) return -1;
    if (!a.enabled && b.enabled) return 1;
    return a.order - b.order;
  });

  const enabledKpiCount = localConfig.kpi.length;
  const enabledListCount = localConfig.list.length;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <SettingsIcon />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Customize Dashboard</h2>
              <p className="text-xs text-gray-500">
                {enabledKpiCount} KPIs, {enabledListCount} lists enabled
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('kpi')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'kpi' 
                ? 'text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            KPI Widgets
            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {enabledKpiCount}
            </span>
            {activeTab === 'kpi' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'list' 
                ? 'text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            List Widgets
            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {enabledListCount}
            </span>
            {activeTab === 'list' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {activeTab === 'kpi' ? (
              kpiWidgets.map((widget, index) => (
                <SortableWidgetItem
                  key={widget.id}
                  widget={widget}
                  isEnabled={widget.enabled}
                  onToggle={handleToggle}
                  onMoveUp={() => handleMove(widget.id, -1)}
                  onMoveDown={() => handleMove(widget.id, 1)}
                  isFirst={index === 0 || !widget.enabled}
                  isLast={index === kpiWidgets.length - 1 || !widget.enabled}
                  isKpi={true}
                />
              ))
            ) : (
              listWidgets.map((widget, index) => (
                <SortableWidgetItem
                  key={widget.id}
                  widget={widget}
                  isEnabled={widget.enabled}
                  onToggle={handleToggle}
                  onMoveUp={() => handleMove(widget.id, -1)}
                  onMoveDown={() => handleMove(widget.id, 1)}
                  isFirst={index === 0 || !widget.enabled}
                  isLast={index === listWidgets.length - 1 || !widget.enabled}
                  isKpi={false}
                />
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 space-y-2">
          <button
            onClick={handleSave}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={handleReset}
            className="w-full py-2.5 px-4 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </>
  );
}


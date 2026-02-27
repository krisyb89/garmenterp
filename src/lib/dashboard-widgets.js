// src/lib/dashboard-widgets.js
// Dashboard widget configuration and localStorage utilities

// KPI Widgets configuration
export const KPI_WIDGETS = {
  customerCount: {
    id: 'customerCount',
    type: 'kpi',
    title: 'Active Customers',
    icon: '🏢',
    color: 'blue',
    description: 'Total number of active customers',
  },
  activeSRS: {
    id: 'activeSRS',
    type: 'kpi',
    title: 'Active SRS',
    icon: '📋',
    color: 'purple',
    subtitle: 'In pipeline',
    description: 'SRS requests in active pipeline',
  },
  activePOs: {
    id: 'activePOs',
    type: 'kpi',
    title: 'Active POs',
    icon: '📦',
    color: 'green',
    subtitle: 'Open orders',
    description: 'Active purchase orders',
  },
  inProductionCount: {
    id: 'inProductionCount',
    type: 'kpi',
    title: 'In Production',
    icon: '⚙️',
    color: 'yellow',
    description: 'Orders currently in production',
  },
  pendingApprovals: {
    id: 'pendingApprovals',
    type: 'kpi',
    title: 'Pending Approvals',
    icon: '✅',
    color: 'red',
    subtitle: 'Need attention',
    description: 'WIP cells pending approval',
  },
  pendingShipments: {
    id: 'pendingShipments',
    type: 'kpi',
    title: 'Active Shipments',
    icon: '🚢',
    color: 'blue',
    description: 'Shipments in progress',
  },
  overdueInvoices: {
    id: 'overdueInvoices',
    type: 'kpi',
    title: 'Overdue Invoices',
    icon: '⚠️',
    color: 'red',
    description: 'Overdue customer invoices',
  },
};

// List Widgets configuration
export const LIST_WIDGETS = {
  recentPOs: {
    id: 'recentPOs',
    type: 'list',
    title: 'Recent Purchase Orders',
    viewAllLink: '/dashboard/purchase-orders',
    description: 'Latest purchase orders',
  },
  recentSRS: {
    id: 'recentSRS',
    type: 'list',
    title: 'Recent Development Requests',
    viewAllLink: '/dashboard/srs',
    description: 'Latest SRS requests',
  },
  pendingWIP: {
    id: 'pendingWIP',
    type: 'list',
    title: 'Pending WIP Approvals',
    viewAllLink: '/dashboard/wip',
    description: 'WIP cells awaiting approval',
  },
  activeProduction: {
    id: 'activeProduction',
    type: 'list',
    title: 'Active Production Orders',
    viewAllLink: '/dashboard/production-orders',
    description: 'Production orders in progress',
  },
  recentShipments: {
    id: 'recentShipments',
    type: 'list',
    title: 'Recent Shipments',
    viewAllLink: '/dashboard/shipments',
    description: 'Latest shipment records',
  },
};

// All widgets combined
export const ALL_WIDGETS = { ...KPI_WIDGETS, ...LIST_WIDGETS };

// Role-based default layouts
export const ROLE_DEFAULTS = {
  ADMIN: {
    kpi: ['customerCount', 'activeSRS', 'activePOs', 'inProductionCount', 'pendingApprovals', 'pendingShipments', 'overdueInvoices'],
    list: ['recentPOs', 'recentSRS'],
  },
  SALES: {
    kpi: ['customerCount', 'activeSRS', 'activePOs', 'pendingShipments'],
    list: ['recentPOs', 'recentSRS'],
  },
  PRODUCTION: {
    kpi: ['inProductionCount', 'pendingApprovals', 'activePOs'],
    list: ['activeProduction', 'pendingWIP'],
  },
  MERCHANDISER: {
    kpi: ['activePOs', 'pendingShipments', 'overdueInvoices', 'activeSRS'],
    list: ['recentPOs', 'recentShipments'],
  },
  WAREHOUSE: {
    kpi: ['pendingShipments', 'activePOs'],
    list: ['recentShipments'],
  },
  ACCOUNTING: {
    kpi: ['overdueInvoices', 'activePOs', 'customerCount'],
    list: ['recentPOs'],
  },
};

// Get default layout for a role
export function getDefaultLayout(role) {
  const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.ADMIN;
  return {
    kpi: [...defaults.kpi],
    list: [...defaults.list],
  };
}

// localStorage key for dashboard config
const STORAGE_KEY = 'dashboard_config';

// Load dashboard config from localStorage
export function loadDashboardConfig(role) {
  if (typeof window === 'undefined') {
    return getDefaultLayout(role);
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      // Validate that stored config has required properties
      if (config.kpi && config.list && Array.isArray(config.kpi) && Array.isArray(config.list)) {
        return config;
      }
    }
  } catch (error) {
    console.error('Failed to load dashboard config:', error);
  }
  
  return getDefaultLayout(role);
}

// Save dashboard config to localStorage
export function saveDashboardConfig(config) {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save dashboard config:', error);
  }
}

// Reset dashboard config to defaults
export function resetDashboardConfig(role) {
  if (typeof window === 'undefined') {
    return getDefaultLayout(role);
  }
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset dashboard config:', error);
  }
  
  return getDefaultLayout(role);
}

// Build widgets query string for API
export function buildWidgetsQuery(config) {
  const allWidgets = [...config.kpi, ...config.list];
  return allWidgets.join(',');
}

// Parse widgets from query string
export function parseWidgetsQuery(query) {
  if (!query) return null;
  return query.split(',').filter(Boolean);
}

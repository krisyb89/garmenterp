// src/lib/audit.js
// Phase 0: Audit Logging Utility
// Tracks all create/update/delete actions for compliance

import prisma from './prisma';

/**
 * Log an activity to the audit trail
 *
 * @param {Object} params
 * @param {string} params.userId - User performing the action
 * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, STATUS_CHANGE)
 * @param {string} params.entity - Entity type (PO, Approval, Style, etc.)
 * @param {string} params.entityId - ID of the entity
 * @param {Object} params.beforeData - State before change (for UPDATE)
 * @param {Object} params.afterData - State after change
 * @param {Object} params.details - Additional context
 * @param {string} params.ipAddress - Request IP
 * @param {string} params.userAgent - User agent string
 * @returns {Promise<Object>} Created activity log entry
 */
export async function logActivity({
  userId,
  action,
  entity,
  entityId,
  beforeData = null,
  afterData = null,
  details = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const log = await prisma.activityLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        beforeData: beforeData ? JSON.parse(JSON.stringify(beforeData)) : null,
        afterData: afterData ? JSON.parse(JSON.stringify(afterData)) : null,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
        ipAddress,
        userAgent,
      },
    });

    return log;
  } catch (error) {
    // Don't fail the request if audit logging fails - just log to console
    console.error('Failed to log activity:', error);
    return null;
  }
}

/**
 * Helper to log PO changes
 */
export async function logPOChange(user, action, poId, beforePO, afterPO, request = null) {
  return await logActivity({
    userId: user.id,
    action,
    entity: 'PO',
    entityId: poId,
    beforeData: beforePO,
    afterData: afterPO,
    details: {
      poNo: afterPO?.poNo || beforePO?.poNo,
      action,
    },
    ipAddress: request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip'),
    userAgent: request?.headers?.get('user-agent'),
  });
}

/**
 * Helper to log approval changes
 */
export async function logApprovalChange(user, action, approvalId, beforeApproval, afterApproval, request = null) {
  return await logActivity({
    userId: user.id,
    action,
    entity: 'Approval',
    entityId: approvalId,
    beforeData: beforeApproval,
    afterData: afterApproval,
    details: {
      type: afterApproval?.type || beforeApproval?.type,
      status: afterApproval?.status || beforeApproval?.status,
      styleId: afterApproval?.styleId || beforeApproval?.styleId,
    },
    ipAddress: request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip'),
    userAgent: request?.headers?.get('user-agent'),
  });
}

/**
 * Get audit trail for an entity
 */
export async function getAuditTrail(entity, entityId, limit = 50) {
  return await prisma.activityLog.findMany({
    where: {
      entity,
      entityId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Get recent activity for a user
 */
export async function getUserActivity(userId, limit = 100) {
  return await prisma.activityLog.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Get all recent activity (admin only)
 */
export async function getAllActivity(filters = {}, limit = 100) {
  const where = {};

  if (filters.entity) {
    where.entity = filters.entity;
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.startDate) {
    where.createdAt = {
      ...where.createdAt,
      gte: new Date(filters.startDate),
    };
  }

  if (filters.endDate) {
    where.createdAt = {
      ...where.createdAt,
      lte: new Date(filters.endDate),
    };
  }

  return await prisma.activityLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Calculate diff between before and after states
 * Returns an object showing what changed
 */
export function calculateDiff(before, after) {
  if (!before || !after) return null;

  const changes = {};
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    const beforeVal = before[key];
    const afterVal = after[key];

    // Skip complex objects and functions
    if (typeof beforeVal === 'object' && beforeVal !== null) continue;
    if (typeof afterVal === 'object' && afterVal !== null) continue;

    // Skip dates (they're complex)
    if (beforeVal instanceof Date || afterVal instanceof Date) continue;

    if (beforeVal !== afterVal) {
      changes[key] = {
        from: beforeVal,
        to: afterVal,
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Audit wrapper for API mutations
 * Usage:
 *
 * const result = await auditedMutation({
 *   user,
 *   action: 'UPDATE',
 *   entity: 'PO',
 *   entityId: po.id,
 *   beforeFetch: () => prisma.purchaseOrder.findUnique({ where: { id: poId } }),
 *   mutation: () => prisma.purchaseOrder.update({ where: { id: poId }, data: updates }),
 *   request,
 * });
 */
export async function auditedMutation({
  user,
  action,
  entity,
  entityId,
  beforeFetch,
  mutation,
  request = null,
}) {
  let before = null;
  let after = null;

  try {
    // Fetch before state if this is an update
    if (action === 'UPDATE' && beforeFetch) {
      before = await beforeFetch();
    }

    // Perform the mutation
    after = await mutation();

    // Log the activity
    await logActivity({
      userId: user.id,
      action,
      entity,
      entityId: entityId || after?.id,
      beforeData: before,
      afterData: after,
      details: {
        changes: action === 'UPDATE' ? calculateDiff(before, after) : null,
      },
      ipAddress: request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip'),
      userAgent: request?.headers?.get('user-agent'),
    });

    return after;
  } catch (error) {
    // If mutation fails, log the attempt
    await logActivity({
      userId: user.id,
      action: `${action}_FAILED`,
      entity,
      entityId,
      details: {
        error: error.message,
      },
      ipAddress: request?.headers?.get('x-forwarded-for'),
      userAgent: request?.headers?.get('user-agent'),
    });

    throw error;
  }
}

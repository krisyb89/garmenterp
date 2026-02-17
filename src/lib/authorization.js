// src/lib/authorization.js
// Phase 0: MVP Authorization System
// Simple role-based + ownership checks

import prisma from './prisma';

/**
 * Check if user can perform an action on a resource
 *
 * Phase 0 Rules:
 * - ADMIN: Can do anything
 * - Others: Can only edit resources they created (if in DRAFT status)
 *
 * @param {Object} user - Current user from getCurrentUser()
 * @param {string} action - Action to perform (create, read, update, delete)
 * @param {string} resourceType - Resource type (PO, Approval, etc.)
 * @param {Object} resource - The actual resource (optional, needed for update/delete)
 * @returns {Object} { allowed: boolean, reason?: string }
 */
export async function authorize(user, action, resourceType, resource = null) {
  // Not authenticated
  if (!user) {
    return { allowed: false, reason: 'Not authenticated' };
  }

  // Inactive users cannot do anything
  if (!user.isActive) {
    return { allowed: false, reason: 'User account is inactive' };
  }

  // ADMIN can do anything
  if (user.role === 'ADMIN') {
    return { allowed: true };
  }

  // Handle different resource types
  switch (resourceType) {
    case 'PO':
      return authorizePO(user, action, resource);

    case 'Approval':
      return authorizeApproval(user, action, resource);

    case 'Style':
      return authorizeStyle(user, action, resource);

    case 'User':
      // Only admins can manage users
      return { allowed: false, reason: 'Only admins can manage users' };

    default:
      // For now, allow all other actions (we'll add more checks in Phase 1)
      return { allowed: true };
  }
}

/**
 * Check PO permissions
 * Rules:
 * - Create: Anyone can create
 * - Read: Anyone can read
 * - Update: Only creator (if DRAFT status) or ADMIN
 * - Delete: Only ADMIN
 */
async function authorizePO(user, action, po) {
  switch (action) {
    case 'create':
      // Anyone can create POs
      return { allowed: true };

    case 'read':
      // Anyone can read POs (Phase 0 - we'll add scope in Phase 1)
      return { allowed: true };

    case 'update':
      if (!po) {
        return { allowed: false, reason: 'PO not provided' };
      }

      // Can only edit if you created it and it's still in DRAFT
      if (po.createdByUserId === user.id && po.status === 'DRAFT') {
        return { allowed: true };
      }

      // Show warning for confirmed POs
      if (po.status !== 'DRAFT') {
        return {
          allowed: false,
          reason: 'PO is already confirmed. Contact admin to make changes.',
          warning: true  // Flag to show as warning instead of error
        };
      }

      return {
        allowed: false,
        reason: 'You can only edit POs you created'
      };

    case 'delete':
      // Only admin can delete (soft delete)
      return {
        allowed: false,
        reason: 'Only admins can delete POs'
      };

    default:
      return { allowed: false, reason: `Unknown action: ${action}` };
  }
}

/**
 * Check Approval permissions
 * Rules:
 * - Create: Can create approval for POs you have access to
 * - Read: Can read any approval
 * - Update: Can update your own approvals (within 30 min) or ADMIN
 * - Delete: Only ADMIN
 */
async function authorizeApproval(user, action, approval) {
  switch (action) {
    case 'create':
      // Anyone can create approvals (scoped to PO in Phase 1)
      return { allowed: true };

    case 'read':
      // Anyone can read approvals
      return { allowed: true };

    case 'update':
      if (!approval) {
        return { allowed: false, reason: 'Approval not provided' };
      }

      // Check if it's within edit window (30 minutes)
      const createdAt = new Date(approval.createdAt);
      const now = new Date();
      const diffMinutes = (now - createdAt) / 1000 / 60;

      if (diffMinutes <= 30) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: 'Approval edit window expired (30 minutes). Contact admin to override.',
        warning: true
      };

    case 'delete':
      return {
        allowed: false,
        reason: 'Only admins can delete approvals'
      };

    default:
      return { allowed: false, reason: `Unknown action: ${action}` };
  }
}

/**
 * Check Style permissions
 * Rules:
 * - Create/Update: MERCHANDISER and above
 * - Read: Anyone
 * - Delete: Only ADMIN
 */
async function authorizeStyle(user, action, style) {
  switch (action) {
    case 'create':
    case 'update':
      // Merchandisers can create/edit styles
      const canEditRoles = ['ADMIN', 'MERCHANDISER', 'MANAGEMENT'];
      if (canEditRoles.includes(user.role)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Only merchandisers can create/edit styles'
      };

    case 'read':
      return { allowed: true };

    case 'delete':
      return {
        allowed: false,
        reason: 'Only admins can delete styles'
      };

    default:
      return { allowed: false, reason: `Unknown action: ${action}` };
  }
}

/**
 * Helper to get PO with creator info (for authorization checks)
 */
export async function getPOForAuth(poId) {
  return await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: {
      id: true,
      poNo: true,
      status: true,
      createdByUserId: true,
      createdAt: true,
    },
  });
}

/**
 * Helper to get Approval with creator info
 */
export async function getApprovalForAuth(approvalId) {
  return await prisma.approvalRecord.findUnique({
    where: { id: approvalId },
    select: {
      id: true,
      createdAt: true,
      styleId: true,
      poLineItemId: true,
    },
  });
}

/**
 * Express/Next.js middleware wrapper
 * Usage in API route:
 *
 * const authCheck = await checkPermission(user, 'update', 'PO', po);
 * if (!authCheck.allowed) {
 *   return NextResponse.json({ error: authCheck.reason }, {
 *     status: authCheck.warning ? 403 : 401
 *   });
 * }
 */
export async function checkPermission(user, action, resourceType, resource) {
  return await authorize(user, action, resourceType, resource);
}

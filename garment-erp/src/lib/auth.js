// src/lib/auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

// Lazy getter — only throws when auth is actually used, not during next build
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET. Set it in Replit Secrets (lock icon).');
  }
  return secret;
}

const TOKEN_EXPIRY = '7d';

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, name: user.name },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ============================================================
// RBAC — Role Groups
// ============================================================

// Role groups for route-level access control.
// Keep the granular UserRole enum in Prisma; group them here for guard logic.
export const ROLE_GROUPS = {
  // Full access
  ADMIN: ['ADMIN'],
  // Finance-sensitive: invoicing, payments, costing, P&L
  FINANCE: ['ADMIN', 'FINANCE', 'MANAGEMENT'],
  // Operational: merchandising, production, sourcing, shipping
  OPS: ['ADMIN', 'MERCHANDISER', 'PRODUCTION_MANAGER', 'SOURCING_BUYER', 'QC_MANAGER', 'WAREHOUSE', 'SHIPPING', 'MANAGEMENT'],
  // Read-only for dashboards / reports
  ALL: ['ADMIN', 'MERCHANDISER', 'PRODUCTION_MANAGER', 'SOURCING_BUYER', 'QC_MANAGER', 'FINANCE', 'WAREHOUSE', 'SHIPPING', 'MANAGEMENT'],
};

/**
 * Guard: require authenticated user.
 * Returns { user } or a NextResponse error.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    const { NextResponse } = await import('next/server');
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user };
}

/**
 * Guard: require authenticated user with one of the allowed roles.
 * @param {string[]} allowedRoles - flat array of role strings, or use ROLE_GROUPS.
 */
export async function requireRole(...allowedRoles) {
  const { user, error } = await requireAuth();
  if (error) return { error };
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const { NextResponse } = await import('next/server');
    return { error: NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 }) };
  }
  return { user };
}

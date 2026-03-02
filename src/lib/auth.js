// src/lib/auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'garment-erp-secret-change-me';
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
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch (e) {
    console.error('[getCurrentUser] cookies() failed:', e?.message || e);
    return null;
  }
  const token = cookieStore?.get('auth-token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const { default: prisma } = await import('@/lib/prisma');
    const dbUser = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, isActive: true } });
    if (!dbUser) return null;
    return { ...payload, isActive: dbUser.isActive };
  } catch (err) {
    // Database unreachable (Neon cold start, connection timeout, etc.)
    // Return token payload so the app doesn't crash — user is still authenticated via JWT
    console.error('[getCurrentUser] DB error (using JWT payload):', err?.message || err);
    return { ...payload, isActive: true, _dbFallback: true };
  }
}

export function requireRole(...roles) {
  return async function (req) {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
      return { error: 'Forbidden', status: 403 };
    }
    return { user };
  };
}

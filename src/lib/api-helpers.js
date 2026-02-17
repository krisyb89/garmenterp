// src/lib/api-helpers.js
import { NextResponse } from 'next/server';
import { getCurrentUser } from './auth';

export function jsonResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(handler, allowedRoles = []) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return errorResponse('Forbidden', 403);
  }
  return handler(user);
}

// Generate sequential numbers like SRS-2025-0001
export function generateSequentialNo(prefix, count) {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

// Parse pagination params
export function parsePagination(searchParams) {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Format currency
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

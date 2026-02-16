// src/app/api/auth/logout/route.js — PUBLIC ROUTE (no auth required)
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
  return response;
}

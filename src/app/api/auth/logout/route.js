// src/app/api/auth/logout/route.js
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
    return response;

  } catch (error) {
    console.error('[logout:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

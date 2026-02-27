import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const response = NextResponse.json({ success: true });
    
    // 修复 Cookie Secure 标志 - 根据实际请求协议决定
    const isSecure = request.headers.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
    
    response.cookies.set('auth-token', '', { 
      maxAge: 0, 
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
    });
    return response;

  } catch (error) {
    console.error('[logout:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

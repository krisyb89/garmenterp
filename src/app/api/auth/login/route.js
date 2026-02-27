import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';

// 简单的内存限流存储
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15分钟
const RATE_LIMIT_MAX = 5; // 每个IP最多5次尝试

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimit.get(ip);
  
  if (!record) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
}

export async function POST(request) {
  try {
    // 获取客户端IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    // 检查限流
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user);

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

    // 修复 Cookie Secure 标志 - 根据实际请求协议决定
    const isSecure = request.headers.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

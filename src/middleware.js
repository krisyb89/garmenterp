import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

// 受保护的路由路径
const PROTECTED_ROUTES = [
  '/dashboard',
  '/api/protected',
];

// 公开路径（不需要认证）
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 检查是否是公开路径
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 检查是否是受保护路由
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // 获取 token
  const token = request.cookies.get('auth-token')?.value;

  // 如果没有 token，重定向到登录页
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 验证 token
  const payload = verifyToken(token);
  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

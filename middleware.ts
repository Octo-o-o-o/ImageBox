import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 公开路径（无需认证）
const PUBLIC_PATHS = [
  '/auth/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/vercel.svg',
  '/window.svg',
];

// 仅限本地访问的路径
const LOCAL_ONLY_PATHS = [
  '/settings',
  '/api/settings',
];

/**
 * 判断是否为本地请求
 */
function isLocalRequest(request: NextRequest): boolean {
  const host = request.headers.get('host') || '';
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  // 检查 host
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')) {
    return true;
  }
  
  // 如果没有代理头，可能是直接本地访问
  if (!forwardedFor && !realIp) {
    // 检查 host 是否为本地 IP 范围
    const hostWithoutPort = host.split(':')[0];
    if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1' || hostWithoutPort === '::1') {
      return true;
    }
  }
  
  // 检查代理头（如果存在代理）
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || '';
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
    return true;
  }
  
  return false;
}

/**
 * 判断路径是否为公开路径
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

/**
 * 判断路径是否仅限本地访问
 */
function isLocalOnlyPath(pathname: string): boolean {
  return LOCAL_ONLY_PATHS.some(p => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLocal = isLocalRequest(request);
  
  // 静态资源和公开路径直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  
  // 本地请求直接放行
  if (isLocal) {
    return NextResponse.next();
  }
  
  // 远程请求访问仅限本地的路径 -> 403
  if (isLocalOnlyPath(pathname)) {
    return new NextResponse('Forbidden: This page is only accessible locally', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // 远程请求需要验证
  // 1. 检查远程访问开关（通过 API 获取，因为中间件不能直接访问数据库）
  // 2. 检查授权码
  
  // 获取授权码（从 Cookie 或 Header）
  const tokenFromCookie = request.cookies.get('access_token')?.value;
  const tokenFromHeader = request.headers.get('x-access-token');
  const token = tokenFromCookie || tokenFromHeader;
  
  // 如果没有 token，重定向到登录页
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // 验证 token（通过内部 API）
  try {
    const validateUrl = new URL('/api/auth/validate', request.url);
    const validateResponse = await fetch(validateUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    if (!validateResponse.ok) {
      // Token 无效，重定向到登录页
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('error', 'invalid_token');
      
      // 清除无效的 Cookie
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('access_token');
      return response;
    }
    
    // Token 有效，放行
    return NextResponse.next();
  } catch (error) {
    // 验证失败，重定向到登录页
    console.error('Token validation error:', error);
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|generated/).*)',
  ],
};


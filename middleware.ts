import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// 指定使用 Node.js runtime 而非 Edge runtime
// Prisma 需要 Node.js 的 fs 模块
export const runtime = 'nodejs';

// 公开路径（无需认证）
const PUBLIC_PATHS = [
  '/auth/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/status',
  '/api/auth/validate',
  '/_next',
  '/favicon.ico',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/vercel.svg',
  '/window.svg',
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
 * 获取系统配置状态（直接查询数据库）
 */
async function getAuthStatus() {
  try {
    const [tokenCount, setting] = await Promise.all([
      prisma.accessToken.count(),
      prisma.setting.findUnique({ where: { key: 'remoteAccessEnabled' } })
    ]);
    
    return {
      isConfigured: tokenCount > 0,
      remoteAccessEnabled: setting?.value === 'true'
    };
  } catch (error) {
    console.error('Failed to get auth status:', error);
    // 出错时采用保守策略
    return { isConfigured: true, remoteAccessEnabled: false };
  }
}

/**
 * 验证 token（直接查询数据库）
 */
async function validateToken(token: string): Promise<boolean> {
  try {
    const accessToken = await prisma.accessToken.findUnique({
      where: { token }
    });
    
    if (!accessToken) return false;
    if (accessToken.isRevoked) return false;
    if (accessToken.expiresAt < new Date()) return false;
    
    // 更新最后使用时间（异步，不阻塞）
    prisma.accessToken.update({
      where: { id: accessToken.id },
      data: { lastUsedAt: new Date() }
    }).catch(() => {});
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
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
  
  // === 远程请求处理 ===
  
  // 获取系统配置状态（直接查询数据库，避免 Docker 网络问题）
  const { isConfigured, remoteAccessEnabled } = await getAuthStatus();
  
  // 情况1: 系统未配置（无任何授权码）-> 允许访问，但强制跳转到设置页
  if (!isConfigured) {
    // 如果已经在设置页或设置相关API，直接放行
    if (pathname.startsWith('/settings') || pathname.startsWith('/api/')) {
      return NextResponse.next();
    }
    
    // 其他页面重定向到设置页进行初始配置
    const setupUrl = new URL('/settings', request.url);
    setupUrl.searchParams.set('setup', 'true');
    return NextResponse.redirect(setupUrl);
  }
  
  // 情况2: 系统已配置，但远程访问开关关闭 -> 拒绝
  if (!remoteAccessEnabled) {
    return new NextResponse('Remote access is disabled. Please enable it from the local machine first.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // 情况3: 系统已配置且远程访问开启 -> 验证授权码
  const tokenFromCookie = request.cookies.get('access_token')?.value;
  const tokenFromHeader = request.headers.get('x-access-token');
  const token = tokenFromCookie || tokenFromHeader;
  
  // 如果没有 token，重定向到登录页
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // 验证 token（直接查询数据库）
  const isValid = await validateToken(token);
  
  if (!isValid) {
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

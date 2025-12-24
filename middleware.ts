import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
 * 获取系统配置状态（通过 API，避免 middleware 环境引入 Prisma/Node 依赖）
 */
async function getAuthStatus(request: NextRequest) {
  try {
    const url = new URL('/api/auth/status', request.url);
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        // 透传 cookie，避免未来扩展鉴权时丢失上下文
        cookie: request.headers.get('cookie') || ''
      }
    });

    if (!res.ok) throw new Error(`status api failed: ${res.status}`);
    const json = await res.json();

    return {
      isConfigured: Boolean(json?.isConfigured),
      remoteAccessEnabled: Boolean(json?.remoteAccessEnabled)
    };
  } catch (error) {
    console.error('Failed to get auth status:', error);
    // 出错时采用保守策略
    return { isConfigured: true, remoteAccessEnabled: false };
  }
}

/**
 * 验证 token（通过 API，避免 middleware 环境引入 Prisma/Node 依赖）
 */
async function validateToken(request: NextRequest, token: string): Promise<boolean> {
  try {
    const url = new URL('/api/auth/validate', request.url);
    const res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        cookie: request.headers.get('cookie') || ''
      },
      body: JSON.stringify({ token })
    });

    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json?.valid);
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLocal = isLocalRequest(request);
  // 通过 Electron 启动的 Next.js 服务器会注入 USER_DATA_PATH
  // 用于区分“桌面版（更强调本机安全）”与“Web/Docker（更强调远程部署）”
  const isDesktopServer = typeof process !== 'undefined' && !!process.env.USER_DATA_PATH;
  
  // 桌面应用模式：通过自定义 header 识别 Electron 请求，跳过所有认证
  if (request.headers.get('x-electron-app') === 'true') {
    return NextResponse.next();
  }
  
  // 静态资源和公开路径直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  
  // 本地请求直接放行
  if (isLocal) {
    return NextResponse.next();
  }
  
  // === 远程请求处理 ===
  
  // 获取系统配置状态（通过 API）
  const { isConfigured, remoteAccessEnabled } = await getAuthStatus(request);
  
  // 情况1: 系统未配置（无任何授权码）-> 允许访问，但强制跳转到设置页
  if (!isConfigured) {
    // 桌面版：首次配置必须在本机完成，避免局域网里“未初始化即被接管”
    if (isDesktopServer) {
      return new NextResponse('This desktop app must be configured locally first. Please open Settings on the host machine to create an access token.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

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
  const isValid = await validateToken(request, token);
  
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

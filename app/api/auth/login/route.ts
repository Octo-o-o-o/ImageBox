import { NextRequest, NextResponse } from 'next/server';
import { configStore } from '@/lib/store';

/**
 * 检测请求是否通过 HTTPS
 * 考虑反向代理的情况（x-forwarded-proto）
 */
function isSecureRequest(request: NextRequest): boolean {
  // 检查 x-forwarded-proto（反向代理）
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto === 'https') {
    return true;
  }

  // 检查请求 URL
  const url = new URL(request.url);
  return url.protocol === 'https:';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const config = await configStore.read();

    // 检查远程访问开关
    if (config.settings['remoteAccessEnabled'] !== 'true') {
      return NextResponse.json(
        { error: 'Remote access is disabled' },
        { status: 403 }
      );
    }

    // 验证 token
    const accessToken = Object.values(config.tokens).find(t => t.token === token);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (accessToken.isRevoked) {
      return NextResponse.json(
        { error: 'Token has been revoked' },
        { status: 401 }
      );
    }

    const expiresAt = new Date(accessToken.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 401 }
      );
    }

    // 更新最后使用时间
    await configStore.update(d => ({
      ...d,
      tokens: {
        ...d.tokens,
        [accessToken.id]: {
          ...accessToken,
          lastUsedAt: new Date().toISOString()
        }
      }
    }));

    // 设置 Cookie
    const response = NextResponse.json({
      success: true,
      name: accessToken.name
    });

    // Cookie 有效期与 token 一致，但最长7天
    const maxAge = Math.min(
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      7 * 24 * 60 * 60 // 7 days
    );

    // 根据实际请求协议决定是否使用 secure
    // 如果通过 HTTP 访问（如局域网 NAS），不设置 secure，否则 cookie 无法保存
    const isSecure = isSecureRequest(request);

    response.cookies.set('access_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: maxAge > 0 ? maxAge : 0,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

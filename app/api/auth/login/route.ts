import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // 检查远程访问开关
    const remoteAccessSetting = await prisma.setting.findUnique({
      where: { key: 'remoteAccessEnabled' }
    });

    if (remoteAccessSetting?.value !== 'true') {
      return NextResponse.json(
        { error: 'Remote access is disabled' },
        { status: 403 }
      );
    }

    // 验证 token
    const accessToken = await prisma.accessToken.findUnique({
      where: { token }
    });

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

    if (accessToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 401 }
      );
    }

    // 更新最后使用时间
    await prisma.accessToken.update({
      where: { id: accessToken.id },
      data: { lastUsedAt: new Date() }
    });

    // 设置 Cookie
    const response = NextResponse.json({
      success: true,
      name: accessToken.name
    });

    // Cookie 有效期与 token 一致，但最长7天
    const maxAge = Math.min(
      Math.floor((accessToken.expiresAt.getTime() - Date.now()) / 1000),
      7 * 24 * 60 * 60 // 7 days
    );

    response.cookies.set('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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


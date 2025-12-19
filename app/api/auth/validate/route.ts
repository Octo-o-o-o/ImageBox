import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // 检查远程访问开关
    const remoteAccessSetting = await prisma.setting.findUnique({
      where: { key: 'remoteAccessEnabled' }
    });

    if (remoteAccessSetting?.value !== 'true') {
      return NextResponse.json(
        { valid: false, error: 'Remote access is disabled' },
        { status: 403 }
      );
    }

    // 验证 token
    const accessToken = await prisma.accessToken.findUnique({
      where: { token }
    });

    if (!accessToken) {
      return NextResponse.json(
        { valid: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (accessToken.isRevoked) {
      return NextResponse.json(
        { valid: false, error: 'Token has been revoked' },
        { status: 401 }
      );
    }

    if (accessToken.expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Token has expired' },
        { status: 401 }
      );
    }

    // 更新最后使用时间
    await prisma.accessToken.update({
      where: { id: accessToken.id },
      data: { lastUsedAt: new Date() }
    });

    return NextResponse.json({
      valid: true,
      name: accessToken.name,
      id: accessToken.id
    });
  } catch (error) {
    console.error('Validate error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


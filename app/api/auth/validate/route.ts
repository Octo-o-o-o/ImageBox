import { NextRequest, NextResponse } from 'next/server';
import { configStore } from '@/lib/store';

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

    const config = await configStore.read();

    // 检查远程访问开关
    if (config.settings['remoteAccessEnabled'] !== 'true') {
      return NextResponse.json(
        { valid: false, error: 'Remote access is disabled' },
        { status: 403 }
      );
    }

    // 验证 token
    const accessToken = Object.values(config.tokens).find(t => t.token === token);

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

    const expiresAt = new Date(accessToken.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Token has expired' },
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

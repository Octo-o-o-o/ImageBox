import { NextResponse } from 'next/server';
import { configStore } from '@/lib/store';

/**
 * 获取系统安全配置状态
 * 用于 middleware 判断是否允许首次访问
 */
export async function GET() {
  try {
    const config = await configStore.read();

    // 检查是否有任何授权码（包括过期和撤销的，因为它们表明用户已经配置过）
    const tokenCount = Object.keys(config.tokens).length;

    // 获取远程访问开关状态
    const remoteAccessEnabled = config.settings['remoteAccessEnabled'] === 'true';

    return NextResponse.json({
      hasAnyToken: tokenCount > 0,
      remoteAccessEnabled,
      isConfigured: tokenCount > 0, // 系统已配置 = 有授权码
    });
  } catch (error) {
    console.error('Failed to get auth status:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

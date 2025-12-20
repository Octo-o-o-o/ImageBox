/**
 * 环境检测工具
 * 用于区分 Desktop (Electron) / Web / Docker 模式
 */

/**
 * 检测是否在 Electron 主进程中运行
 */
export function isElectron(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.electron;
}

/**
 * 检测是否为桌面应用模式
 * - 服务端：通过 process.versions.electron 或 USER_DATA_PATH 环境变量判断
 * - 客户端：通过 window.electronAPI 判断
 */
export function isDesktopApp(): boolean {
  // 客户端检测
  if (typeof window !== 'undefined') {
    return !!(window as unknown as { electronAPI?: unknown }).electronAPI;
  }
  // 服务端检测：Electron 进程或由 Electron 启动的 Next.js 服务器
  if (typeof process !== 'undefined') {
    return isElectron() || !!process.env.USER_DATA_PATH;
  }
  return false;
}

/**
 * 获取应用运行模式
 */
export function getAppMode(): 'desktop' | 'web' | 'docker' {
  if (isDesktopApp()) return 'desktop';
  if (typeof process !== 'undefined' && process.env.DOCKER_ENV === 'true') return 'docker';
  return 'web';
}


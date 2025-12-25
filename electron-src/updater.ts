import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog, app } from 'electron';
import log from 'electron-log';

/**
 * 初始化自动更新
 */
export function initAutoUpdater(mainWindow: BrowserWindow): void {
  const canUseWindow = (): boolean => {
    return !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed();
  };
  const safeSend = (channel: string, ...args: unknown[]): void => {
    if (!canUseWindow()) return;
    try {
      mainWindow.webContents.send(channel, ...args);
    } catch {
      // ignore
    }
  };
  const safeSetTitle = (title: string): void => {
    if (mainWindow.isDestroyed()) return;
    try {
      mainWindow.setTitle(title);
    } catch {
      // ignore
    }
  };

  // 配置日志
  autoUpdater.logger = log;
  (autoUpdater.logger as typeof log).transports.file.level = 'info';

  // 不自动下载，让用户确认
  autoUpdater.autoDownload = false;

  // 允许预发布版本（可根据需要关闭）
  autoUpdater.allowPrerelease = false;

  // 检查更新中
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
  });

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);

    if (mainWindow.isDestroyed()) return;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `ImageBox ${info.version} 可用，是否立即更新？\n\n当前版本: ${app.getVersion()}`,
      detail: info.releaseNotes ? String(info.releaseNotes).substring(0, 500) : '',
      buttons: ['立即更新', '稍后'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  // 没有更新
  autoUpdater.on('update-not-available', () => {
    log.info('No updates available.');
  });

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    const percent = progress.percent.toFixed(1);
    log.info(`Download progress: ${percent}%`);

    // 发送进度到渲染进程
    safeSend('update-progress', progress.percent);

    // 更新窗口标题显示进度
    safeSetTitle(`ImageBox - 下载更新 ${percent}%`);
  });

  // 下载完成
  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded');

    // 恢复窗口标题
    safeSetTitle('ImageBox');

    if (mainWindow.isDestroyed()) return;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已下载',
      message: '新版本已下载完成，是否立即重启应用？',
      buttons: ['立即重启', '稍后'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // 更新错误
  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);

    // 恢复窗口标题
    safeSetTitle('ImageBox');

    // 静默忽略网络相关错误（断网、超时、连接失败等）
    const networkErrors = [
      'net::ERR_INTERNET_DISCONNECTED',
      'net::ERR_TIMED_OUT',
      'net::ERR_CONNECTION_REFUSED',
      'net::ERR_CONNECTION_RESET',
      'net::ERR_NETWORK_CHANGED',
      'net::ERR_NAME_NOT_RESOLVED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNREFUSED'
    ];
    const isNetworkError = networkErrors.some(e => err.message?.includes(e));

    if (!isNetworkError) {
      dialog.showErrorBox('更新失败', `检查更新时出错: ${err.message}`);
    }
  });

  // 延迟检查更新（避免影响启动速度）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.warn('Auto update check failed:', err);
    });
  }, 5000);
}

/**
 * 手动检查更新
 */
export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    log.error('Manual update check failed:', err);
    throw err;
  }
}


import { globalShortcut, BrowserWindow } from 'electron';
import log from 'electron-log';

/**
 * 注册全局快捷键
 */
export function registerShortcuts(mainWindow: BrowserWindow): void {
  // Cmd/Ctrl + Shift + I: 快速显示/隐藏窗口
  const toggleResult = globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  if (!toggleResult) {
    log.warn('Failed to register shortcut: CommandOrControl+Shift+I');
  }

  // Cmd/Ctrl + Shift + G: 快速进入生成页面
  const createResult = globalShortcut.register('CommandOrControl+Shift+G', () => {
    if (mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
    try {
      mainWindow.webContents.send('navigate', '/create');
    } catch {
      // ignore
    }
  });

  if (!createResult) {
    log.warn('Failed to register shortcut: CommandOrControl+Shift+G');
  }

  log.info('Global shortcuts registered');
}

/**
 * 注销全局快捷键
 */
export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
  log.info('Global shortcuts unregistered');
}


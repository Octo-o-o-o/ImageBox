import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { normalizeLanguage, tTray, type Language } from './trayI18n';

// 扩展 app 类型以支持 isQuitting 属性
interface ExtendedApp extends Electron.App {
  isQuitting: boolean;
}
const extApp = app as ExtendedApp;

let tray: Tray | null = null;
let currentLanguage: Language = normalizeLanguage(app.getLocale?.());
let trayMainWindow: BrowserWindow | null = null;

function getAssetPath(...segments: string[]): string {
  const base = app.isPackaged ? app.getAppPath() : process.cwd();
  return path.join(base, ...segments);
}

function showMainWindow(mainWindow: BrowserWindow): void {
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}

function buildTrayMenu(mainWindow: BrowserWindow): Menu {
  return Menu.buildFromTemplate([
    {
      label: tTray(currentLanguage, 'tray.showMainWindow'),
      click: () => showMainWindow(mainWindow),
    },
    { type: 'separator' },
    {
      label: tTray(currentLanguage, 'tray.quit'),
      click: () => {
        extApp.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function updateTrayMenu(mainWindow: BrowserWindow): void {
  if (!tray) return;
  const menu = buildTrayMenu(mainWindow);

  // Windows/Linux: 使用系统原生右键菜单；macOS: 也设置，右键可直接弹出，左键由 click 事件手动弹出。
  tray.setContextMenu(menu);
}

export function setTrayLanguage(language: string): void {
  currentLanguage = normalizeLanguage(language);
  if (tray && trayMainWindow) {
    updateTrayMenu(trayMainWindow);
  }
}

/**
 * 创建系统托盘
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  trayMainWindow = mainWindow;
  // 标准做法：优先使用应用 icon，并按平台调整尺寸/模板属性
  const iconPaths =
    process.platform === 'darwin'
      ? [
          // macOS 推荐使用 template icon（单色，系统自动适配深浅色）
          getAssetPath('assets', 'tray-iconTemplate.png'),
          // 如果没有 template，则回退到同款彩色图标
          getAssetPath('assets', 'tray-icon.png'),
          // 回退到应用 icon
          getAssetPath('assets', 'icon.png'),
          path.join(app.getAppPath(), 'assets', 'icon.png'),
        ]
      : [
          // Windows/Linux：使用与应用图标同款的彩色托盘图标
          getAssetPath('assets', 'tray-icon.png'),
          // 回退到应用 icon
          getAssetPath('assets', 'icon.png'),
          path.join(app.getAppPath(), 'assets', 'icon.png'),
        ];

  let icon = nativeImage.createEmpty();
  let shouldSetTemplate = false;
  
  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
      shouldSetTemplate = process.platform === 'darwin' && iconPath.endsWith('tray-iconTemplate.png');
      break;
    }
  }

  // 如果没有图标文件，创建一个简单的图标
  if (icon.isEmpty()) {
    // 创建一个 16x16 的简单图标
    icon = nativeImage.createFromBuffer(
      Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0xf3, 0xff, 0x61, 0x00, 0x00, 0x00,
        0x01, 0x73, 0x52, 0x47, 0x42, 0x00, 0xae, 0xce, 0x1c, 0xe9, 0x00, 0x00,
        0x00, 0x5a, 0x49, 0x44, 0x41, 0x54, 0x38, 0x8d, 0x63, 0x64, 0x60, 0x60,
        0xf8, 0xcf, 0xc0, 0xc0, 0xc0, 0xc4, 0xc0, 0xc0, 0xf0, 0x9f, 0x01, 0x0c,
        0x18, 0x18, 0x18, 0xfe, 0x33, 0x30, 0x30, 0xfc, 0x67, 0x60, 0x60, 0x60,
        0x62, 0xc0, 0x00, 0x8c, 0x0c, 0x0c, 0xff, 0x19, 0x18, 0x18, 0xfe, 0x33,
        0x30, 0x30, 0x30, 0x31, 0x60, 0x00, 0x46, 0x06, 0x86, 0xff, 0x0c, 0x0c,
        0x0c, 0xff, 0x19, 0x18, 0x18, 0x98, 0x18, 0x30, 0x00, 0x23, 0x03, 0xc3,
        0x7f, 0x06, 0x06, 0x86, 0xff, 0x0c, 0x0c, 0x0c, 0x4c, 0x0c, 0x00, 0x00,
        0xd5, 0x23, 0x0b, 0x59, 0x1b, 0x59, 0x00, 0xdd, 0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
      ])
    );
  }

  // 统一调整为托盘常用尺寸，避免 Windows/Linux 过大/过小
  if (!icon.isEmpty()) {
    if (process.platform === 'darwin') {
      // macOS 菜单栏图标略缩小一点点（约 3%-5%），避免比旁边图标显得更大
      icon = icon.resize({ width: 17, height: 17 });
      if (shouldSetTemplate) {
        icon.setTemplateImage(true);
      }
    } else {
      icon = icon.resize({ width: 16, height: 16 });
    }
  }

  tray = new Tray(icon);

  tray.setToolTip('ImageBox');
  updateTrayMenu(mainWindow);

  // macOS：左键/右键都弹出菜单，更符合常见状态栏交互
  // Windows/Linux：左键显示主界面
  tray.on('click', () => {
    if (!tray) return;
    if (process.platform === 'darwin') {
      tray.popUpContextMenu(buildTrayMenu(mainWindow));
      return;
    }
    showMainWindow(mainWindow);
  });

  // 右键：弹系统样式菜单（只包含：显示主界面 / 退出）
  tray.on('right-click', () => {
    if (!tray) return;
    if (process.platform === 'darwin') {
      tray.popUpContextMenu(buildTrayMenu(mainWindow));
    }
  });

  return tray;
}

/**
 * 销毁托盘
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  trayMainWindow = null;
}


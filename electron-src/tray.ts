import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

// 扩展 app 类型以支持 isQuitting 属性
interface ExtendedApp extends Electron.App {
  isQuitting: boolean;
}
const extApp = app as ExtendedApp;

let tray: Tray | null = null;

/**
 * 创建系统托盘
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  // 获取托盘图标路径
  const iconPaths = [
    // macOS 使用 Template 图标（自动适配暗色/亮色模式）
    process.platform === 'darwin'
      ? path.join(process.cwd(), 'assets', 'tray-iconTemplate.png')
      : path.join(process.cwd(), 'assets', 'tray-icon.png'),
    path.join(process.cwd(), 'assets', 'tray-icon.png'),
    path.join(app.getAppPath(), 'assets', 'tray-icon.png')
  ];

  let icon = nativeImage.createEmpty();
  
  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
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

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: '新建生成',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('navigate', '/create');
      }
    },
    {
      label: '图片库',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('navigate', '/library');
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        extApp.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('ImageBox');
  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示窗口
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });

  // macOS: 双击显示窗口
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
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
}


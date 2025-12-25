import { app, BrowserWindow, ipcMain, dialog, shell, utilityProcess } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { ensureDatabase } from './database';
import { createTray, destroyTray, setTrayLanguage } from './tray';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { initAutoUpdater } from './updater';

// 扩展 app 类型以支持 isQuitting 属性
interface ExtendedApp extends Electron.App {
  isQuitting: boolean;
}
const extApp = app as ExtendedApp;

// 配置日志
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
try {
  log.info('Log file path:', log.transports.file.getFile().path);
} catch {
  // ignore
}

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let serverProcess: ReturnType<typeof utilityProcess.fork> | null = null;
let headerHookInstalled = false;
let serverReady = false;
let serverStartupError: string | null = null;

const isDev = !app.isPackaged;
// 开发模式使用 3000 端口（外部 next dev 启动），生产模式使用 3333 端口
const PORT = isDev ? 3000 : 3333;

function isWindowAlive(win: BrowserWindow | null): win is BrowserWindow {
  return !!win && !win.isDestroyed();
}

function closeSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    try {
      splashWindow.close();
    } catch {
      // ignore
    }
  }
  splashWindow = null;
}

/**
 * 获取应用路径（开发/生产环境不同）
 */
function getAppPath(): string {
  if (isDev) {
    return process.cwd();
  }
  return app.getAppPath();
}

/**
 * 创建启动画面
 */
function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const splashPath = isDev
    ? path.join(process.cwd(), 'assets', 'splash.html')
    : path.join(app.getAppPath(), 'assets', 'splash.html');

  if (fs.existsSync(splashPath)) {
    // Inject app version into splash html to avoid hardcoding
    try {
      const raw = fs.readFileSync(splashPath, 'utf8');
      const html = raw.replace(/__APP_VERSION__/g, app.getVersion());
      splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    } catch {
      splashWindow.loadFile(splashPath);
    }
  } else {
    // 如果没有 splash.html，显示简单的加载页面
    splashWindow.loadURL(`data:text/html,
      <html>
        <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;
          background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);font-family:system-ui;color:white">
          <div style="text-align:center">
            <h1 style="font-size:2rem;margin-bottom:1rem">ImageBox</h1>
            <p style="opacity:0.8">正在启动...</p>
          </div>
        </body>
      </html>
    `);
  }
}

/**
 * 等待服务器可用（用于开发模式）
 */
async function waitForServer(url: string, timeout = 30000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status === 404) {
        return true;
      }
    } catch {
      // 服务器还未就绪，继续等待
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * 启动 Next.js 服务器（仅生产模式）
 */
async function startNextServer(): Promise<void> {
  const userDataPath = app.getPath('userData');

  // 开发模式：不启动服务器，等待外部 next dev 服务器可用
  if (isDev) {
    log.info('Development mode: waiting for external Next.js server...');
    log.info(`Waiting for server at http://localhost:${PORT}`);

    const isReady = await waitForServer(`http://localhost:${PORT}`);
    if (isReady) {
      log.info('External Next.js server is ready');
    } else {
      log.warn('Timeout waiting for external server, continuing anyway...');
    }
    return;
  }

  // 生产模式：使用 utility process 启动 Next.js 服务器
  return new Promise((resolve) => {
    const appPath = getAppPath();
    const standalonePath = path.join(appPath, '.next', 'standalone');
    const serverPath = path.join(standalonePath, 'server.js');

    log.info(`Starting server from: ${serverPath}`);
    log.info(`User data path: ${userDataPath}`);

    if (!fs.existsSync(serverPath)) {
      serverStartupError = `server.js not found at ${serverPath}`;
      log.error(serverStartupError);
      resolve();
      return;
    }

    // 启动 utility process
    try {
      serverProcess = utilityProcess.fork(serverPath, [], {
        cwd: standalonePath,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: String(PORT),
          // 允许局域网设备访问（远程访问由 middleware + token 开关保护）
          // 注意：BrowserWindow 仍然加载 localhost，不受影响
          HOSTNAME: '0.0.0.0',
          USER_DATA_PATH: userDataPath,
          DATABASE_URL: `file:${path.join(userDataPath, 'imagebox.db')}`
        },
        stdio: 'pipe'
      });
    } catch (err) {
      serverStartupError = `Failed to fork server.js: ${String((err as Error)?.message ?? err)}`;
      log.error(serverStartupError);
      resolve();
      return;
    }

    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      log.info(`Server: ${output}`);
      if (output.includes('Ready') || output.includes('started server') || output.includes('localhost')) {
        serverReady = true;
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      const msg = data.toString();
      log.error(`Server Error: ${msg}`);
      // 有些情况下 stdout 不会出现 Ready，这里先记录最近一次错误，便于 fallback 展示
      if (!serverReady && !serverStartupError) {
        serverStartupError = msg.trim().slice(0, 500);
      }
    });

    serverProcess.on('exit', (code) => {
      log.info(`Server exited with code ${code}`);
      if (!serverReady && code !== 0) {
        serverStartupError = `Server exited with code ${code ?? 'unknown'}`;
      }
    });

    // 超时处理（10秒）
    setTimeout(() => {
      log.warn('Server startup timeout, continuing anyway...');
      resolve();
    }, 10000);
  });
}

/**
 * 创建主窗口
 */
async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(getAppPath(), 'assets', 'icon.png'),
    show: false, // 先隐藏，等加载完成再显示
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    // Mac/Windows 使用 hidden (配合 titleBarOverlay 或 trafficLight), Linux 使用系统默认边框
    titleBarStyle: process.platform !== 'linux' ? 'hidden' : 'default',
    // Mac: 红绿灯位置
    trafficLightPosition: { x: 18, y: 18 },
    // Windows: 使用原生控件浮层 (高度约为 30px, 颜色自动适应系统或透明)
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#00000000', // 透明背景，显示网页背景
      symbolColor: process.platform === 'win32' ? undefined : undefined, // 让系统自动处理颜色(Windows 11 通常适配较好)，或者后续通过 IPC 更新
      height: 35
    } : undefined
  });
  mainWindow = win;

  // 记录渲染进程日志/崩溃信息，便于排查“白屏”
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    // level: 0=log,1=warn,2=error,3=debug (Electron)
    const tag = level === 2 ? 'console.error' : level === 1 ? 'console.warn' : 'console.log';
    log.info(`[renderer:${tag}] ${message} (${sourceId}:${line})`);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    log.error('Renderer process gone:', details);
  });

  win.webContents.on('unresponsive', () => {
    log.warn('Renderer became unresponsive');
  });

  // 页面加载失败时自动重试，避免打包后 Next 服务器启动慢导致白屏
  const loadMainUrlWithRetry = async (maxRetries = 8): Promise<void> => {
    const url = `http://localhost:${PORT}`;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (win.isDestroyed() || win.webContents.isDestroyed()) return;
        log.info(`Attempt ${attempt}/${maxRetries}: waiting for server ${url}`);
        const ready = await waitForServer(url, 30000);
        if (!ready) {
          throw new Error('Server not ready (timeout)');
        }

        log.info(`Attempt ${attempt}/${maxRetries}: loading URL ${url}`);
        if (win.isDestroyed()) return;
        await win.loadURL(url);
        log.info('URL loaded successfully');
        return;
      } catch (err) {
        log.error(`Attempt ${attempt}/${maxRetries} failed to load URL:`, err);
        // 如果服务器明确启动失败，减少无意义重试，尽快给用户反馈
        if (serverStartupError && attempt >= 2) break;
        // small backoff
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * attempt, 8000)));
      }
    }

    log.error('All attempts failed. Showing fallback error page.');
    try {
      if (win.isDestroyed()) return;
      const logPath = (() => {
        try {
          return log.transports.file.getFile().path;
        } catch {
          return '';
        }
      })();

      const detail = [
        serverStartupError ? `Server: ${serverStartupError}` : '',
        logPath ? `Log: ${logPath}` : ''
      ].filter(Boolean).join('<br/>');

      await win.loadURL(`data:text/html,
        <html>
          <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;
            font-family:system-ui;background:#0b1020;color:#fff">
            <div style="max-width:720px;padding:24px">
              <h2 style="margin:0 0 12px 0;">ImageBox 启动失败</h2>
              <p style="margin:0 0 16px 0;opacity:.85;line-height:1.5">
                本地服务未能启动或页面加载失败。请稍后重试，或查看日志文件以定位原因。
              </p>
              ${detail ? `<div style="margin:0 0 16px 0;opacity:.85;line-height:1.5;font-size:12px;word-break:break-all">${detail}</div>` : ''}
              <button onclick="location.reload()" style="padding:10px 14px;border-radius:10px;border:0;
                background:#4f46e5;color:#fff;font-weight:600;cursor:pointer">
                重试
              </button>
            </div>
          </body>
        </html>
      `);
      win.show();
      closeSplashWindow();
    } catch {
      // ignore
    }
  };

  // 添加 Electron 标识 header
  if (!headerHookInstalled) {
    headerHookInstalled = true;
    win.webContents.session.webRequest.onBeforeSendHeaders(
      { urls: ['http://localhost:*/*'] },
      (details, callback) => {
        details.requestHeaders['x-electron-app'] = 'true';
        callback({ requestHeaders: details.requestHeaders });
      }
    );
  }

  // 页面加载完成后显示窗口，关闭启动画面（必须在 loadURL 之前注册）
  win.webContents.on('did-finish-load', () => {
    if (win.isDestroyed() || win.webContents.isDestroyed()) return;
    log.info('Page loaded, showing main window');
    closeSplashWindow();
    win.show();

    // 尝试从渲染进程 localStorage 读取用户选择的语言（与前端保持一致）
    // 注意：如果读取失败，托盘会保持系统默认语言，随后 LanguageProvider 也会通过 IPC 再同步一次。
    try {
      void win.webContents
        .executeJavaScript("localStorage.getItem('imagebox-language')", true)
        .then((lang) => {
          if (typeof lang === 'string' && lang) {
            setTrayLanguage(lang);
          }
        })
        .catch(() => null);
    } catch {
      // ignore
    }
  });

  // 开发模式打开 DevTools
  if (isDev) {
    win.webContents.openDevTools();
  }

  // 生产模式默认不打开 DevTools；如需排查线上问题可临时设置环境变量 IMAGEBOX_DEVTOOLS=1
  if (!isDev && process.env.IMAGEBOX_DEVTOOLS === '1') {
    win.webContents.openDevTools();
  }

  // 先加载一个轻量的“启动中”页面，避免 splash 在服务启动失败/变慢时一直转圈
  try {
    await win.loadURL(`data:text/html;charset=utf-8,
      <html>
        <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;
          font-family:system-ui;background:linear-gradient(135deg,#0b1020 0%,#111827 100%);color:#fff">
          <div style="text-align:center;max-width:720px;padding:24px">
            <div style="font-size:28px;font-weight:700;margin-bottom:10px">ImageBox</div>
            <div style="opacity:.85;line-height:1.6;margin-bottom:12px">正在启动本地服务，请稍候…</div>
            <div style="opacity:.7;font-size:12px;word-break:break-all">端口：${PORT}</div>
          </div>
        </body>
      </html>
    `);
  } catch {
    // ignore
  }

  // 加载页面
  // 注：生产环境 utilityProcess 启动 Next 服务器可能更慢（尤其是 Windows 首次启动/杀软扫描），这里做探活+重试兜底
  await loadMainUrlWithRetry();

  // macOS：点击关闭按钮时隐藏而不是退出
  win.on('close', (e) => {
    if (process.platform === 'darwin' && !extApp.isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
    destroyTray();
    unregisterShortcuts();
  });
}

/**
 * IPC 处理
 */
function setupIPC(): void {
  // 渲染进程同步当前语言（用于托盘菜单多语言）
  ipcMain.on('i18n:setLanguage', (_, language: string) => {
    setTrayLanguage(String(language ?? ''));
  });

  // 获取系统语言（异步，避免阻塞渲染进程）
  ipcMain.handle('i18n:getSystemLanguage', () => {
    return app.getLocale();
  });

  // 文件夹选择对话框
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });
    return result.filePaths[0];
  });

  // 在文件管理器中显示
  ipcMain.handle('shell:showItem', async (_, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  // 打开外部链接
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    await shell.openExternal(url);
  });

  // 获取默认路径
  ipcMain.handle('app:getDefaultPaths', () => {
    return {
      documents: app.getPath('documents'),
      downloads: app.getPath('downloads'),
      userData: app.getPath('userData')
    };
  });
}

/**
 * 应用初始化
 */
app.whenReady().then(async () => {
  log.info('App is ready, initializing...');

  // 显示启动画面
  createSplashWindow();

  // 确保数据目录存在
  const userDataPath = app.getPath('userData');
  const generatedPath = path.join(userDataPath, 'generated');
  const thumbnailPath = path.join(generatedPath, 'thumbnails');

  if (!fs.existsSync(generatedPath)) {
    fs.mkdirSync(generatedPath, { recursive: true });
  }
  if (!fs.existsSync(thumbnailPath)) {
    fs.mkdirSync(thumbnailPath, { recursive: true });
  }

  // 初始化数据库
  try {
    await ensureDatabase();
  } catch (err) {
    log.error('Failed to initialize database:', err);
  }

  // 设置 IPC
  setupIPC();

  // 启动 Next.js 服务器
  try {
    await startNextServer();
  } catch (err) {
    log.error('Failed to start Next.js server:', err);
  }

  // 创建主窗口
  await createWindow();

  // 创建托盘
  if (mainWindow) {
    createTray(mainWindow);
    registerShortcuts(mainWindow);

    // 生产模式检查更新（暂时注释掉，测试完成后再启用）
    // if (!isDev) {
    //   initAutoUpdater(mainWindow);
    // }
  }

  // macOS: 点击 dock 图标时显示窗口
  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
});

// 标记应用正在退出（用于 macOS 关闭行为）
extApp.isQuitting = false;

app.on('before-quit', () => {
  extApp.isQuitting = true;
  unregisterShortcuts();
  destroyTray();

  // 清理服务器进程
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


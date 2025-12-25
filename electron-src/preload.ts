import { contextBridge, ipcRenderer } from 'electron';

/**
 * 暴露给渲染进程的 API
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 选择文件夹
   */
  selectFolder: (): Promise<string | undefined> => {
    return ipcRenderer.invoke('dialog:selectFolder');
  },

  /**
   * 在文件管理器中显示文件
   */
  showInFinder: (filePath: string): Promise<void> => {
    return ipcRenderer.invoke('shell:showItem', filePath);
  },

  /**
   * 打开外部链接
   */
  openExternal: (url: string): Promise<void> => {
    return ipcRenderer.invoke('shell:openExternal', url);
  },

  /**
   * 监听导航事件（从主进程）
   */
  onNavigate: (callback: (path: string) => void): void => {
    ipcRenderer.on('navigate', (_, path) => callback(path));
  },

  /**
   * 监听更新进度
   */
  onUpdateProgress: (callback: (percent: number) => void): void => {
    ipcRenderer.on('update-progress', (_, percent) => callback(percent));
  },

  /**
   * 检查是否为桌面应用
   */
  isDesktop: true,

  /**
   * 获取默认路径
   */
  getDefaultPaths: (): Promise<{ documents: string; downloads: string; userData: string }> => {
    return ipcRenderer.invoke('app:getDefaultPaths');
  },

  /**
   * 获取当前平台 (win32, darwin, linux)
   */
  platform: process.platform,

  /**
   * 同步当前语言到主进程（用于托盘菜单多语言）
   */
  setLanguage: (language: string): void => {
    ipcRenderer.send('i18n:setLanguage', language);
  },

  /**
   * 获取系统语言（异步，避免阻塞渲染进程）
   */
  getSystemLanguage: (): Promise<string> => {
    return ipcRenderer.invoke('i18n:getSystemLanguage');
  }
});

// TypeScript 类型声明
declare global {
  interface Window {
    electronAPI?: {
      selectFolder: () => Promise<string | undefined>;
      showInFinder: (filePath: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      getDefaultPaths: () => Promise<{ documents: string; downloads: string; userData: string }>;
      onNavigate: (callback: (path: string) => void) => void;
      onUpdateProgress: (callback: (percent: number) => void) => void;
      isDesktop: boolean;
      platform: string;
      setLanguage?: (language: string) => void;
      getSystemLanguage?: () => Promise<string>;
    };
  }
}


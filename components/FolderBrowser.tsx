'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ArrowUp, 
  Home,
  X,
  Check,
  Loader2,
  HardDrive,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

interface FolderInfo {
  name: string;
  path: string;
  isParent?: boolean;
}

interface BrowseResponse {
  currentPath: string;
  parentPath: string | null;
  folders: FolderInfo[];
  isQuickAccess: boolean;
  error?: string;
}

interface FolderBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export function FolderBrowser({ isOpen, onClose, onSelect, initialPath }: FolderBrowserProps) {
  const { t } = useLanguage();
  const [currentPath, setCurrentPath] = useState<string>('');
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [isQuickAccess, setIsQuickAccess] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');

  const fetchFolders = async (path?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = path 
        ? `/api/browse-folders?path=${encodeURIComponent(path)}`
        : '/api/browse-folders';
      
      const response = await fetch(url);
      const data: BrowseResponse = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setFolders(data.folders);
      setIsQuickAccess(data.isQuickAccess);
      
      if (data.currentPath) {
        setSelectedPath(data.currentPath);
      }
    } catch (err) {
      setError('无法加载文件夹列表');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialPath) {
        fetchFolders(initialPath);
      } else {
        fetchFolders();
      }
    }
  }, [isOpen, initialPath]);

  const handleFolderClick = (folder: FolderInfo) => {
    fetchFolders(folder.path);
  };

  const handleGoUp = () => {
    if (parentPath) {
      fetchFolders(parentPath);
    }
  };

  const handleGoHome = () => {
    fetchFolders();
  };

  const handleConfirm = () => {
    if (selectedPath) {
      onSelect(selectedPath);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-xl bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                {t('settings.storage.selectFolder') || '选择文件夹'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 p-3 border-b border-border bg-secondary/30">
            <button
              onClick={handleGoHome}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary disabled:opacity-50"
              title={t('settings.storage.quickAccess') || '快捷访问'}
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoUp}
              disabled={!parentPath || isQuickAccess}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary disabled:opacity-50"
              title={t('settings.storage.goUp') || '上级目录'}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div className="flex-1 px-3 py-1.5 bg-secondary/50 rounded-lg text-sm text-muted-foreground truncate">
              {isQuickAccess ? (t('settings.storage.quickAccess') || '快捷访问') : currentPath}
            </div>
          </div>

          {/* Folder List */}
          <div className="h-80 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500 gap-2">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">{error}</p>
                <button
                  onClick={handleGoHome}
                  className="text-sm text-primary hover:underline"
                >
                  {t('settings.storage.backToQuickAccess') || '返回快捷访问'}
                </button>
              </div>
            ) : folders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Folder className="w-8 h-8" />
                <p className="text-sm">{t('settings.storage.emptyFolder') || '此文件夹为空'}</p>
              </div>
            ) : (
              <div className="p-2">
                {folders.map((folder, index) => (
                  <motion.button
                    key={folder.path}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => handleFolderClick(folder)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group ${
                      selectedPath === folder.path
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    {isQuickAccess ? (
                      folder.name.includes(':') ? (
                        <HardDrive className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Folder className="w-5 h-5 text-amber-500" />
                      )
                    ) : (
                      <Folder className="w-5 h-5 text-amber-500" />
                    )}
                    <span className="flex-1 truncate">{folder.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/20">
            <div className="flex-1 text-sm text-muted-foreground truncate mr-4">
              {selectedPath && !isQuickAccess && (
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-500" />
                  {selectedPath}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('common.cancel') || '取消'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedPath || isQuickAccess}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('settings.storage.selectThisFolder') || '选择此文件夹'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


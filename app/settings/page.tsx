'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Settings, 
  Globe, 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Clock,
  Shield,
  ExternalLink,
  X,
  Edit3,
  Loader2,
  AlertCircle,
  Rocket,
  HardDrive,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  FolderSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/LanguageProvider';
import { 
  getRemoteAccessEnabled, 
  setRemoteAccessEnabled, 
  getAccessTokens, 
  createAccessToken, 
  deleteAccessToken,
  updateAccessTokenDescription,
  getStorageConfig,
  getStorageStats,
  validateStoragePath,
  updateStoragePath
} from '@/app/actions';
import { replaceTemplate } from '@/lib/i18n';
import { FolderBrowser } from '@/components/FolderBrowser';

type AccessTokenDisplay = {
  id: string;
  name: string;
  description: string | null;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date | null;
  isRevoked: boolean;
  isExpired: boolean;
};

const EXPIRY_OPTIONS = [
  { value: 1, label: 'settings.tokens.expiry.1h' },
  { value: 24, label: 'settings.tokens.expiry.24h' },
  { value: 168, label: 'settings.tokens.expiry.7d' },
  { value: 720, label: 'settings.tokens.expiry.30d' },
  { value: -1, label: 'settings.tokens.expiry.permanent' },
];

export default function SettingsPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSetupMode = searchParams.get('setup') === 'true';
  
  const [loading, setLoading] = useState(true);
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [tokens, setTokens] = useState<AccessTokenDisplay[]>([]);
  
  // Setup mode states
  const [setupStep, setSetupStep] = useState<'welcome' | 'create' | 'done'>('welcome');
  const [setupToken, setSetupToken] = useState<AccessTokenDisplay | null>(null);
  
  // Create state
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Token detail modal state
  const [selectedToken, setSelectedToken] = useState<AccessTokenDisplay | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  
  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Copy states
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Storage settings states
  const [storageConfig, setStorageConfig] = useState<{ type: string; path: string; defaultPath: string } | null>(null);
  const [storageStats, setStorageStats] = useState<{ imageCount: number; storagePath: string; isCustomPath: boolean } | null>(null);
  const [storagePathInput, setStoragePathInput] = useState('');
  const [validatingPath, setValidatingPath] = useState(false);
  const [pathValidation, setPathValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [savingStorage, setSavingStorage] = useState(false);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [pendingStoragePath, setPendingStoragePath] = useState('');
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);

  // Helper for i18n with variables
  const tr = (key: string, vars?: Record<string, string | number>) =>
    vars ? replaceTemplate(t(key), vars) : t(key);

  const loadData = async () => {
    setLoading(true);
    try {
      const [enabled, tokenList, config, stats] = await Promise.all([
        getRemoteAccessEnabled(),
        getAccessTokens(),
        getStorageConfig(),
        getStorageStats()
      ]);
      setRemoteEnabled(enabled);
      setTokens(tokenList as AccessTokenDisplay[]);
      setStorageConfig(config);
      setStorageStats(stats);
      setStoragePathInput(config.path);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleRemote = async () => {
    const newValue = !remoteEnabled;
    setRemoteEnabled(newValue);
    await setRemoteAccessEnabled(newValue);
  };

  const handleCreateToken = async (expiresIn: number) => {
    setCreating(true);
    setShowCreateMenu(false);
    try {
      const result = await createAccessToken(expiresIn);
      await loadData();
      const newToken = {
        ...result,
        isRevoked: false,
        isExpired: false,
        lastUsedAt: null
      } as AccessTokenDisplay;
      
      if (isSetupMode) {
        // 设置模式下，自动开启远程访问
        await setRemoteAccessEnabled(true);
        setRemoteEnabled(true);
        setSetupToken(newToken);
        setSetupStep('done');
      } else {
        setSelectedToken(newToken);
      }
    } catch (error) {
      console.error('Failed to create token:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteToken = async (id: string) => {
    try {
      await deleteAccessToken(id);
      setShowDeleteConfirm(null);
      setSelectedToken(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete token:', error);
    }
  };

  const handleSaveDescription = async () => {
    if (!selectedToken) return;
    setSavingDescription(true);
    try {
      await updateAccessTokenDescription(selectedToken.id, descriptionInput);
      await loadData();
      setSelectedToken({
        ...selectedToken,
        description: descriptionInput || null
      });
      setEditingDescription(false);
    } catch (error) {
      console.error('Failed to save description:', error);
    } finally {
      setSavingDescription(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'token' | 'link', id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'token') {
        setCopiedTokenId(id);
        setTimeout(() => setCopiedTokenId(null), 2000);
      } else {
        setCopiedLinkId(id);
        setTimeout(() => setCopiedLinkId(null), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getLoginLink = (token: string) => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      const protocol = window.location.protocol;
      return `${protocol}//${host}/auth/login?token=${token}`;
    }
    return '';
  };

  const getExternalUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const formatExpiry = (date: Date) => {
    const now = new Date();
    const expiry = new Date(date);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff < 0) return t('settings.tokens.expired');
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 365 * 10) return t('settings.tokens.expiry.permanent');
    if (days > 0) return t('settings.tokens.expiresIn').replace('{time}', `${days}${t('settings.tokens.days')}`);
    if (hours > 0) return t('settings.tokens.expiresIn').replace('{time}', `${hours}${t('settings.tokens.hours')}`);
    return t('settings.tokens.expiringSoon');
  };

  const openTokenDetail = (token: AccessTokenDisplay) => {
    setSelectedToken(token);
    setDescriptionInput(token.description || '');
    setEditingDescription(false);
  };

  const finishSetup = () => {
    // 移除 URL 参数并跳转到主页
    router.push('/library');
  };

  // Storage settings handlers
  const handleValidatePath = async () => {
    setValidatingPath(true);
    setPathValidation(null);
    try {
      const result = await validateStoragePath(storagePathInput);
      setPathValidation(result);
    } catch (error) {
      setPathValidation({ valid: false, error: 'Validation failed' });
    } finally {
      setValidatingPath(false);
    }
  };

  // Demo: Try to use system folder picker (to show browser limitation)
  const handleSystemFolderPicker = async () => {
    try {
      // Check if the API is available
      if (!('showDirectoryPicker' in window)) {
        alert('此浏览器不支持 showDirectoryPicker API（Firefox 等不支持）');
        return;
      }
      
      // @ts-ignore - TypeScript may not recognize this API
      const dirHandle = await window.showDirectoryPicker();
      
      // Show what we can get from the handle
      const info = `
系统文件夹选择器返回的信息：

✅ 文件夹名称: "${dirHandle.name}"
❌ 绝对路径: 无法获取（浏览器安全限制）

这就是为什么我们需要使用服务端文件夹浏览器。
浏览器故意隐藏了绝对路径，以保护用户隐私。
      `.trim();
      
      alert(info);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled
        return;
      }
      alert(`错误: ${error.message}`);
    }
  };

  const handleSaveStoragePath = async () => {
    // If path is different from current, show migrate modal
    const currentPath = storageConfig?.path || '';
    if (storagePathInput !== currentPath && storageStats && storageStats.imageCount > 0) {
      setPendingStoragePath(storagePathInput);
      setShowMigrateModal(true);
    } else {
      // No images to migrate, save directly
      await doSaveStoragePath(storagePathInput, false);
    }
  };

  const doSaveStoragePath = async (newPath: string, migrate: boolean) => {
    setSavingStorage(true);
    try {
      const result = await updateStoragePath(newPath, { migrate });
      if (result.success) {
        if (migrate && (result.migratedCount || result.failedCount)) {
          alert(tr('settings.storage.migrateSuccess', { 
            moved: result.migratedCount || 0, 
            failed: result.failedCount || 0 
          }));
        }
        await loadData();
        setPathValidation(null);
      } else {
        alert(result.error || t('settings.storage.saveError'));
      }
    } catch (error) {
      console.error('Failed to save storage path:', error);
      alert(t('settings.storage.saveError'));
    } finally {
      setSavingStorage(false);
      setShowMigrateModal(false);
    }
  };

  const handleUseDefaultPath = () => {
    setStoragePathInput('');
    setPathValidation(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // === 初始设置模式 ===
  if (isSetupMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {/* Welcome Step */}
          {setupStep === 'welcome' && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                {t('settings.setup.welcome')}
              </h1>
              <p className="text-muted-foreground mb-6">
                {t('settings.setup.welcomeDesc')}
              </p>
              
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400 text-left">
                    {t('settings.setup.securityWarning')}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setSetupStep('create')}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Key className="w-5 h-5" />
                {t('settings.setup.createNow')}
              </button>
            </div>
          )}
          
          {/* Create Step */}
          {setupStep === 'create' && (
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Key className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {t('settings.setup.selectExpiry')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('settings.setup.selectExpiryDesc')}
                </p>
              </div>
              
              <div className="space-y-2 mb-6">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleCreateToken(opt.value)}
                    disabled={creating}
                    className="w-full px-4 py-3 text-left rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/30 transition-all text-foreground disabled:opacity-50 flex items-center justify-between"
                  >
                    <span>{t(opt.label)}</span>
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setSetupStep('welcome')}
                className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('common.back')}
              </button>
            </div>
          )}
          
          {/* Done Step */}
          {setupStep === 'done' && setupToken && (
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {t('settings.setup.success')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('settings.setup.successDesc')}
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">
                    {t('settings.tokens.tokenLabel')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={setupToken.token}
                      readOnly
                      className="flex-1 bg-secondary/50 border border-border rounded-lg p-3 font-mono text-sm text-foreground"
                    />
                    <button
                      onClick={() => copyToClipboard(setupToken.token, 'token', setupToken.id)}
                      className="p-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                    >
                      {copiedTokenId === setupToken.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">
                    {t('settings.tokens.quickLink')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={getLoginLink(setupToken.token)}
                      readOnly
                      className="flex-1 bg-secondary/50 border border-border rounded-lg p-3 font-mono text-xs text-foreground truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(getLoginLink(setupToken.token), 'link', setupToken.id)}
                      className="p-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                    >
                      {copiedLinkId === setupToken.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.tokens.quickLinkHint')}
                  </p>
                </div>
              </div>
              
              <button
                onClick={finishSetup}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Rocket className="w-5 h-5" />
                {t('settings.setup.startUsing')}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // === 普通设置页面 ===
  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
          <Settings className="text-primary" />
          {t('settings.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Remote Access Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          {t('settings.remoteAccess.title')}
        </h2>
        
        <div className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">{t('settings.remoteAccess.enable')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('settings.remoteAccess.description')}
              </p>
            </div>
            
            {/* Toggle Switch */}
            <button
              onClick={handleToggleRemote}
              className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
                remoteEnabled ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              <motion.div
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ left: remoteEnabled ? '1.75rem' : '0.25rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
          
          {/* Status hint - same height for both states */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
            {remoteEnabled ? (
              <>
                <ExternalLink className="w-4 h-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <span className="text-foreground font-medium">{t('settings.remoteAccess.enabledHint')}</span>
                  <span className="text-muted-foreground ml-1">{getExternalUrl()}</span>
                </div>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {t('settings.remoteAccess.disabledHint')}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Access Tokens Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            {t('settings.tokens.title')}
          </h2>
          
          {/* Create Token Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {t('settings.tokens.create')}
            </button>
            
            <AnimatePresence>
              {showCreateMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-xl shadow-xl z-10 overflow-hidden"
                >
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleCreateToken(opt.value)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-secondary/50 transition-colors text-foreground"
                    >
                      {t(opt.label)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl bg-card border border-border">
          {tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('settings.tokens.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  onClick={() => openTokenDetail(token)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    token.isExpired || token.isRevoked
                      ? 'bg-muted/30 border-border opacity-60'
                      : 'bg-secondary/30 border-border hover:border-primary/30 hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-foreground">{token.token.slice(0, 8)}...{token.token.slice(-4)}</span>
                        {(token.isExpired || token.isRevoked) && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive">
                            {token.isRevoked ? t('settings.tokens.revoked') : t('settings.tokens.expired')}
                          </span>
                        )}
                      </div>
                      {token.description && (
                        <p className="text-sm text-muted-foreground mt-1">{token.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatExpiry(token.expiresAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(token.token, 'token', token.id);
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        title={t('settings.tokens.copyToken')}
                      >
                        {copiedTokenId === token.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(token.id);
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Storage Settings Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          {t('settings.storage.title')}
        </h2>
        
        <div className="p-6 rounded-2xl bg-card border border-border">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">
                {t('settings.storage.pathLabel')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={storagePathInput}
                  onChange={(e) => {
                    setStoragePathInput(e.target.value);
                    setPathValidation(null);
                  }}
                  placeholder={t('settings.storage.pathPlaceholder')}
                  className="flex-1 bg-secondary/50 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none text-foreground text-sm font-mono"
                />
                <button
                  onClick={() => setShowFolderBrowser(true)}
                  className="px-4 py-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                  title={t('settings.storage.browse')}
                >
                  <FolderSearch className="w-4 h-4" />
                  {t('settings.storage.browse')}
                </button>
                <button
                  onClick={handleValidatePath}
                  disabled={validatingPath || !storagePathInput}
                  className="px-4 py-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {validatingPath ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('settings.storage.validate')
                  )}
                </button>
              </div>
              
              {/* Browser limitation demo link */}
              <p className="text-xs text-muted-foreground">
                {t('settings.storage.pathHint')}{' '}
                <button
                  type="button"
                  onClick={handleSystemFolderPicker}
                  className="text-primary hover:underline"
                >
                  （点击测试系统选择器的限制）
                </button>
              </p>
              
              {/* Path validation result */}
              {pathValidation && (
                <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 text-sm ${
                  pathValidation.valid 
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}>
                  {pathValidation.valid ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {pathValidation.valid 
                    ? t('settings.storage.validSuccess')
                    : (pathValidation.error || t('settings.storage.validError'))
                  }
                </div>
              )}
              
            </div>
            
            {/* Stats */}
            {storageStats && (
              <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {storagePathInput ? t('settings.storage.customPath') : t('settings.storage.defaultPath')}:
                </span>
                <span className="text-sm font-mono text-foreground truncate flex-1">
                  {storagePathInput || storageConfig?.defaultPath}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({tr('settings.storage.currentStats', { count: storageStats.imageCount })})
                </span>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              {storagePathInput && (
                <button
                  onClick={handleUseDefaultPath}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('settings.storage.useDefault')}
                </button>
              )}
              <button
                onClick={handleSaveStoragePath}
                disabled={savingStorage || !!(storagePathInput && !pathValidation?.valid && storagePathInput !== storageConfig?.path)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingStorage ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('settings.storage.saving')}
                  </span>
                ) : (
                  t('settings.storage.save')
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Migration Modal */}
      <AnimatePresence>
        {showMigrateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowMigrateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-popover border border-border rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-popover-foreground">
                  {t('settings.storage.migrateTitle')}
                </h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {t('settings.storage.migrateDesc')}
              </p>
              
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-6">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {t('settings.storage.migrateWarning')}
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => doSaveStoragePath(pendingStoragePath, false)}
                  disabled={savingStorage}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {t('settings.storage.migrateNo')}
                </button>
                <button
                  onClick={() => doSaveStoragePath(pendingStoragePath, true)}
                  disabled={savingStorage}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {savingStorage && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('settings.storage.migrateYes')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close create menu */}
      {showCreateMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowCreateMenu(false)}
        />
      )}

      {/* Token Detail Modal */}
      <AnimatePresence>
        {selectedToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedToken(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-popover border border-border rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-popover-foreground">
                      {t('settings.tokens.detail')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {formatExpiry(selectedToken.expiresAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedToken(null)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Token */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">
                    {t('settings.tokens.tokenLabel')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedToken.token}
                      readOnly
                      className="flex-1 bg-secondary/50 border border-border rounded-lg p-3 font-mono text-sm text-foreground"
                    />
                    <button
                      onClick={() => copyToClipboard(selectedToken.token, 'token', selectedToken.id)}
                      className="p-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                    >
                      {copiedTokenId === selectedToken.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Quick Link */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">
                    {t('settings.tokens.quickLink')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={getLoginLink(selectedToken.token)}
                      readOnly
                      className="flex-1 bg-secondary/50 border border-border rounded-lg p-3 font-mono text-xs text-foreground truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(getLoginLink(selectedToken.token), 'link', selectedToken.id)}
                      className="p-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                    >
                      {copiedLinkId === selectedToken.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.tokens.quickLinkHint')}
                  </p>
                </div>
                
                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-muted-foreground uppercase">
                      {t('settings.tokens.description')}
                    </label>
                    {!editingDescription && (
                      <button
                        onClick={() => {
                          setDescriptionInput(selectedToken.description || '');
                          setEditingDescription(true);
                        }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        {t('common.edit')}
                      </button>
                    )}
                  </div>
                  
                  {editingDescription ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={descriptionInput}
                        onChange={(e) => setDescriptionInput(e.target.value)}
                        placeholder={t('settings.tokens.descriptionPlaceholder')}
                        className="w-full bg-secondary/50 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none text-foreground text-sm"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingDescription(false)}
                          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={handleSaveDescription}
                          disabled={savingDescription}
                          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                          {savingDescription ? t('common.saving') : t('common.save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                      {selectedToken.description || t('settings.tokens.noDescription')}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between mt-6 pt-4 border-t border-border">
                <button
                  onClick={() => setShowDeleteConfirm(selectedToken.id)}
                  className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('common.delete')}
                </button>
                <button
                  onClick={() => setSelectedToken(null)}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-popover border border-border rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-popover-foreground mb-4">
                {t('settings.tokens.deleteConfirm')}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t('settings.tokens.deleteWarning')}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleDeleteToken(showDeleteConfirm)}
                  className="px-4 py-2 bg-destructive text-white rounded-lg font-medium hover:bg-destructive/90 transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Browser Modal */}
      <FolderBrowser
        isOpen={showFolderBrowser}
        onClose={() => setShowFolderBrowser(false)}
        onSelect={(path) => {
          setStoragePathInput(path);
          setPathValidation(null);
        }}
        initialPath={storagePathInput || undefined}
      />
    </div>
  );
}

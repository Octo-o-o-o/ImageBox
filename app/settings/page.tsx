'use client';

import { useState, useEffect, Suspense } from 'react';
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
  FolderSearch,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/LanguageProvider';
import {
  getRemoteAccessEnabled,
  setRemoteAccessEnabled,
  getAccessTokens,
  createAccessToken,
  createAccessTokenWithRemoteAccess,
  deleteAccessToken,
  updateAccessTokenDescription,
  getStorageConfig,
  getStorageStats,
  validateStoragePath,
  updateStoragePath,
  getLocalIpAddress
} from '@/app/actions';
import { replaceTemplate } from '@/lib/i18n';
import { FolderBrowser } from '@/components/FolderBrowser';
import { isDesktopApp } from '@/lib/env';
import { DataManagement } from '@/components/DataManagement';
import { isShortcutCmdEnterEnabled, setShortcutCmdEnterState, getShortcutKeyDisplay } from '@/lib/shortcutSettings';

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

function SettingsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSetupMode = searchParams.get('setup') === 'true';

  const [loading, setLoading] = useState(true);
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [tokens, setTokens] = useState<AccessTokenDisplay[]>([]);
  const [localIp, setLocalIp] = useState('localhost');

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

  // Refresh IP state
  const [refreshingIp, setRefreshingIp] = useState(false);

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
  const [isDesktopMode, setIsDesktopMode] = useState(() => isDesktopApp());

  // Keyboard shortcuts state
  const [shortcutCmdEnterEnabled, setShortcutCmdEnterEnabledState] = useState(() => isShortcutCmdEnterEnabled());

  // Helper for i18n with variables
  const tr = (key: string, vars?: Record<string, string | number>) =>
    vars ? replaceTemplate(t(key), vars) : t(key);

  const loadData = async () => {
    setLoading(true);
    try {
      const [enabled, tokenList, config, stats, ip] = await Promise.all([
        getRemoteAccessEnabled(),
        getAccessTokens(),
        getStorageConfig(),
        getStorageStats(),
        getLocalIpAddress()
      ]);
      setRemoteEnabled(enabled);
      setTokens(tokenList as AccessTokenDisplay[]);
      setStorageConfig(config);
      setStorageStats(stats);
      setLocalIp(ip);
      setStoragePathInput(config.path);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Detect desktop mode on client side (Electron preload will exist)
    setIsDesktopMode(isDesktopApp());
  }, []);

  // ESC key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close delete confirm modal first (highest z-index)
        if (showDeleteConfirm) {
          setShowDeleteConfirm(null);
          return;
        }
        // Close token detail modal
        if (selectedToken) {
          setSelectedToken(null);
          return;
        }
        // Close migrate modal
        if (showMigrateModal && !savingStorage) {
          setShowMigrateModal(false);
          return;
        }
        // Close folder browser
        if (showFolderBrowser) {
          setShowFolderBrowser(false);
          return;
        }
        // Close create menu
        if (showCreateMenu) {
          setShowCreateMenu(false);
          return;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm, selectedToken, showMigrateModal, savingStorage, showFolderBrowser, showCreateMenu]);

  const applyStoragePath = async (newPath: string) => {
    setStoragePathInput(newPath);
    setPathValidation(null);

    // 选完路径后自动校验，避免“看起来改了但实际无法保存”的困惑
    try {
      setValidatingPath(true);
      const result = await validateStoragePath(newPath);
      setPathValidation(result);
    } catch {
      setPathValidation({ valid: false, error: 'Validation failed' });
    } finally {
      setValidatingPath(false);
    }
  };

  const handleBrowseStoragePath = async () => {
    // Desktop app: use native folder picker via Electron
    if (isDesktopMode && typeof window !== 'undefined' && window.electronAPI?.selectFolder) {
      try {
        const selected = await window.electronAPI.selectFolder();
        if (selected) {
          await applyStoragePath(selected);
        }
        return;
      } catch (e) {
        console.error('Native folder picker failed, falling back to web browser:', e);
      }
    }

    // Web fallback: use in-app folder browser
    setShowFolderBrowser(true);
  };

  const handleToggleRemote = async () => {
    const newValue = !remoteEnabled;
    setRemoteEnabled(newValue);
    await setRemoteAccessEnabled(newValue);
  };

  const handleCreateToken = async (expiresIn: number) => {
    setCreating(true);
    setShowCreateMenu(false);
    try {
      let result;

      if (isSetupMode) {
        // Setup mode: use atomic action that creates token AND enables remote access
        // This avoids race condition where token exists but remote access is not yet enabled
        result = await createAccessTokenWithRemoteAccess(expiresIn);
        setRemoteEnabled(true);
      } else {
        result = await createAccessToken(expiresIn);
      }

      await loadData();
      const newToken = {
        ...result,
        isRevoked: false,
        isExpired: false,
        lastUsedAt: null
      } as AccessTokenDisplay;

      if (isSetupMode) {
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
      const port = window.location.port ? `:${window.location.port}` : '';
      const protocol = window.location.protocol;
      return `${protocol}//${localIp}${port}/auth/login?token=${token}`;
    }
    return '';
  };

  const getExternalUrl = () => {
    if (typeof window !== 'undefined') {
      const port = window.location.port ? `:${window.location.port}` : '';
      const protocol = window.location.protocol;
      return `${protocol}//${localIp}${port}`;
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
    // Setup mode (remote web, no cookie yet):
    // Use login link with token so middleware can allow access afterwards.
    if (isSetupMode && setupToken?.token) {
      const params = new URLSearchParams({
        token: setupToken.token,
        redirect: '/create'
      });
      router.push(`/auth/login?${params.toString()}`);
      return;
    }

    // Default: go to generation page
    router.push('/create');
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

  const handleRefreshIp = async () => {
    setRefreshingIp(true);
    try {
      const ip = await getLocalIpAddress();
      setLocalIp(ip);
    } catch (error) {
      console.error('Failed to refresh IP:', error);
    } finally {
      setRefreshingIp(false);
    }
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
                title={t('settings.setup.createNow')}
                aria-label={t('settings.setup.createNow')}
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
                    title={t(opt.label)}
                    aria-label={t(opt.label)}
                  >
                    <span>{t(opt.label)}</span>
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSetupStep('welcome')}
                className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                title={t('common.back')}
                aria-label={t('common.back')}
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
                      title={t('settings.tokens.copyToken')}
                      aria-label={t('settings.tokens.copyToken')}
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
                      title={t('settings.tokens.copyLink')}
                      aria-label={t('settings.tokens.copyLink')}
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
                title={t('settings.setup.startUsing')}
                aria-label={t('settings.setup.startUsing')}
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

      {/* Storage Settings Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          {t('settings.storage.title')}
        </h2>

        <div className="p-6 rounded-2xl bg-card border border-border">
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
                readOnly={isDesktopApp()}
                placeholder={t('settings.storage.pathPlaceholder')}
                className={`flex-1 bg-secondary/50 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none text-foreground text-sm font-mono ${isDesktopApp() ? 'cursor-pointer' : ''
                  }`}
                onClick={isDesktopApp() ? handleBrowseStoragePath : undefined}
              />
              <button
                onClick={handleBrowseStoragePath}
                className="px-4 py-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                title={t('settings.storage.browse')}
              >
                <FolderSearch className="w-4 h-4" />
                {t('settings.storage.browse')}
              </button>
              <button
                onClick={handleSaveStoragePath}
                disabled={savingStorage}
                className="px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                title={savingStorage ? t('settings.storage.saving') : t('settings.storage.save')}
                aria-label={savingStorage ? t('settings.storage.saving') : t('settings.storage.save')}
              >
                {savingStorage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('settings.storage.saving')}
                  </>
                ) : (
                  t('settings.storage.save')
                )}
              </button>
            </div>

            {/* Path validation result */}
            {pathValidation && (
              <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 text-sm ${pathValidation.valid
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
        </div>
      </section>

      {/* Remote Access Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {t('settings.remoteAccess.title')}
          </h2>

          {/* Toggle Switch */}
          <button
            onClick={handleToggleRemote}
            className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${remoteEnabled ? 'bg-primary' : 'bg-secondary'
              }`}
            title={t('settings.remoteAccess.enable')}
            aria-label={t('settings.remoteAccess.enable')}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ left: remoteEnabled ? '1.75rem' : '0.25rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        <AnimatePresence>
          {remoteEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Enable Remote Access Card (Description) */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground">{t('settings.remoteAccess.enable')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.remoteAccess.description')}
                  </p>
                </div>

                {/* Status hint */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground font-medium">{t('settings.remoteAccess.enabledHint')}</span>
                      <span className="text-muted-foreground">{getExternalUrl()}</span>
                      <button
                        onClick={handleRefreshIp}
                        disabled={refreshingIp}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title={t('settings.remoteAccess.refreshIp')}
                        aria-label={t('settings.remoteAccess.refreshIp')}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingIp ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Access Tokens Card */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">{t('settings.tokens.title')}</h3>
                  </div>

                  {/* Create Token Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCreateMenu(!showCreateMenu)}
                      disabled={creating}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      title={t('settings.tokens.create')}
                      aria-label={t('settings.tokens.create')}
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
                              title={t(opt.label)}
                              aria-label={t(opt.label)}
                            >
                              {t(opt.label)}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Tokens List */}
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
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${token.isExpired || token.isRevoked
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
                              aria-label={t('settings.tokens.copyToken')}
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
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
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
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Keyboard Shortcuts Section */}
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Key className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              {t('settings.shortcuts.title')}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('settings.shortcuts.desc')}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Quick Generate Shortcut */}
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <kbd className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded-lg shadow-sm">
                  {getShortcutKeyDisplay()}
                </kbd>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('settings.shortcuts.cmdEnter.name')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tr('settings.shortcuts.cmdEnter.desc', { key: getShortcutKeyDisplay() })}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const newEnabled = !shortcutCmdEnterEnabled;
                setShortcutCmdEnterState(newEnabled ? 'enabled' : 'disabled');
                setShortcutCmdEnterEnabledState(newEnabled);
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                shortcutCmdEnterEnabled
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            >
              <motion.div
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
                animate={{
                  left: shortcutCmdEnterEnabled ? '26px' : '4px',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Data Management Section */}
      <DataManagement />

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
                  title={t('settings.storage.migrateNo')}
                  aria-label={t('settings.storage.migrateNo')}
                >
                  {t('settings.storage.migrateNo')}
                </button>
                <button
                  onClick={() => doSaveStoragePath(pendingStoragePath, true)}
                  disabled={savingStorage}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  title={t('settings.storage.migrateYes')}
                  aria-label={t('settings.storage.migrateYes')}
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
                  title={t('common.close')}
                  aria-label={t('common.close')}
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
                      title={t('settings.tokens.copyToken')}
                      aria-label={t('settings.tokens.copyToken')}
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
                      title={t('settings.tokens.copyLink')}
                      aria-label={t('settings.tokens.copyLink')}
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
                        title={t('common.edit')}
                        aria-label={t('common.edit')}
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
                          title={t('common.cancel')}
                          aria-label={t('common.cancel')}
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={handleSaveDescription}
                          disabled={savingDescription}
                          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                          title={savingDescription ? t('common.saving') : t('common.save')}
                          aria-label={savingDescription ? t('common.saving') : t('common.save')}
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
                  title={t('common.delete')}
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                  {t('common.delete')}
                </button>
                <button
                  onClick={() => setSelectedToken(null)}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                  title={t('common.close')}
                  aria-label={t('common.close')}
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
                  title={t('common.cancel')}
                  aria-label={t('common.cancel')}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleDeleteToken(showDeleteConfirm)}
                  className="px-4 py-2 bg-destructive text-white rounded-lg font-medium hover:bg-destructive/90 transition-colors"
                  title={t('common.delete')}
                  aria-label={t('common.delete')}
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
          // Web 模式：从自带浏览器选择后也自动校验
          void applyStoragePath(path);
        }}
        initialPath={storagePathInput || undefined}
      />
    </div>
  );
}

// 使用 Suspense 包裹以支持 useSearchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

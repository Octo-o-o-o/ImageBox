'use client';

import { useState, useEffect } from 'react';
import { BaseModal } from '@/components/ui/BaseModal';
import { Folder, Key, ArrowRight, CheckCircle2, ChevronRight, Settings2, Globe, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { saveProvider, updateStoragePath } from '@/app/actions';
import { PRESET_PROVIDERS, type PresetProvider } from '@/lib/presetProviders';
import { useLanguage } from '@/components/LanguageProvider';
import { replaceTemplate } from '@/lib/i18n';

const STORAGE_KEY_SETUP = 'imagebox_setup_completed';
const STORAGE_KEY_PATH = 'imagebox_storage_path';
const STORAGE_KEY_API = 'imagebox_api_key';
const STORAGE_KEY_PROVIDER = 'imagebox_provider_id';

export function SetupWizard() {
    const { t } = useLanguage();
    const tr = (key: string, vars?: Record<string, string | number>) => vars ? replaceTemplate(t(key), vars) : t(key);
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [storagePath, setStoragePath] = useState('');
    const [selectedProviderId, setSelectedProviderId] = useState<string>(PRESET_PROVIDERS[0]?.id || '');
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadDefaultsAndOpen = async () => {
        try {
            if (window.electronAPI?.getDefaultPaths) {
                const paths = await window.electronAPI.getDefaultPaths();
                setStoragePath(paths.documents);
            } else {
                // Fallback for web development
                setStoragePath('/Users/guest/Documents/ImageBox');
            }
        } catch (e) {
            console.error('Failed to load default paths', e);
        } finally {
            setIsLoading(false);
            setIsOpen(true);
        }
    };

    // Check initialization status
    useEffect(() => {
        // Remote web initial security setup uses /settings?setup=true.
        // During that flow, we must NOT show the SetupWizard modal.
        try {
            const params = new URLSearchParams(window.location.search);
            const isRemoteSecuritySetup = window.location.pathname.startsWith('/settings') && params.get('setup') === 'true';
            if (isRemoteSecuritySetup) return;
        } catch {
            // ignore
        }

        const isSetup = localStorage.getItem(STORAGE_KEY_SETUP);
        if (!isSetup) {
            void loadDefaultsAndOpen();
        }
    }, []);

    // Allow other parts of the app (e.g. "reset all data") to re-open the wizard without hard refresh.
    useEffect(() => {
        const handler = () => {
            try {
                const isSetup = localStorage.getItem(STORAGE_KEY_SETUP);
                if (isSetup) return;
                setIsLoading(true);
                void loadDefaultsAndOpen();
            } catch (e) {
                console.error('Failed to re-open SetupWizard', e);
            }
        };

        window.addEventListener('imagebox:open-setupwizard', handler as EventListener);
        return () => window.removeEventListener('imagebox:open-setupwizard', handler as EventListener);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelectFolder = async () => {
        if (!window.electronAPI?.selectFolder) return;
        try {
            const path = await window.electronAPI.selectFolder();
            if (path) {
                setStoragePath(path);
            }
        } catch (error) {
            console.error('Failed to select folder:', error);
        }
    };

    const handleFinish = async () => {
        // Keep existing UX: instant close + reload. Only the provider OPTIONS are changed.
        localStorage.setItem(STORAGE_KEY_PATH, storagePath);
        localStorage.setItem(STORAGE_KEY_PROVIDER, selectedProviderId);
        localStorage.setItem(STORAGE_KEY_API, apiKey);
        localStorage.setItem(STORAGE_KEY_SETUP, 'true');
        setIsOpen(false);

        // Persist to DB silently (no UI/interaction changes)
        try {
            const preset: PresetProvider | undefined = PRESET_PROVIDERS.find(p => p.id === selectedProviderId);
            if (preset) {
                await Promise.allSettled([
                    storagePath ? updateStoragePath(storagePath, { migrate: false }) : Promise.resolve(null),
                    saveProvider({
                        id: preset.id,
                        name: preset.name,
                        type: preset.type,
                        baseUrl: preset.baseUrl,
                        apiKey,
                    }),
                ]);
            }
        } catch (e) {
            console.error('Setup wizard persistence failed:', e);
        }

        // Notify create page to refresh models and folders data
        window.dispatchEvent(new CustomEvent('imagebox:config-changed'));

        router.push('/create');
        router.refresh();
    };

    const handleSkip = () => {
        // Just mark as setup but don't save any specific configs usually?
        // User requested "Skip". I'll save the fact they skipped so it doesn't pop up again.
        // They can configure later.
        localStorage.setItem(STORAGE_KEY_SETUP, 'true');
        setIsOpen(false);
        router.push('/create');
        router.refresh();
    };

    const openProviderUrl = async (url: string) => {
        if (window.electronAPI?.openExternal) {
            await window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
    };

    const selectedProvider = PRESET_PROVIDERS.find(p => p.id === selectedProviderId) || PRESET_PROVIDERS[0];

    // Localized description for provider section
    const providerDescKeyMap: Record<string, string> = {
        'preset-google-gemini': 'setup.provider.desc.gemini',
        'preset-openrouter': 'setup.provider.desc.openrouter',
        'preset-grsai': 'setup.provider.desc.grsai',
    };
    const providerDescKey = selectedProvider ? providerDescKeyMap[selectedProvider.id] : undefined;
    const providerDescription = providerDescKey ? t(providerDescKey) : (selectedProvider?.description || '');

    if (!isOpen) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={() => { }}
            showCloseButton={false}
            closeOnBackdrop={false}
            closeOnEscape={false}
            maxWidth="max-w-2xl"
            zIndex="z-[100]" // Highest z-index to cover sidebar
        >
            <div className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-500 shadow-sm">
                        <Settings2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{tr('setup.wizard.title')}</h2>
                    <p className="text-gray-500">{tr('setup.wizard.subtitle')}</p>
                </div>

                {/* Content */}
                <div className="space-y-6">

                    {/* Storage Location */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Folder size={16} className="text-orange-500" />
                            {tr('setup.storage.label')}
                        </label>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4 transition-colors">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400 mb-1">{tr('setup.storage.filesWillBeSavedTo')}</p>
                                <p className="text-sm font-medium text-gray-700 truncate font-mono" title={storagePath}>
                                    {storagePath || tr('library.loading')}
                                </p>
                            </div>
                            <button
                                onClick={handleSelectFolder}
                                className="shrink-0 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-xs font-semibold text-gray-700 hover:text-orange-600 hover:border-orange-200 transition-all active:scale-95"
                            >
                                {tr('setup.storage.modify')}
                            </button>
                        </div>
                    </div>

                    {/* API Key Configuration */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Key size={16} className="text-orange-500" />
                            {tr('setup.provider.title')}
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Provider Selection */}
                            <div className="relative group">
                                <select
                                    value={selectedProviderId}
                                    onChange={(e) => setSelectedProviderId(e.target.value)}
                                    className="w-full appearance-none px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 shadow-sm transition-all pr-10 font-medium text-gray-700"
                                >
                                    {PRESET_PROVIDERS.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ChevronRight size={16} className="rotate-90" />
                                </div>
                            </div>

                            {/* API Key Input */}
                            <div className="relative">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={tr('setup.api.placeholder', { provider: selectedProvider?.name || 'Provider' })}
                                    className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 shadow-sm transition-all pr-10 font-mono"
                                />
                                {apiKey && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                                        <CheckCircle2 size={18} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Provider Info & Get Key Link */}
                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs text-gray-400">
                                {providerDescription}
                            </p>
                            <button
                                onClick={() => selectedProvider?.apiKeyApplyUrl && openProviderUrl(selectedProvider.apiKeyApplyUrl)}
                                className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                            >
                                <ExternalLink size={12} />
                                {tr('setup.api.getKey', { provider: selectedProvider?.name || '' })}
                            </button>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="pt-2 flex flex-col gap-3">
                    <button
                        onClick={handleFinish}
                        disabled={!apiKey}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-bold shadow-lg shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {tr('setup.cta.getStarted')}
                        <ArrowRight size={20} />
                    </button>

                    <button
                        onClick={handleSkip}
                        className="w-full text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors py-2"
                    >
                        {tr('setup.cta.skipForNow')}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
}

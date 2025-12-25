'use client';

import { useState, useEffect } from 'react';
import { BaseModal } from '@/components/ui/BaseModal';
import { Folder, Key, ArrowRight, CheckCircle2, ChevronRight, Settings2, ExternalLink, CheckSquare, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { activatePresetProvider, updateStoragePath, getTemplates, updateTemplate } from '@/app/actions';
import { PRESET_PROVIDERS, PRESET_MODELS, type PresetProvider } from '@/lib/presetProviders';
import { useLanguage } from '@/components/LanguageProvider';
import { replaceTemplate } from '@/lib/i18n';

const STORAGE_KEY_SETUP = 'imagebox_setup_completed';
const STORAGE_KEY_PATH = 'imagebox_storage_path';
const STORAGE_KEY_API = 'imagebox_api_key';
const STORAGE_KEY_PROVIDER = 'imagebox_provider_id';
const STORAGE_KEY_PROMPT_PROVIDER = 'imagebox_prompt_provider_id';
const STORAGE_KEY_PROMPT_API = 'imagebox_prompt_api_key';

export function SetupWizard() {
    const { t } = useLanguage();
    const tr = (key: string, vars?: Record<string, string | number>) => vars ? replaceTemplate(t(key), vars) : t(key);
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [storagePath, setStoragePath] = useState('');

    // Filter providers based on available models
    // Image providers: only show providers that have at least one IMAGE model
    const imageProviders = PRESET_PROVIDERS.filter(provider =>
        PRESET_MODELS.some(model => model.providerId === provider.id && model.type === 'IMAGE')
    );
    // Text providers: only show providers that have at least one TEXT model
    const textProviders = PRESET_PROVIDERS.filter(provider =>
        PRESET_MODELS.some(model => model.providerId === provider.id && model.type === 'TEXT')
    );

    // Image Provider State (Required)
    const [imageProviderId, setImageProviderId] = useState<string>(imageProviders[0]?.id || '');
    const [imageApiKey, setImageApiKey] = useState('');

    // Prompt Provider State (Optional)
    const [sameProvider, setSameProvider] = useState(true);
    const [promptProviderId, setPromptProviderId] = useState<string>(textProviders[0]?.id || '');
    const [promptApiKey, setPromptApiKey] = useState('');

    const loadDefaultsAndOpen = async () => {
        try {
            if (window.electronAPI?.getDefaultPaths) {
                const paths = await window.electronAPI.getDefaultPaths();
                const separator = paths.documents.includes('\\') ? '\\' : '/';
                setStoragePath(`${paths.documents}${separator}ImageBox`);
            } else {
                // Fallback for web development
                setStoragePath('/Users/guest/Documents/ImageBox');
            }
        } catch (e) {
            console.error('Failed to load default paths', e);
        } finally {
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

        let isSetup: string | null = null;
        try {
            isSetup = localStorage.getItem(STORAGE_KEY_SETUP);
        } catch (e) {
            console.warn('Failed to read setup state from localStorage:', e);
        }
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
        const effectivePromptProviderId = sameProvider ? imageProviderId : promptProviderId;
        const effectivePromptApiKey = sameProvider ? imageApiKey : promptApiKey;

        // Save to localStorage (best-effort; must NOT block UI)
        try {
            localStorage.setItem(STORAGE_KEY_PATH, storagePath);
            localStorage.setItem(STORAGE_KEY_PROVIDER, imageProviderId);
            localStorage.setItem(STORAGE_KEY_API, imageApiKey);
            localStorage.setItem(STORAGE_KEY_PROMPT_PROVIDER, effectivePromptProviderId);
            localStorage.setItem(STORAGE_KEY_PROMPT_API, effectivePromptApiKey);
            localStorage.setItem(STORAGE_KEY_SETUP, 'true');
        } catch (e) {
            console.warn('Failed to persist setup wizard config to localStorage:', e);
        }

        setIsOpen(false);

        // Persist to DB silently
        try {
            const promises: Promise<unknown>[] = [];

            // 1. Save Path
            if (storagePath) {
                promises.push(updateStoragePath(storagePath, { migrate: false }));
            }

            // 2. Activate Image Provider (creates provider + all preset models)
            const imagePreset = PRESET_PROVIDERS.find(p => p.id === imageProviderId);
            if (imagePreset) {
                promises.push(activatePresetProvider(
                    imagePreset.id,
                    imageApiKey,
                    // undefined = all preset models for this provider
                ));
            }

            // 3. Activate Prompt Provider if different
            // If same provider ID, we already activated it above.
            // If different provider ID, activate it.
            if (!sameProvider && promptProviderId !== imageProviderId) {
                const promptPreset = PRESET_PROVIDERS.find(p => p.id === promptProviderId);
                if (promptPreset) {
                    promises.push(activatePresetProvider(
                        promptPreset.id,
                        promptApiKey,
                        // undefined = all preset models for this provider
                    ));
                }
            }

            await Promise.allSettled(promises);

            // 4. Auto-select first text model for Universal Optimizer
            try {
                const effectivePromptProviderId = sameProvider ? imageProviderId : promptProviderId;
                // Find first TEXT model for this provider
                const textModel = PRESET_MODELS.find(m => m.providerId === effectivePromptProviderId && m.type === 'TEXT');

                if (textModel) {
                    const templates = await getTemplates();
                    const optimizer = templates.find(t => t.name === 'Universal Optimizer');
                    if (optimizer) {
                        await updateTemplate(optimizer.id, {
                            name: optimizer.name,
                            promptTemplate: optimizer.promptTemplate,
                            systemPrompt: optimizer.systemPrompt || undefined,
                            promptGeneratorId: textModel.id
                        });
                    }
                }
            } catch (e) {
                console.warn('Failed to auto-configure prompt template:', e);
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
        try {
            localStorage.setItem(STORAGE_KEY_SETUP, 'true');
        } catch (e) {
            console.warn('Failed to save setup skipped flag to localStorage:', e);
        }
        setIsOpen(false);
        router.push('/create');
        router.refresh();
    };

    const openProviderUrl = async (url: string) => {
        if (window.electronAPI?.openExternal) {
            try {
                await window.electronAPI.openExternal(url);
            } catch (e) {
                console.warn('Failed to open external url via Electron:', e);
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const selectedImageProvider = PRESET_PROVIDERS.find(p => p.id === imageProviderId) || PRESET_PROVIDERS[0];
    const selectedPromptProvider = PRESET_PROVIDERS.find(p => p.id === promptProviderId) || PRESET_PROVIDERS[0];

    // Helper to get description
    const getProviderDesc = (provider: PresetProvider | undefined) => {
        if (!provider) return '';
        if (provider.descriptionKey) return t(provider.descriptionKey);
        const providerDescKeyMap: Record<string, string> = {
            'preset-google-gemini': 'setup.provider.desc.gemini',
            'preset-openrouter': 'setup.provider.desc.openrouter',
            'preset-grsai': 'setup.provider.desc.grsai',
            'preset-ark': 'setup.provider.desc.ark',
        };
        const key = providerDescKeyMap[provider.id];
        return key ? t(key) : (provider.description || '');
    };

    if (!isOpen) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={() => { }}
            showCloseButton={false}
            closeOnBackdrop={false}
            closeOnEscape={false}
            maxWidth="max-w-2xl"
            zIndex="z-[100]"
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
                <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1">

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

                    <div className="w-full h-px bg-gray-100 my-2" />

                    {/* Image Provider (Required) */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Key size={16} className="text-orange-500" />
                            {tr('setup.provider.image.title')}
                            <span className="text-orange-500 text-xs font-normal ml-auto">* Required</span>
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative group">
                                <select
                                    value={imageProviderId}
                                    onChange={(e) => setImageProviderId(e.target.value)}
                                    className="w-full appearance-none px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 shadow-sm transition-all pr-10 font-medium text-gray-700"
                                >
                                    {imageProviders.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ChevronRight size={16} className="rotate-90" />
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={imageApiKey}
                                    onChange={(e) => setImageApiKey(e.target.value)}
                                    placeholder={tr('setup.api.placeholder', { provider: selectedImageProvider?.name || 'Provider' })}
                                    className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 shadow-sm transition-all pr-10 font-mono"
                                />
                                {imageApiKey && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                                        <CheckCircle2 size={18} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs text-gray-400 line-clamp-1">{getProviderDesc(selectedImageProvider)}</p>
                            <button
                                onClick={() => selectedImageProvider?.apiKeyApplyUrl && openProviderUrl(selectedImageProvider.apiKeyApplyUrl)}
                                className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline shrink-0"
                            >
                                <ExternalLink size={12} />
                                {tr('setup.api.getKey', { provider: selectedImageProvider?.name || '' })}
                            </button>
                        </div>
                    </div>

                    {/* Prompt Provider (Optional) */}
                    <div className="space-y-3 pt-2">
                        <label className="text-sm font-bold text-gray-900 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Key size={16} className="text-gray-400" />
                                <span>
                                    {tr('setup.provider.prompt.title')}
                                    <span className="text-gray-400 font-normal ml-1">{tr('setup.provider.prompt.optional')}</span>
                                </span>
                            </div>
                        </label>

                        {/* Toggle Checkbox */}
                        <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => setSameProvider(!sameProvider)}
                        >
                            {sameProvider ? (
                                <CheckSquare size={18} className="text-orange-500" />
                            ) : (
                                <Square size={18} className="text-gray-300 group-hover:text-gray-400" />
                            )}
                            <span className="text-sm text-gray-600 select-none group-hover:text-gray-800">
                                {tr('setup.provider.prompt.sameAsImage')}
                            </span>
                        </div>

                        {/* Separate Config */}
                        {!sameProvider && (
                            <div className="space-y-3 pl-0 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative group">
                                        <select
                                            value={promptProviderId}
                                            onChange={(e) => setPromptProviderId(e.target.value)}
                                            className="w-full appearance-none px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 shadow-sm transition-all pr-10 font-medium text-gray-700"
                                        >
                                            {textProviders.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronRight size={16} className="rotate-90" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={promptApiKey}
                                            onChange={(e) => setPromptApiKey(e.target.value)}
                                            placeholder={tr('setup.api.placeholder', { provider: selectedPromptProvider?.name || 'Provider' })}
                                            className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 shadow-sm transition-all pr-10 font-mono"
                                        />
                                        {promptApiKey && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                                                <CheckCircle2 size={18} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-xs text-gray-400 line-clamp-1">{getProviderDesc(selectedPromptProvider)}</p>
                                    <button
                                        onClick={() => selectedPromptProvider?.apiKeyApplyUrl && openProviderUrl(selectedPromptProvider.apiKeyApplyUrl)}
                                        className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline shrink-0"
                                    >
                                        <ExternalLink size={12} />
                                        {tr('setup.api.getKey', { provider: selectedPromptProvider?.name || '' })}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="pt-2 flex flex-col gap-3">
                    <button
                        onClick={handleFinish}
                        disabled={!imageApiKey}
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

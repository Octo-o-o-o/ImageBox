'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Server, HardDrive, Plus, X, Key, ExternalLink,
    Check, ChevronLeft, Loader2, CheckSquare, Square
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import {
    getAvailablePresetProviders,
    getPresetModelsForProvider,
    activatePresetProvider
} from '@/app/actions';
import { PRESET_PROVIDERS, type PresetProvider, type PresetModel } from '@/lib/presetProviders';

type ProviderMode = 'list' | 'configure';

interface AddProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    // For custom/local provider editing - passed through
    onOpenCustomModal: (type?: string) => void;
}

export function AddProviderModal({
    isOpen,
    onClose,
    onSuccess,
    onOpenCustomModal
}: AddProviderModalProps) {
    const { t } = useLanguage();

    // State
    const [mode, setMode] = useState<ProviderMode>('list');
    const [availablePresets, setAvailablePresets] = useState<PresetProvider[]>([]);
    const [allPresets] = useState<PresetProvider[]>(PRESET_PROVIDERS);
    const [selectedPreset, setSelectedPreset] = useState<PresetProvider | null>(null);
    const [presetModels, setPresetModels] = useState<PresetModel[]>([]);
    const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Load available presets
    useEffect(() => {
        if (isOpen) {
            loadAvailablePresets();
        }
    }, [isOpen]);

    // Load models when preset is selected
    useEffect(() => {
        if (selectedPreset) {
            loadPresetModels(selectedPreset.id);
        }
    }, [selectedPreset]);

    const loadAvailablePresets = async () => {
        setLoading(true);
        try {
            const available = await getAvailablePresetProviders();
            setAvailablePresets(available);
        } catch (e) {
            console.error('Failed to load available presets:', e);
        }
        setLoading(false);
    };

    const loadPresetModels = async (providerId: string) => {
        try {
            const models = await getPresetModelsForProvider(providerId);
            setPresetModels(models);
            // Default: select all IMAGE models
            const defaultSelected = new Set(
                models.filter(m => m.type === 'IMAGE').map(m => m.id)
            );
            setSelectedModelIds(defaultSelected);
        } catch (e) {
            console.error('Failed to load preset models:', e);
        }
    };

    const handleSelectPreset = (preset: PresetProvider) => {
        setSelectedPreset(preset);
        setApiKey('');
        setMode('configure');
    };

    const toggleModelSelection = (modelId: string) => {
        setSelectedModelIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(modelId)) {
                newSet.delete(modelId);
            } else {
                newSet.add(modelId);
            }
            return newSet;
        });
    };

    const selectAllModels = () => {
        setSelectedModelIds(new Set(presetModels.map(m => m.id)));
    };

    const deselectAllModels = () => {
        setSelectedModelIds(new Set());
    };

    const handleActivatePreset = async () => {
        if (!selectedPreset || !apiKey.trim()) return;

        setSubmitting(true);
        try {
            const result = await activatePresetProvider(
                selectedPreset.id,
                apiKey.trim(),
                Array.from(selectedModelIds)
            );

            if (result.success) {
                onSuccess();
                handleClose();
            } else {
                console.error('Activation failed:', result.error);
                // TODO: Show error toast
            }
        } catch (e) {
            console.error('Failed to activate preset:', e);
        }
        setSubmitting(false);
    };

    const handleClose = () => {
        setMode('list');
        setSelectedPreset(null);
        setPresetModels([]);
        setSelectedModelIds(new Set());
        setApiKey('');
        onClose();
    };

    const handleBack = () => {
        setMode('list');
        setSelectedPreset(null);
        setPresetModels([]);
        setSelectedModelIds(new Set());
        setApiKey('');
    };

    const handleCustomProvider = () => {
        handleClose();
        onOpenCustomModal('OPENAI');
    };

    const handleLocalProvider = () => {
        handleClose();
        onOpenCustomModal('LOCAL');
    };

    const openExternalUrl = (url: string) => {
        if (window.electronAPI?.openExternal) {
            window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
    };

    // Check if a preset is already activated
    const isPresetActivated = (presetId: string) => {
        return !availablePresets.some(p => p.id === presetId);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    {/* Back button for configure mode */}
                    {mode === 'configure' ? (
                        <button
                            onClick={handleBack}
                            className="p-2 -ml-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="w-9" /> /* Spacer for alignment */
                    )}
                    <h2 className="text-lg font-bold text-popover-foreground">
                        {mode === 'list' && (t('models.addProvider.title') || '新增服务商')}
                        {mode === 'configure' && (t('models.addProvider.configurePreset') || '配置服务商')}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {/* Provider List */}
                        {mode === 'list' && (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-3"
                            >
                                {/* Custom Remote Provider */}
                                <button
                                    onClick={handleCustomProvider}
                                    className="w-full p-4 bg-card border border-border rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group text-left"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-card-foreground group-hover:text-blue-500 transition-colors">
                                                {t('models.addProvider.customOption') || '手动添加'}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('models.addProvider.customDesc') || '完全自定义服务商配置'}
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                {/* Local Provider */}
                                <button
                                    onClick={handleLocalProvider}
                                    className="w-full p-4 bg-card border border-border rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group text-left"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                                            <HardDrive className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-card-foreground group-hover:text-emerald-500 transition-colors">
                                                {t('models.addProvider.localOption') || '本地服务'}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('models.addProvider.localDesc') || '连接本地推理服务 (ComfyUI, stable-diffusion.cpp)'}
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                {/* Divider with label */}
                                <div className="flex items-center gap-3 py-2">
                                    <div className="flex-1 h-px bg-border" />
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {t('models.addProvider.presetOption') || '内置服务商'}
                                    </span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>

                                {/* Preset Providers List */}
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {allPresets.map(preset => {
                                            const isActivated = isPresetActivated(preset.id);
                                            return (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => !isActivated && handleSelectPreset(preset)}
                                                    disabled={isActivated}
                                                    className={`w-full p-4 rounded-xl border text-left transition-all ${isActivated
                                                        ? 'border-border bg-secondary/30 opacity-60 cursor-not-allowed'
                                                        : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5'
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`p-2 rounded-lg ${isActivated ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                            <Server className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold text-card-foreground text-sm">
                                                                    {preset.name}
                                                                </h3>
                                                                {isActivated && (
                                                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded">
                                                                        {t('models.addProvider.alreadyAdded') || '已添加'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                                {preset.description}
                                                            </p>
                                                        </div>
                                                        {isActivated ? (
                                                            <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                                                        ) : (
                                                            <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180 shrink-0" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Preset Configuration */}
                        {mode === 'configure' && selectedPreset && (
                            <motion.div
                                key="configure"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                {/* Selected Provider Info */}
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                    <h3 className="font-semibold text-foreground">{selectedPreset.name}</h3>
                                    <p className="text-xs text-muted-foreground mt-1">{selectedPreset.description}</p>
                                </div>

                                {/* API Key Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-2">
                                        <Key className="w-3 h-3" />
                                        API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={t('models.addProvider.apiKeyPlaceholder') || '输入 API Key'}
                                        className="w-full bg-secondary/50 border border-border rounded-lg p-3 text-sm text-foreground outline-none focus:border-primary/50 font-mono"
                                    />
                                    {selectedPreset.apiKeyApplyUrl && (
                                        <button
                                            onClick={() => openExternalUrl(selectedPreset.apiKeyApplyUrl!)}
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            {t('models.addProvider.getApiKey') || '获取 API Key'}
                                        </button>
                                    )}
                                </div>

                                {/* Model Selection */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-muted-foreground uppercase font-semibold">
                                            {t('models.addProvider.selectModels') || '选择模型'}
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={selectAllModels}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                {t('models.addProvider.selectAll') || '全选'}
                                            </button>
                                            <span className="text-muted-foreground">|</span>
                                            <button
                                                onClick={deselectAllModels}
                                                className="text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                {t('models.addProvider.deselectAll') || '全不选'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-secondary/30 rounded-lg border border-border">
                                        {presetModels.map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => toggleModelSelection(model.id)}
                                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                                            >
                                                {selectedModelIds.has(model.id) ? (
                                                    <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm text-foreground">{model.name}</span>
                                                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                                                        {model.modelIdentifier}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${model.type === 'IMAGE'
                                                    ? 'bg-pink-500/10 text-pink-500'
                                                    : 'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {model.type}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer - only show when configuring preset */}
                {mode === 'configure' && selectedPreset && (
                    <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm"
                        >
                            {t('models.providers.cancel') || '取消'}
                        </button>
                        <button
                            onClick={handleActivatePreset}
                            disabled={!apiKey.trim() || selectedModelIds.size === 0 || submitting}
                            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('models.addProvider.activate') || '添加服务商'}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

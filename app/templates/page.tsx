'use client';
import { getTemplates, createTemplate, deleteTemplate, updateTemplate, toggleTemplateEnabled, getModels } from '@/app/actions';
import { useState, useEffect } from 'react';
import { Plus, Trash2, LayoutTemplate, X, Save, FileText, Pencil, AlertTriangle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/LanguageProvider';
import { ConfirmDialog } from '@/components/ui';
import Link from 'next/link';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [models, setModels] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [promptTemplate, setPromptTemplate] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [selectedPromptModel, setSelectedPromptModel] = useState('');
    const [isEnabled, setIsEnabled] = useState(true);

    // Track initial state for change detection
    const [initialFormState, setInitialFormState] = useState<any>(null);

    // Track validation errors
    const [promptModelError, setPromptModelError] = useState(false);

    const { t } = useLanguage();

    const load = () => {
        getTemplates().then(setTemplates);
        getModels().then(setModels);
    }

    useEffect(() => {
        load();
    }, []);

    // Check if form has unsaved changes
    const hasUnsavedChanges = () => {
        if (!initialFormState) return false;
        return (
            name !== initialFormState.name ||
            promptTemplate !== initialFormState.promptTemplate ||
            systemPrompt !== initialFormState.systemPrompt ||
            selectedPromptModel !== initialFormState.selectedPromptModel ||
            isEnabled !== initialFormState.isEnabled
        );
    };

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isCreating && !hasUnsavedChanges()) {
                setIsCreating(false);
                resetForm();
            }
        };

        if (isCreating) {
            document.addEventListener('keydown', handleEsc);
            return () => document.removeEventListener('keydown', handleEsc);
        }
    }, [isCreating, hasUnsavedChanges]);

    const handleSave = async () => {
        if (!name || !promptTemplate) return;

        // Validate that a prompt model is selected
        if (!selectedPromptModel) {
            setPromptModelError(true);
            return;
        }

        const data = {
            name,
            promptTemplate,
            systemPrompt,
            promptGeneratorId: selectedPromptModel || undefined,
            isEnabled,
        };

        if (editingId) {
            await updateTemplate(editingId, data);
        } else {
            await createTemplate(data);
        }

        setIsCreating(false);
        resetForm();
        load();
    };

    const handleEdit = (template: any) => {
        setEditingId(template.id);
        setName(template.name);
        setPromptTemplate(template.promptTemplate);
        setSystemPrompt(template.systemPrompt || '');
        setSelectedPromptModel(template.promptGeneratorId || '');
        setIsEnabled(template.isEnabled ?? true);

        // Store initial state for change detection
        setInitialFormState({
            name: template.name,
            promptTemplate: template.promptTemplate,
            systemPrompt: template.systemPrompt || '',
            selectedPromptModel: template.promptGeneratorId || '',
            isEnabled: template.isEnabled ?? true,
        });

        setIsCreating(true);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await deleteTemplate(deleteId);
            setDeleteId(null);
            load();
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setPromptTemplate('');
        setSystemPrompt('');
        setSelectedPromptModel('');
        setIsEnabled(true);
        setInitialFormState(null);
        setPromptModelError(false);
    }

    const handleModalClose = () => {
        // Only allow closing if no unsaved changes
        if (!hasUnsavedChanges()) {
            setIsCreating(false);
            resetForm();
        }
    };

    const handleToggleEnabled = async (templateId: string, currentState: boolean) => {
        await toggleTemplateEnabled(templateId, !currentState);
        load();
    };

    const promptModels = models.filter(m => m.type === 'TEXT');

    return (
        <div className="space-y-8 relative">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
                    <LayoutTemplate className="text-primary" />
                    {t('templates.title')}
                </h1>
                <button
                    onClick={() => {
                        resetForm();
                        setIsCreating(true);
                    }}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    title={t('templates.createButton')}
                    aria-label={t('templates.createButton')}
                >
                    <Plus className="w-4 h-4" />
                    {t('templates.createButton')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map((template, i) => (
                    <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`group p-6 rounded-2xl bg-card border transition-all hover:shadow-lg relative flex flex-col ${
                            template.isEnabled
                                ? 'border-border hover:border-primary/30'
                                : 'border-border/50 opacity-60'
                        }`}
                    >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-secondary rounded-xl">
                                    <LayoutTemplate className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex gap-2 items-center">
                                    {/* Model Configuration Status or Enable/Disable Switch */}
                                    {!template.promptGeneratorId ? (
                                        <div
                                            className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400 font-medium cursor-pointer hover:bg-amber-500/20 transition-colors"
                                            onClick={() => handleEdit(template)}
                                            title={t('templates.card.configureTooltip')}
                                        >
                                            {t('templates.card.notConfigured')}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleToggleEnabled(template.id, template.isEnabled)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                template.isEnabled ? 'bg-primary' : 'bg-muted'
                                            }`}
                                            title={template.isEnabled ? t('templates.enabledLabel') : t('templates.disabledLabel')}
                                        >
                                            <span
                                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                    template.isEnabled ? 'translate-x-5' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                                        title={t('common.edit')}
                                        aria-label={t('common.edit')}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteId(template.id)}
                                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                        title={t('common.delete')}
                                        aria-label={t('common.delete')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold mb-2 text-card-foreground">{template.name}</h3>
                            {!template.isEnabled && (
                                <span className="text-xs text-muted-foreground mb-2">{t('templates.disabledLabel')}</span>
                            )}
                            <div className="flex-1">
                             <div className="text-sm text-muted-foreground font-mono mb-4">
                                {template.systemPrompt && (
                                  <p className="line-clamp-2 mb-2">
                                    <span className="text-primary font-semibold">System:</span> {template.systemPrompt}
                                  </p>
                                )}
                                <p className={template.systemPrompt ? "line-clamp-2" : "line-clamp-3"}>
                                  <span className="text-primary font-semibold">Prompt:</span> {template.promptTemplate}
                                </p>
                            </div>
                            </div>
                        </motion.div>
                ))}
            </div>

            {/* Config Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={handleModalClose}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl bg-popover border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <h2 className="text-xl font-bold text-popover-foreground">{editingId ? t('templates.editTemplateTitle') : t('templates.newTemplateTitle')}</h2>
                                <button
                                  onClick={handleModalClose}
                                  title={t('common.close')}
                                  aria-label={t('common.close')}
                                >
                                  <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">{t('templates.nameLabel')}</label>
                                    <input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full bg-secondary/50 border border-border rounded-lg p-3 mt-1 focus:ring-2 focus:ring-primary/50 outline-none text-foreground"
                                        placeholder={t('templates.namePlaceholder')}
                                    />
                                </div>

                                {/* Enable/Disable Toggle in Modal */}
                                <div className="flex items-center gap-3">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">{t('templates.enabledLabel')}</label>
                                    <button
                                        onClick={() => setIsEnabled(!isEnabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            isEnabled ? 'bg-primary' : 'bg-muted'
                                        }`}
                                        title={isEnabled ? t('templates.enabledLabel') : t('templates.disabledLabel')}
                                        aria-label={isEnabled ? t('templates.enabledLabel') : t('templates.disabledLabel')}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                isEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                    <span className="text-sm text-muted-foreground">
                                        {isEnabled ? t('templates.enabledLabel') : t('templates.disabledLabel')}
                                    </span>
                                </div>

                                <div className="space-y-4 p-4 rounded-xl bg-secondary/20 border border-border">
                                    <h3 className="font-semibold text-primary flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> {t('templates.promptSectionTitle')}
                                    </h3>

                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Model</label>
                                        <select
                                            value={selectedPromptModel}
                                            onChange={e => {
                                                setSelectedPromptModel(e.target.value);
                                                setPromptModelError(false); // Clear error when user selects
                                            }}
                                            className={`w-full bg-secondary/50 border rounded-lg p-2 mt-1 text-sm outline-none text-foreground ${
                                                promptModelError ? 'border-red-500' : 'border-border'
                                            }`}
                                        >
                                            <option value="">Select a model...</option>
                                            {promptModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                        {promptModelError && (
                                            <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Please select a model
                                            </p>
                                        )}
                                        {!promptModelError && (
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {t('templates.promptModelHelper')}
                                            </p>
                                        )}
                                        {promptModels.length === 0 && (
                                            <Link
                                                href="/models"
                                                className="mt-2 flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                No models available. Go to Models page to configure
                                            </Link>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">{t('templates.promptTemplateLabel')}</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setPromptTemplate(prev => prev + ' {{user_input}}')}
                                                    className="text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 rounded border border-primary/20 transition-colors"
                                                >
                                                    {t('templates.insertUserInput')}
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            value={promptTemplate}
                                            onChange={e => setPromptTemplate(e.target.value)}
                                            className="w-full h-32 bg-secondary/50 border border-border rounded-lg p-3 mt-1 focus:ring-2 focus:ring-primary/50 outline-none font-mono text-sm text-foreground"
                                            placeholder={t('templates.promptTemplatePlaceholder')}
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {t('templates.promptTemplateHelper')}
                                        </p>
                                    </div>

                                     <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">{t('templates.systemPromptLabel')}</label>
                                        </div>
                                        <textarea
                                            value={systemPrompt}
                                            onChange={e => setSystemPrompt(e.target.value)}
                                            className="w-full h-24 bg-secondary/50 border border-border rounded-lg p-3 text-sm outline-none text-foreground resize-none"
                                            placeholder={t('templates.systemPromptPlaceholder')}
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {t('templates.systemPromptHelper')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Bottom Buttons */}
                            <div className="sticky bottom-0 bg-popover border-t border-border p-4">
                                {hasUnsavedChanges() && (
                                    <div className="flex items-center gap-2 text-xs text-amber-500 mb-3">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>{t('templates.unsavedChanges')}</span>
                                    </div>
                                )}
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setIsCreating(false);
                                            resetForm();
                                        }}
                                        className="px-4 py-2 text-muted-foreground hover:text-foreground"
                                    >
                                        {t('templates.cancel')}
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={!name || !promptTemplate}
                                        className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium disabled:opacity-50 transition-colors"
                                    >
                                        {editingId ? t('templates.saveChanges') : t('templates.createTemplate')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title={t('templates.deleteConfirmTitle')}
                message={t('templates.deleteConfirmDesc')}
                confirmLabel={t('templates.delete')}
                cancelLabel={t('templates.cancel')}
                variant="danger"
                icon={AlertTriangle}
            />
        </div>
    );
}

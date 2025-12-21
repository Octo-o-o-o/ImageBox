'use client';
import { getTemplates, createTemplate, deleteTemplate, updateTemplate, getModels } from '@/app/actions';
import { useState, useEffect } from 'react';
import { Plus, Trash2, LayoutTemplate, X, Save, FileText, Image as ImageIcon, Pencil, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/LanguageProvider';
import { ConfirmDialog } from '@/components/ui';

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
    const [selectedImageModel, setSelectedImageModel] = useState('');
    
    // Default Parameters
    const [defaultAspectRatio, setDefaultAspectRatio] = useState('');
    const [defaultResolution, setDefaultResolution] = useState('');
    
    const { t } = useLanguage();

    const load = () => {
        getTemplates().then(setTemplates);
        getModels().then(setModels);
    }

    useEffect(() => {
        load();
    }, []);

    const handleSave = async () => {
        if (!name || !promptTemplate) return;
        
        // Build default params object
        const defaultParamsObj: Record<string, string> = {};
        if (defaultAspectRatio) defaultParamsObj.aspectRatio = defaultAspectRatio;
        if (defaultResolution) defaultParamsObj.resolution = defaultResolution;
        
        const data = {
            name,
            promptTemplate,
            systemPrompt,
            promptGeneratorId: selectedPromptModel || undefined,
            imageGeneratorId: selectedImageModel || undefined,
            defaultParams: JSON.stringify(defaultParamsObj)
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
        setSelectedImageModel(template.imageGeneratorId || '');
        
        // Load default params
        try {
            const params = JSON.parse(template.defaultParams || '{}');
            setDefaultAspectRatio(params.aspectRatio || '');
            setDefaultResolution(params.resolution || '');
        } catch (e) {
            setDefaultAspectRatio('');
            setDefaultResolution('');
        }
        
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
        setSelectedImageModel('');
        setDefaultAspectRatio('');
        setDefaultResolution('');
    }
    
    const promptModels = models.filter(m => m.type === 'TEXT');
    const imageModels = models.filter(m => m.type === 'IMAGE');

    return (
        <div className="space-y-8 relative">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-white dark:to-white/60">{t('templates.title')}</h1>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
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
                        className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-lg relative flex flex-col"
                    >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-secondary rounded-xl">
                                    <LayoutTemplate className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                        onClick={() => handleEdit(template)}
                                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setDeleteId(template.id)}
                                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold mb-2 text-card-foreground">{template.name}</h3>
                            <div className="flex-1">
                             <div className="text-sm text-muted-foreground font-mono mb-4">
                                {template.systemPrompt && (
                                  <p className="line-clamp-1 mb-1">
                                    <span className="text-primary font-semibold">System:</span> {template.systemPrompt}
                                  </p>
                                )}
                                <p className={template.systemPrompt ? "line-clamp-2" : "line-clamp-3"}>
                                  {template.promptTemplate}
                                </p>
                            </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 mt-auto">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <FileText className="w-3 h-3" />
                                    <span className="opacity-70">{t('templates.card.promptModelPrefix')}</span>
                                    <span className={template.promptGenerator ? 'text-foreground' : 'text-muted-foreground'}>
                                    {template.promptGenerator?.name || t('templates.card.manualInput')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <ImageIcon className="w-3 h-3" />
                                    <span className="opacity-70">{t('templates.card.imageModelPrefix')}</span>
                                    <span className={template.imageGenerator ? 'text-foreground' : 'text-muted-foreground'}>
                                    {template.imageGenerator?.name || t('templates.card.default')}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                ))}
            </div>

            {/* Config Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl bg-popover border border-border rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-popover-foreground">{editingId ? t('templates.editTemplateTitle') : t('templates.newTemplateTitle')}</h2>
                                <button onClick={() => setIsCreating(false)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">{t('templates.nameLabel')}</label>
                                    <input 
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full bg-secondary/50 border border-border rounded-lg p-3 mt-1 focus:ring-2 focus:ring-primary/50 outline-none text-foreground"
                                        placeholder={t('templates.namePlaceholder')} 
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4 p-4 rounded-xl bg-secondary/20 border border-border">
                                        <h3 className="font-semibold text-primary flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> {t('templates.promptSectionTitle')}
                                        </h3>
                                        
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground uppercase">{t('templates.promptModelLabel')}</label>
                                            <select 
                                                value={selectedPromptModel}
                                                onChange={e => setSelectedPromptModel(e.target.value)}
                                                className="w-full bg-secondary/50 border border-border rounded-lg p-2 mt-1 text-sm outline-none text-foreground"
                                            >
                                                <option value="">{t('templates.promptModelNone')}</option>
                                                {promptModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
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
                                            <input 
                                                value={systemPrompt}
                                                onChange={e => setSystemPrompt(e.target.value)}
                                                className="w-full bg-secondary/50 border border-border rounded-lg p-2 text-sm outline-none text-foreground"
                                                placeholder={t('templates.systemPromptPlaceholder')}
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {t('templates.systemPromptHelper')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 p-4 rounded-xl bg-secondary/20 border border-border">
                                        <h3 className="font-semibold text-pink-400 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4" /> {t('templates.imageSectionTitle')}
                                        </h3>
                                         <div>
                                            <label className="text-xs font-medium text-muted-foreground uppercase">{t('templates.imageModelLabel')}</label>
                                            <select 
                                                value={selectedImageModel}
                                                onChange={e => setSelectedImageModel(e.target.value)}
                                                className="w-full bg-secondary/50 border border-border rounded-lg p-2 mt-1 text-sm outline-none text-foreground"
                                            >
                                                <option value="">{t('templates.imageModelDefault')}</option>
                                                {imageModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                        </div>
                                        
                                        <div className="pt-2 border-t border-border/50">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">{t('templates.defaultParams.title')}</h4>
                                            
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs text-muted-foreground block mb-1">{t('templates.defaultParams.aspectRatio')}</label>
                                                    <select 
                                                        value={defaultAspectRatio}
                                                        onChange={e => setDefaultAspectRatio(e.target.value)}
                                                        className="w-full bg-secondary/50 border border-border rounded-lg p-2 text-sm outline-none text-foreground"
                                                    >
                                                        <option value="">{t('templates.defaultParams.none')}</option>
                                                        <option value="1:1">{t('templates.defaultParams.aspect.square')}</option>
                                                        <option value="16:9">{t('templates.defaultParams.aspect.landscape')}</option>
                                                        <option value="9:16">{t('templates.defaultParams.aspect.portrait')}</option>
                                                        <option value="4:3">{t('templates.defaultParams.aspect.landscapeFull')}</option>
                                                        <option value="3:4">{t('templates.defaultParams.aspect.portraitFull')}</option>
                                                    </select>
                                                </div>
                                                
                                                <div>
                                                    <label className="text-xs text-muted-foreground block mb-1">{t('templates.defaultParams.resolution')}</label>
                                                    <select 
                                                        value={defaultResolution}
                                                        onChange={e => setDefaultResolution(e.target.value)}
                                                        className="w-full bg-secondary/50 border border-border rounded-lg p-2 text-sm outline-none text-foreground"
                                                    >
                                                        <option value="">{t('templates.defaultParams.none')}</option>
                                                        <option value="1K">{t('templates.defaultParams.resolution1k')}</option>
                                                        <option value="2K">{t('templates.defaultParams.resolution2k')}</option>
                                                        <option value="4K">{t('templates.defaultParams.resolution4k')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <p className="text-[10px] text-muted-foreground mt-2">
                                                {t('templates.defaultParams.note')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-4">
                                <button 
                                    onClick={() => setIsCreating(false)}
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

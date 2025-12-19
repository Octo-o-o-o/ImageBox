'use client';
import { useState, useEffect } from 'react';
import { getModels, saveModel, deleteModel, getProviders, saveProvider, deleteProvider } from '@/app/actions';
import { Save, Loader2, Key, Plus, Trash2, Cpu, Server, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MODEL_PRESETS, PARAMETER_DEFINITIONS } from '@/lib/modelParameters';
import { useLanguage } from '@/components/LanguageProvider';

export default function ModelsPage() {
  const [loading, setLoading] = useState(true);

  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);

  // UI State
  const [editingProvider, setEditingProvider] = useState<any>(null); // null = not editing
  const [editingModel, setEditingModel] = useState<any>(null);
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);
  
  // New States
  const [newProvider, setNewProvider] = useState({ name: '', type: 'OPENAI', baseUrl: '', apiKey: '' });
  const [newModel, setNewModel] = useState({ name: '', modelIdentifier: '', type: 'IMAGE', providerId: '' });
  const { t } = useLanguage();

  const refreshInfo = async () => {
    setLoading(true);
    const [p, m] = await Promise.all([getProviders(), getModels()]);
    setProviders(p);
    setModels(m);
    setLoading(false);
  };

  useEffect(() => {
    refreshInfo();
  }, []);

  // --- Provider Handlers ---
  const handleSaveProvider = async () => {
    const data = editingProvider || newProvider;
    if (!data.name || !data.type) return;
    
    await saveProvider(data);
    setEditingProvider(null);
    setNewProvider({ name: '', type: 'OPENAI', baseUrl: 'https://api.openai.com/v1', apiKey: '' });
    refreshInfo();
  };

  const confirmDeleteProvider = async () => {
    if (deleteProviderId) {
      await deleteProvider(deleteProviderId);
      setDeleteProviderId(null);
      refreshInfo();
    }
  };
  
  const openNewProvider = () => {
    setNewProvider({ name: '', type: 'OPENAI', baseUrl: 'https://api.openai.com/v1', apiKey: '' });
    setEditingProvider(null); // Clear edit mode if any
    setEditingProvider({ id: undefined, name: '', type: 'OPENAI', baseUrl: 'https://api.openai.com/v1', apiKey: '' }); // Hack to reuse modal
  };

  // --- Model Handlers ---
  const handleSaveModel = async () => {
    const data = editingModel;
    if (!data.name || !data.modelIdentifier || !data.providerId) return;
    
    await saveModel(data);
    setEditingModel(null);
    refreshInfo();
  };

  const confirmDeleteModel = async () => {
    if (deleteModelId) {
      await deleteModel(deleteModelId);
      setDeleteModelId(null);
      refreshInfo();
    }
  };
  
  const openNewModel = () => {
      if (providers.length === 0) {
          alert(t('models.models.alert.noProvider'));
          return;
      }
      setEditingModel({ name: '', modelIdentifier: '', type: 'IMAGE', providerId: providers[0].id, parameterConfig: '{}' });
  };

  // Helper function: Find preset key from parameterConfig JSON
  const getPresetKeyFromConfig = (parameterConfig: string): string => {
    if (!parameterConfig || parameterConfig === '{}') return '';

    try {
      const config = JSON.parse(parameterConfig);

      // Compare with each preset
      for (const [key, preset] of Object.entries(MODEL_PRESETS)) {
        // Deep compare the config with preset
        if (JSON.stringify(preset) === JSON.stringify(config)) {
          return key;
        }
      }

      return ''; // No matching preset found
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-white dark:to-white/60 mb-2">
            {t('models.title')}
          </h1>
          <p className="text-muted-foreground">{t('models.subtitle')}</p>
      </motion.div>
      
      {/* 1. Providers Section */}
      <section className="space-y-6">
         <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Server className="w-5 h-5" /></div>
                <div>
                    <h2 className="text-xl font-semibold text-foreground">{t('models.providers.title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('models.providers.desc')}</p>
                </div>
            </div>
            <button 
                onClick={openNewProvider}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
                <Plus className="w-4 h-4" /> {t('models.providers.add')}
            </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map(p => (
                <div key={p.id} className="p-5 rounded-2xl bg-card border border-border group hover:border-primary/30 transition-all hover:shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-card-foreground">{p.name}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingProvider(p)} className="p-2 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"><SettingsIcon className="w-4 h-4" /></button>
                            <button onClick={() => setDeleteProviderId(p.id)} className="p-2 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-muted-foreground font-mono bg-secondary/50 p-3 rounded-lg border border-border">
                        <div className="flex justify-between">
                            <span>{t('models.providers.typeLabel')}</span> <span className="text-foreground">{p.type === 'OPENAI' ? t('models.providers.typeOpenAI') : t('models.providers.typeGemini')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t('models.providers.baseUrlLabel')}</span> <span className="text-foreground truncate max-w-[150px]" title={p.baseUrl}>{p.baseUrl || t('models.providers.defaultLabel')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t('models.providers.apiKeyLabel')}</span> <span className="text-foreground">{p.apiKey ? '••••••••' : t('models.providers.apiKeyUnset')}</span>
                        </div>
                    </div>
                </div>
            ))}
         </div>
      </section>

      {/* 2. Models Section */}
      <section className="space-y-6">
         <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><Cpu className="w-5 h-5" /></div>
                <div>
                    <h2 className="text-xl font-semibold">{t('models.models.title')}</h2>
                    <p className="text-xs text-zinc-500">{t('models.models.desc')}</p>
                </div>
            </div>
            <button 
                onClick={openNewModel}
                className="flex items-center gap-2 bg-white text-black px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
                <Plus className="w-4 h-4" /> {t('models.models.add')}
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map(m => (
                <div key={m.id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between group hover:border-primary/20 transition-all hover:shadow-sm">
                    <div>
                        <h3 className="font-semibold text-card-foreground flex items-center gap-2">
                            {m.name}
                            <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold", m.type === 'IMAGE' ? "bg-pink-500/10 text-pink-500 dark:bg-pink-500/20 dark:text-pink-300" : "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-300")}>
                                {m.type === 'IMAGE' ? t('models.models.typeImage') : t('models.models.typeText')}
                            </span>
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-border" />
                             {m.provider?.name}
                             <span className="text-muted-foreground/50 px-1">/</span> 
                             {m.modelIdentifier}
                        </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingModel(m)} className="p-2 bg-secondary rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground"><SettingsIcon className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteModelId(m.id)} className="p-2 bg-destructive/10 rounded hover:bg-destructive/20 text-destructive/80 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
            ))}
         </div>
      </section>

      {/* Provider Modal */}
      <AnimatePresence>
        {editingProvider && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-popover border border-border rounded-2xl p-6 shadow-2xl"
                >
                    <h2 className="text-lg font-bold mb-6 text-popover-foreground">{editingProvider.id ? t('models.providers.editTitle') : t('models.providers.newTitle')}</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-semibold">{t('models.providers.nameLabel')}</label>
                            <input 
                                value={editingProvider.name}
                                onChange={e => setEditingProvider({...editingProvider, name: e.target.value})}
                                placeholder={t('models.providers.namePlaceholder')}
                                className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none focus:border-primary/50"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-semibold">{t('models.providers.typeSelectLabel')}</label>
                            <select 
                                value={editingProvider.type}
                                onChange={e => {
                                    const newType = e.target.value;
                                    let newUrl = editingProvider.baseUrl;
                                    if (newType === 'OPENAI') newUrl = 'https://api.openai.com/v1';
                                    if (newType === 'GEMINI') newUrl = 'https://generativelanguage.googleapis.com';
                                    setEditingProvider({...editingProvider, type: newType, baseUrl: newUrl});
                                }}
                                className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none"
                            >
                                <option value="OPENAI">{t('models.providers.typeOpenAIOption')}</option>
                                <option value="GEMINI">{t('models.providers.typeGeminiOption')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-semibold">{t('models.providers.baseUrlLabel')}</label>
                            <div className="relative">
                                <input 
                                    value={editingProvider.baseUrl || ''}
                                    onChange={e => setEditingProvider({...editingProvider, baseUrl: e.target.value})}
                                    placeholder={editingProvider.type === 'OPENAI' ? "https://api.openai.com/v1" : "https://generativelanguage.googleapis.com"}
                                    className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none focus:border-primary/50 font-mono pr-8"
                                />
                                <button 
                                    onClick={() => {
                                        let url = '';
                                        if (editingProvider.type === 'OPENAI') url = 'https://api.openai.com/v1';
                                        if (editingProvider.type === 'GEMINI') url = 'https://generativelanguage.googleapis.com';
                                        setEditingProvider({...editingProvider, baseUrl: url});
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground bg-secondary/80 hover:bg-secondary rounded-md transition-colors"
                                    title={t('models.providers.fillDefault')}
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {editingProvider.type === 'OPENAI' ? t('models.providers.baseUrlHelperOpenAI') : t('models.providers.baseUrlHelperGemini')}
                            </p>
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-semibold">{t('models.providers.apiKeyInput')}</label>
                            <input 
                                type="password"
                                value={editingProvider.apiKey || ''}
                                onChange={e => setEditingProvider({...editingProvider, apiKey: e.target.value})}
                                placeholder={t('models.providers.apiKeyPlaceholder')}
                                className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none focus:border-primary/50 font-mono"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-border pt-4">
                        <button onClick={() => setEditingProvider(null)} className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm">{t('models.providers.cancel')}</button>
                        <button onClick={handleSaveProvider} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium">{t('models.providers.save')}</button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Model Modal */}
      <AnimatePresence>
        {editingModel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-popover border border-border rounded-2xl p-6 shadow-2xl"
                >
                    <h2 className="text-lg font-bold mb-6 text-popover-foreground">{editingModel.id ? t('models.models.editTitle') : t('models.models.newTitle')}</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-semibold">{t('models.models.providerLabel')}</label>
                            <select 
                                value={editingModel.providerId}
                                onChange={e => setEditingModel({...editingModel, providerId: e.target.value})}
                                className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none"
                            >
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                            </select>
                        </div>
                        
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase font-semibold">{t('models.models.displayNameLabel')}</label>
                                <input 
                                    value={editingModel.name}
                                    onChange={e => setEditingModel({...editingModel, name: e.target.value})}
                                    placeholder={t('models.models.displayNamePlaceholder')}
                                    className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none focus:border-primary/50"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase font-semibold">{t('models.models.typeLabel')}</label>
                                <select 
                                    value={editingModel.type}
                                    onChange={e => setEditingModel({...editingModel, type: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none"
                                >
                                    <option value="IMAGE">{t('models.models.typeImageOption')}</option>
                                    <option value="TEXT">{t('models.models.typeTextOption')}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-semibold">{t('models.models.identifierLabel')}</label>
                            <input
                                value={editingModel.modelIdentifier}
                                onChange={e => setEditingModel({...editingModel, modelIdentifier: e.target.value})}
                                placeholder={t('models.models.identifierPlaceholder')}
                                className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none focus:border-primary/50 font-mono"
                            />
                        </div>

                        {/* Parameter Configuration (for IMAGE models only) */}
                        {editingModel.type === 'IMAGE' && (
                            <div className="space-y-2 pt-4 border-t border-border">
                                <label className="text-xs text-muted-foreground uppercase font-semibold">{t('models.models.paramConfigLabel')}</label>
                                <select
                                    value={getPresetKeyFromConfig(editingModel.parameterConfig)}
                                    onChange={e => {
                                        const presetKey = e.target.value;
                                        if (presetKey && MODEL_PRESETS[presetKey as keyof typeof MODEL_PRESETS]) {
                                            const preset = MODEL_PRESETS[presetKey as keyof typeof MODEL_PRESETS];
                                            setEditingModel({
                                                ...editingModel,
                                                parameterConfig: JSON.stringify(preset)
                                            });
                                        } else {
                                            setEditingModel({...editingModel, parameterConfig: '{}'});
                                        }
                                    }}
                                    className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none"
                                >
                                    <option value="">{t('models.models.presetPlaceholder')}</option>
                                    <optgroup label={t('models.models.optgroup.gemini')}>
                                        <option value="GEMINI_2_5_FLASH_IMAGE">{t('models.models.option.geminiFlash')}</option>
                                        <option value="GEMINI_3_PRO_IMAGE">{t('models.models.option.geminiPro')}</option>
                                    </optgroup>
                                    <optgroup label={t('models.models.optgroup.openrouter')}>
                                        <option value="GEMINI_OPENROUTER">{t('models.models.option.geminiOpenRouter')}</option>
                                        <option value="OPENAI_COMPATIBLE">{t('models.models.option.openaiCompatible')}</option>
                                    </optgroup>
                                    <optgroup label={t('models.models.optgroup.openai')}>
                                        <option value="OPENAI_DALLE">{t('models.models.option.openaiDalle')}</option>
                                    </optgroup>
                                </select>

                                {editingModel.parameterConfig && editingModel.parameterConfig !== '{}' && (
                                    <div className="mt-3 p-3 bg-secondary/20 rounded-lg border border-border space-y-2">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">{t('models.models.supportedParams')}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(() => {
                                                try {
                                                    const config = JSON.parse(editingModel.parameterConfig);
                                                    return (config.supportedParams || []).map((param: string) => (
                                                        <span key={param} className="text-[10px] px-2 py-1 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 rounded border border-indigo-500/20">
                                                            {PARAMETER_DEFINITIONS[param]?.label || param}
                                                        </span>
                                                    ));
                                                } catch (e) {
                                                    return <span className="text-[10px] text-red-400">{t('models.models.configError')}</span>;
                                                }
                                            })()}
                                        </div>
                                        {(() => {
                                            try {
                                                const config = JSON.parse(editingModel.parameterConfig);
                                                const maxRefImages = config.maxRefImages;
                                                if (maxRefImages !== undefined) {
                                                    return (
                                                        <div className="pt-2 border-t border-border">
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {t('models.models.refImageLimitLabel')}
                                                                <span className={maxRefImages === 0 ? "text-yellow-400 ml-1" : "text-indigo-300 ml-1"}>
                                                                    {maxRefImages === 0 ? t('models.models.refImageNotSupported') : t('models.models.refImageUpTo').replace('{{count}}', String(maxRefImages))}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            } catch (e) {
                                                return null;
                                            }
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-border pt-4">
                        <button onClick={() => setEditingModel(null)} className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm">{t('models.models.cancel')}</button>
                        <button onClick={handleSaveModel} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium">{t('models.models.save')}</button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Delete Provider Confirmation Modal */}
      <AnimatePresence>
        {deleteProviderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-popover border border-border rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{t('models.deleteProvider.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('models.deleteProvider.desc')}</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setDeleteProviderId(null)}
                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {t('models.models.cancel')}
                  </button>
                  <button
                    onClick={confirmDeleteProvider}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                  >
                    {t('models.confirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Model Confirmation Modal */}
      <AnimatePresence>
        {deleteModelId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-popover border border-border rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{t('models.deleteModel.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('models.deleteModel.desc')}</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setDeleteModelId(null)}
                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {t('models.models.cancel')}
                  </button>
                  <button
                    onClick={confirmDeleteModel}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                  >
                    {t('models.confirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    )
}

function clsx(...args: any[]) {
    return args.filter(Boolean).join(' ');
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { getModels, saveModel, deleteModel, getProviders, saveProvider, deleteProvider, discoverLocalServicesAction, checkLocalServiceAction, checkLocalProviderStatusAction } from '@/app/actions';
import { Save, Loader2, Key, Plus, Trash2, Cpu, Server, Check, RefreshCw, AlertTriangle, HardDrive, Search, Wifi, WifiOff, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MODEL_PRESETS, PARAMETER_DEFINITIONS } from '@/lib/modelParameters';
import { isPresetProvider, isPresetModel, getApiKeyApplyUrl } from '@/lib/presetProviders';
import { useLanguage } from '@/components/LanguageProvider';
import { ConfirmDialog } from '@/components/ui';

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
  const [newProvider, setNewProvider] = useState({ name: '', type: 'OPENAI', baseUrl: '', apiKey: '', localBackend: 'SD_CPP' });
  const [newModel, setNewModel] = useState({ name: '', modelIdentifier: '', type: 'IMAGE', providerId: '' });
  const { t } = useLanguage();
  
  // Local Model States
  const [localProviderStatus, setLocalProviderStatus] = useState<Record<string, 'online' | 'offline' | 'checking'>>({});
  const [scanning, setScanning] = useState(false);
  const [discoveredServices, setDiscoveredServices] = useState<any[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);

  const refreshInfo = async () => {
    setLoading(true);
    const [p, m] = await Promise.all([getProviders(), getModels()]);
    setProviders(p);
    setModels(m);
    setLoading(false);
    
    // Check status of local providers
    checkLocalProvidersStatus(p);
  };
  
  const checkLocalProvidersStatus = useCallback(async (providerList: any[]) => {
    const localProviders = providerList.filter(p => p.type === 'LOCAL');
    if (localProviders.length === 0) return;
    
    // Set all to checking
    const checking: Record<string, 'online' | 'offline' | 'checking'> = {};
    localProviders.forEach(p => { checking[p.id] = 'checking'; });
    setLocalProviderStatus(checking);
    
    // Check each provider
    const results = await Promise.all(
      localProviders.map(async (p) => {
        const result = await checkLocalProviderStatusAction(p.id);
        return { id: p.id, online: result.online };
      })
    );
    
    const newStatus: Record<string, 'online' | 'offline' | 'checking'> = {};
    results.forEach(r => { newStatus[r.id] = r.online ? 'online' : 'offline'; });
    setLocalProviderStatus(newStatus);
  }, []);

  useEffect(() => {
    refreshInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Provider Handlers ---
  const handleSaveProvider = async () => {
    const data = editingProvider || newProvider;
    if (!data.name || !data.type) return;
    
    await saveProvider(data);
    setEditingProvider(null);
    setNewProvider({ name: '', type: 'OPENAI', baseUrl: 'https://api.openai.com/v1', apiKey: '', localBackend: 'SD_CPP' });
    refreshInfo();
  };

  const confirmDeleteProvider = async () => {
    if (deleteProviderId) {
      await deleteProvider(deleteProviderId);
      setDeleteProviderId(null);
      refreshInfo();
    }
  };
  
  const openNewProvider = (type: string = 'OPENAI') => {
    let defaultUrl = '';
    if (type === 'OPENAI') defaultUrl = 'https://api.openai.com/v1';
    if (type === 'GEMINI') defaultUrl = 'https://generativelanguage.googleapis.com';
    if (type === 'LOCAL') defaultUrl = 'http://127.0.0.1:8080';

    setNewProvider({ name: '', type, baseUrl: defaultUrl, apiKey: '', localBackend: 'SD_CPP' });
    setEditingProvider(null);
    setEditingProvider({ id: undefined, name: '', type, baseUrl: defaultUrl, apiKey: '', localBackend: 'SD_CPP' });
    setConnectionTestResult(null);

    // Reset scan state when opening provider modal
    if (type === 'LOCAL') {
      setDiscoveredServices([]);
      setSelectedService(null);
      setScanning(false);
    }
  };

  // Open the Add Local Model modal (directly opens provider modal with LOCAL type)
  const openAddLocalModelModal = () => {
    openNewProvider('LOCAL');
  };

  // Scan for local services
  const handleScanServices = async () => {
    setScanning(true);
    setDiscoveredServices([]);
    setSelectedService(null);
    try {
      const services = await discoverLocalServicesAction();
      setDiscoveredServices(services);

      // Auto-fill if only one service found
      if (services.length === 1) {
        const service = services[0];
        const backend = service.type === 'COMFYUI' ? 'COMFYUI' : 'SD_CPP';
        setEditingProvider((prev: any) => ({
          ...prev,
          baseUrl: service.url,
          localBackend: backend,
          name: prev?.name || `Local ${service.type}`,
        }));
        setSelectedService(service);
      }
    } catch (e) {
      console.error('Scan failed:', e);
    }
    setScanning(false);
  };

  // Select a service from the list
  const handleSelectService = (service: any) => {
    const backend = service.type === 'COMFYUI' ? 'COMFYUI' : 'SD_CPP';
    setEditingProvider((prev: any) => ({
      ...prev,
      baseUrl: service.url,
      localBackend: backend,
      name: prev?.name || `Local ${service.type}`,
    }));
    setSelectedService(service);
    setDiscoveredServices([]);
  };
  
  // Test connection to a local service
  const handleTestConnection = async (url: string) => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const result = await checkLocalServiceAction(url);
      if (result.available) {
        setConnectionTestResult({ success: true, message: t('models.providers.testSuccess') });
      } else {
        setConnectionTestResult({ success: false, message: result.error || t('models.providers.testFailed') });
      }
    } catch (e) {
      setConnectionTestResult({ success: false, message: t('models.providers.testFailed') });
    }
    setTestingConnection(false);
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
          <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground mb-2">
            <Server className="text-primary" />
            {t('models.title')}
          </h1>
          <p className="text-muted-foreground">{t('models.subtitle')}</p>
      </motion.div>
      
      {/* 1. Providers Section */}
      <section className="space-y-6">
         <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><Server className="w-5 h-5" /></div>
                <div>
                    <h2 className="text-xl font-semibold text-foreground">{t('models.providers.title')}</h2>
                    <p className="text-xs text-muted-foreground">{t('models.providers.desc')}</p>
                </div>
            </div>
            <div className="flex gap-2">
              <button
                  onClick={openAddLocalModelModal}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                  <HardDrive className="w-4 h-4" /> {t('models.providers.addLocal')}
              </button>
              <button
                  onClick={() => openNewProvider('OPENAI')}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                  <Plus className="w-4 h-4" /> {t('models.providers.add')}
              </button>
            </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map(p => {
                const needsApiKey = p.type !== 'LOCAL' && !p.apiKey;
                const isPreset = isPresetProvider(p.id);
                
                return (
                <div 
                  key={p.id} 
                  className={`p-5 rounded-2xl bg-card border group hover:shadow-lg transition-all ${
                    needsApiKey 
                      ? 'border-amber-500/50 hover:border-amber-500' 
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            {p.type === 'LOCAL' && <HardDrive className="w-4 h-4 text-emerald-500" />}
                            <span className="text-lg font-bold text-card-foreground">{p.name}</span>
                            {isPreset && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-orange-500/10 text-orange-500 rounded">
                                {t('models.providers.preset') || '内置'}
                              </span>
                            )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {p.type === 'LOCAL' && (
                              <button 
                                onClick={() => checkLocalProvidersStatus([p])} 
                                className="p-2 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                                title={t('models.providers.refreshStatus')}
                              >
                                <RefreshCw className={`w-4 h-4 ${localProviderStatus[p.id] === 'checking' ? 'animate-spin' : ''}`} />
                              </button>
                            )}
                            <button onClick={() => setEditingProvider(p)} className="p-2 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"><SettingsIcon className="w-4 h-4" /></button>
                            <button onClick={() => setDeleteProviderId(p.id)} className="p-2 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                    
                    {/* API Key Warning Banner */}
                    {needsApiKey && (
                      <div className="mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-medium">{t('models.providers.apiKeyRequired') || 'API Key 未配置'}</span>
                        </div>
                        <button 
                          onClick={() => setEditingProvider(p)}
                          className="mt-2 w-full px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Key className="w-3 h-3" />
                          {t('models.providers.configureApiKey') || '配置 API Key'}
                        </button>
                      </div>
                    )}
                    
                    <div className="space-y-2 text-xs text-muted-foreground font-mono bg-secondary/50 p-3 rounded-lg border border-border">
                        <div className="flex justify-between">
                            <span>{t('models.providers.baseUrlLabel')}</span> <span className="text-foreground truncate max-w-[180px]" title={p.baseUrl}>{p.baseUrl || t('models.providers.defaultLabel')}</span>
                        </div>
                        {p.type === 'LOCAL' ? (
                          <div className="flex justify-between items-center">
                            <span>{t('models.providers.serviceStatus')}</span>
                            <span className="flex items-center gap-1.5">
                              {localProviderStatus[p.id] === 'checking' ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> {t('models.providers.statusChecking')}</>
                              ) : localProviderStatus[p.id] === 'online' ? (
                                <><span className="w-2 h-2 rounded-full bg-emerald-500" /> <span className="text-emerald-500">{t('models.providers.statusOnline')}</span></>
                              ) : (
                                <><span className="w-2 h-2 rounded-full bg-red-500" /> <span className="text-red-500">{t('models.providers.statusOffline')}</span></>
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span>{t('models.providers.apiKeyLabel')}</span> 
                            <span className="flex items-center gap-2">
                              <span className={p.apiKey ? 'text-foreground' : 'text-amber-500'}>
                                {p.apiKey ? `${p.apiKey.slice(0, 4)}••••${p.apiKey.slice(-4)}` : t('models.providers.apiKeyUnset')}
                              </span>
                              {!p.apiKey && isPreset && getApiKeyApplyUrl(p.id) && (
                                <a
                                  href={getApiKeyApplyUrl(p.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {t('models.providers.applyApiKey')}
                                </a>
                              )}
                            </span>
                          </div>
                        )}
                    </div>
                </div>
              );
            })}
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
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-popover-foreground">{editingProvider.id ? t('models.providers.editTitle') : t('models.providers.newTitle')}</h2>
                      {editingProvider.type === 'LOCAL' && !editingProvider.id && (
                        <button
                          onClick={handleScanServices}
                          disabled={scanning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          title="扫描本地服务"
                        >
                          {scanning ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                          扫描
                        </button>
                      )}
                    </div>
                    
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
                                    if (newType === 'LOCAL') newUrl = 'http://127.0.0.1:8080';
                                    setEditingProvider({...editingProvider, type: newType, baseUrl: newUrl, localBackend: newType === 'LOCAL' ? 'SD_CPP' : undefined});
                                    setConnectionTestResult(null);
                                }}
                                className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none"
                            >
                                <option value="OPENAI">{t('models.providers.typeOpenAIOption')}</option>
                                <option value="GEMINI">{t('models.providers.typeGeminiOption')}</option>
                                <option value="LOCAL">{t('models.providers.typeLocalOption')}</option>
                            </select>
                        </div>
                        
                        {/* Local Backend Type (only for LOCAL) */}
                        {editingProvider.type === 'LOCAL' && (
                          <div>
                            <label className="text-xs text-muted-foreground uppercase font-semibold">{t('models.providers.localBackend')}</label>
                            <select 
                                value={editingProvider.localBackend || 'SD_CPP'}
                                onChange={e => setEditingProvider({...editingProvider, localBackend: e.target.value})}
                                className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none"
                            >
                                <option value="SD_CPP">{t('models.providers.backendSdCpp')}</option>
                                <option value="COMFYUI">{t('models.providers.backendComfyUI')}</option>
                                <option value="CUSTOM">{t('models.providers.backendCustom')}</option>
                            </select>
                          </div>
                        )}

                        <div>
                            <label className="text-xs text-muted-foreground uppercase font-semibold">
                              {editingProvider.type === 'LOCAL' ? t('models.providers.serviceAddress') : t('models.providers.baseUrlLabel')}
                            </label>
                            <div className="relative">
                                <input 
                                    value={editingProvider.baseUrl || ''}
                                    onChange={e => {
                                      setEditingProvider({...editingProvider, baseUrl: e.target.value});
                                      setConnectionTestResult(null);
                                    }}
                                    placeholder={
                                      editingProvider.type === 'LOCAL' ? t('models.providers.serviceAddressPlaceholder') :
                                      editingProvider.type === 'OPENAI' ? "https://api.openai.com/v1" : "https://generativelanguage.googleapis.com"
                                    }
                                    className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 text-sm text-foreground outline-none focus:border-primary/50 font-mono pr-20"
                                />
                                {editingProvider.type === 'LOCAL' ? (
                                  <button 
                                      onClick={() => handleTestConnection(editingProvider.baseUrl)}
                                      disabled={testingConnection || !editingProvider.baseUrl}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-secondary/80 hover:bg-secondary rounded-md transition-colors disabled:opacity-50"
                                  >
                                      {testingConnection ? <Loader2 className="w-3 h-3 animate-spin" /> : t('models.providers.testConnection')}
                                  </button>
                                ) : (
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
                                )}
                            </div>
                            {connectionTestResult && editingProvider.type === 'LOCAL' && (
                              <p className={`text-[10px] mt-1 flex items-center gap-1 ${connectionTestResult.success ? 'text-emerald-500' : 'text-red-500'}`}>
                                {connectionTestResult.success ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                {connectionTestResult.message}
                              </p>
                            )}
                            {!connectionTestResult && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {editingProvider.type === 'LOCAL' ? t('wizard.serviceUrlHint') :
                                 editingProvider.type === 'OPENAI' ? t('models.providers.baseUrlHelperOpenAI') : t('models.providers.baseUrlHelperGemini')}
                              </p>
                            )}
                        </div>

                        {/* API Key - not shown for LOCAL */}
                        {editingProvider.type !== 'LOCAL' ? (
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
                        ) : (
                          <p className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg flex items-center gap-2">
                            <HardDrive className="w-4 h-4" />
                            {t('models.providers.localNoApiKey')}
                          </p>
                        )}

                        {/* Service Selection List (for LOCAL type with multiple discovered services) */}
                        {editingProvider.type === 'LOCAL' && !editingProvider.id && discoveredServices.length > 1 && (
                          <div className="pt-4 border-t border-border">
                            <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                              <Wifi className="w-4 h-4" />
                              发现 {discoveredServices.length} 个服务，请选择一个：
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {discoveredServices.map((service, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleSelectService(service)}
                                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                                    selectedService?.url === service.url
                                      ? 'border-emerald-500 bg-emerald-500/10'
                                      : 'border-border hover:border-emerald-500/50 bg-card'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${selectedService?.url === service.url ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                                    <div className="text-left">
                                      <p className="text-sm font-medium text-foreground">{service.type}</p>
                                      <p className="text-xs text-muted-foreground font-mono">{service.url}</p>
                                    </div>
                                  </div>
                                  {selectedService?.url === service.url && (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No Services Found (for LOCAL type when scanned but nothing found) */}
                        {editingProvider.type === 'LOCAL' && !editingProvider.id && !scanning && discoveredServices.length === 0 && selectedService === null && (
                          <div className="pt-4 border-t border-border">
                            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                              <div className="flex items-start gap-3 mb-3">
                                <WifiOff className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">
                                    未发现本地推理服务
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    请先安装并启动本地推理服务 (如 stable-diffusion.cpp 或 ComfyUI)
                                  </p>
                                </div>
                              </div>
                              <a
                                href="https://github.com/Tongyi-MAI/Z-Image"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
                              >
                                <ExternalLink className="w-4 h-4" />
                                查看 Z-Image 安装指南
                              </a>
                            </div>
                          </div>
                        )}
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

                        {/* Parameter Configuration (for user-created IMAGE models only, hidden for presets) */}
                        {editingModel.type === 'IMAGE' && (!editingModel.id || !isPresetModel(editingModel.id)) && (
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
                                        <option value="GRSAI_NANO_BANANA_PRO">{t('models.models.option.grsaiNanaBananaPro')}</option>
                                        <option value="GRSAI_NANO_BANANA_FAST">{t('models.models.option.grsaiNanaBananaFast')}</option>
                                        <option value="OPENAI_COMPATIBLE">{t('models.models.option.openaiCompatible')}</option>
                                    </optgroup>
                                    <optgroup label={t('models.models.optgroup.openai')}>
                                        <option value="OPENAI_DALLE">{t('models.models.option.openaiDalle')}</option>
                                    </optgroup>
                                    <optgroup label={t('models.models.optgroup.local')}>
                                        <option value="LOCAL_ZIMAGE_SDCPP">{t('models.models.option.localZImageSdCpp')}</option>
                                        <option value="LOCAL_ZIMAGE_COMFYUI">{t('models.models.option.localZImageComfyUI')}</option>
                                        <option value="LOCAL_CUSTOM">{t('models.models.option.localCustom')}</option>
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
                                                        <span key={param} className="text-[10px] px-2 py-1 bg-orange-500/10 text-orange-500 dark:text-orange-300 rounded border border-orange-500/20">
                                                            {t(PARAMETER_DEFINITIONS[param]?.label) || param}
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
                                                                <span className={maxRefImages === 0 ? "text-yellow-400 ml-1" : "text-orange-400 ml-1"}>
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
      <ConfirmDialog
        isOpen={!!deleteProviderId}
        onClose={() => setDeleteProviderId(null)}
        onConfirm={confirmDeleteProvider}
        title={t('models.deleteProvider.title')}
        message={t('models.deleteProvider.desc')}
        confirmLabel={t('models.confirm')}
        cancelLabel={t('models.models.cancel')}
        variant="danger"
        icon={AlertTriangle}
      />

      {/* Delete Model Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteModelId}
        onClose={() => setDeleteModelId(null)}
        onConfirm={confirmDeleteModel}
        title={t('models.deleteModel.title')}
        message={t('models.deleteModel.desc')}
        confirmLabel={t('models.confirm')}
        cancelLabel={t('models.models.cancel')}
        variant="danger"
        icon={AlertTriangle}
      />
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

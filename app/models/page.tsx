'use client';
import { useState, useEffect, useCallback } from 'react';
import { getModels, saveModel, deleteModel, getProviders, saveProvider, deleteProvider, discoverLocalServicesAction, checkLocalServiceAction, checkLocalProviderStatusAction, checkInstallPrerequisitesAction, getInstallCommandsAction, runAutoInstallStepAction, installPrerequisiteAction } from '@/app/actions';
import { Save, Loader2, Key, Plus, Trash2, Cpu, Server, Check, RefreshCw, AlertTriangle, HardDrive, Search, Wifi, WifiOff, Download, Terminal, Copy, CheckCircle, XCircle, Play } from 'lucide-react';
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
  const [newProvider, setNewProvider] = useState({ name: '', type: 'OPENAI', baseUrl: '', apiKey: '', localBackend: 'SD_CPP' });
  const [newModel, setNewModel] = useState({ name: '', modelIdentifier: '', type: 'IMAGE', providerId: '' });
  const { t } = useLanguage();
  
  // Local Model States
  const [localProviderStatus, setLocalProviderStatus] = useState<Record<string, 'online' | 'offline' | 'checking'>>({});
  const [scanning, setScanning] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false); // Track if scan has completed
  const [discoveredServices, setDiscoveredServices] = useState<any[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
  };
  
  // Scan for local services
  const handleScanServices = async () => {
    setScanning(true);
    setScanCompleted(false);
    setDiscoveredServices([]);
    try {
      const services = await discoverLocalServicesAction();
      setDiscoveredServices(services);
    } catch (e) {
      console.error('Scan failed:', e);
    }
    setScanning(false);
    setScanCompleted(true);
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
  
  // Quick add a discovered local service (one-click)
  const [quickAdding, setQuickAdding] = useState<string | null>(null);
  
  // Auto install states
  const [showInstallWizard, setShowInstallWizard] = useState(false);
  const [installPrereqs, setInstallPrereqs] = useState<any>(null);
  const [installCommands, setInstallCommands] = useState<any>(null);
  const [selectedModelVariant, setSelectedModelVariant] = useState<'full' | 'q8' | 'q4' | 'q2'>('q4');
  const [installing, setInstalling] = useState(false);
  const [installStep, setInstallStep] = useState<string>('');
  const [installLogs, setInstallLogs] = useState<{step: string; success: boolean; message: string}[]>([]);
  const [copied, setCopied] = useState(false);
  const [installingPrereq, setInstallingPrereq] = useState<string | null>(null);
  const handleQuickAddLocalService = async (service: any) => {
    setQuickAdding(service.url);
    try {
      // Determine backend type and preset
      const backend = service.type === 'COMFYUI' ? 'COMFYUI' : 'SD_CPP';
      const presetKey = backend === 'COMFYUI' ? 'LOCAL_ZIMAGE_COMFYUI' : 'LOCAL_ZIMAGE_SDCPP';
      const parameterConfig = JSON.stringify(MODEL_PRESETS[presetKey as keyof typeof MODEL_PRESETS] || {});
      
      // Create provider
      const provider = await saveProvider({
        name: `Local ${service.type}`,
        type: 'LOCAL',
        baseUrl: service.url,
        localBackend: backend,
      });
      
      // Create model
      await saveModel({
        name: 'Z-Image Turbo',
        modelIdentifier: 'z-image-turbo',
        type: 'IMAGE',
        providerId: provider.id,
        parameterConfig,
      });
      
      // Clear discovered services and refresh
      setDiscoveredServices([]);
      refreshInfo();
    } catch (e) {
      console.error('Quick add failed:', e);
      alert('添加失败: ' + (e instanceof Error ? e.message : String(e)));
    }
    setQuickAdding(null);
  };
  
  // Start auto install wizard
  const handleStartInstallWizard = async () => {
    setShowInstallWizard(true);
    setInstallLogs([]);
    
    // Check prerequisites
    const prereqs = await checkInstallPrerequisitesAction();
    setInstallPrereqs(prereqs);
    
    // Get install commands
    const commands = await getInstallCommandsAction(selectedModelVariant, 8080);
    setInstallCommands(commands);
  };
  
  // Update commands when model variant changes
  const handleModelVariantChange = async (variant: 'full' | 'q8' | 'q4' | 'q2') => {
    setSelectedModelVariant(variant);
    const commands = await getInstallCommandsAction(variant, 8080);
    setInstallCommands(commands);
  };
  
  // Copy one-liner to clipboard
  const handleCopyOneLiner = async () => {
    if (installCommands?.oneLiner) {
      await navigator.clipboard.writeText(installCommands.oneLiner);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Install a missing prerequisite
  const handleInstallPrerequisite = async (tool: 'cmake' | 'huggingface') => {
    setInstallingPrereq(tool);
    try {
      const result = await installPrerequisiteAction(tool);
      if (result.success) {
        // Refresh prerequisites
        const prereqs = await checkInstallPrerequisitesAction();
        setInstallPrereqs(prereqs);
      } else {
        alert(`安装失败: ${result.error || result.message}`);
      }
    } catch (e) {
      alert(`安装失败: ${e instanceof Error ? e.message : String(e)}`);
    }
    setInstallingPrereq(null);
  };
  
  // Run automatic installation
  const handleRunAutoInstall = async () => {
    setInstalling(true);
    setInstallLogs([]);
    
    const steps: Array<'create-dir' | 'clone-repo' | 'build' | 'download-model' | 'verify'> = [
      'create-dir',
      'clone-repo', 
      'build',
      'download-model',
      'verify'
    ];
    
    const stepNames: Record<string, string> = {
      'create-dir': '创建目录',
      'clone-repo': '克隆仓库',
      'build': '编译项目',
      'download-model': '下载模型',
      'verify': '验证安装'
    };
    
    for (const step of steps) {
      setInstallStep(stepNames[step]);
      
      try {
        const result = await runAutoInstallStepAction(step, selectedModelVariant);
        setInstallLogs(prev => [...prev, { step: stepNames[step], success: result.success, message: result.message }]);
        
        if (!result.success) {
          setInstallStep('安装失败');
          setInstalling(false);
          return;
        }
      } catch (e) {
        setInstallLogs(prev => [...prev, { step: stepNames[step], success: false, message: String(e) }]);
        setInstallStep('安装失败');
        setInstalling(false);
        return;
      }
    }
    
    setInstallStep('安装完成');
    setInstalling(false);
    
    // Scan for the newly installed service
    setTimeout(() => {
      handleScanServices();
    }, 2000);
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
            <div className="flex gap-2">
              <button 
                  onClick={handleScanServices}
                  disabled={scanning}
                  className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} 
                  {t('models.providers.scanServices')}
              </button>
              <button 
                  onClick={() => openNewProvider('LOCAL')}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                  <HardDrive className="w-4 h-4" /> {t('models.providers.addLocal')}
              </button>
              <button 
                  onClick={() => openNewProvider('OPENAI')}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                  <Plus className="w-4 h-4" /> {t('models.providers.add')}
              </button>
            </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map(p => (
                <div key={p.id} className="p-5 rounded-2xl bg-card border border-border group hover:border-primary/30 transition-all hover:shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            {p.type === 'LOCAL' && <HardDrive className="w-4 h-4 text-emerald-500" />}
                            <span className="text-lg font-bold text-card-foreground">{p.name}</span>
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
                    
                    <div className="space-y-2 text-xs text-muted-foreground font-mono bg-secondary/50 p-3 rounded-lg border border-border">
                        <div className="flex justify-between">
                            <span>{t('models.providers.typeLabel')}</span> 
                            <span className="text-foreground">
                              {p.type === 'OPENAI' ? t('models.providers.typeOpenAI') : 
                               p.type === 'GEMINI' ? t('models.providers.typeGemini') : 
                               t('models.providers.typeLocal')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t('models.providers.baseUrlLabel')}</span> <span className="text-foreground truncate max-w-[150px]" title={p.baseUrl}>{p.baseUrl || t('models.providers.defaultLabel')}</span>
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
                          <div className="flex justify-between">
                            <span>{t('models.providers.apiKeyLabel')}</span> <span className="text-foreground">{p.apiKey ? '••••••••' : t('models.providers.apiKeyUnset')}</span>
                          </div>
                        )}
                    </div>
                </div>
            ))}
         </div>
         
         {/* Discovered Services */}
         {discoveredServices.length > 0 && (
           <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
             <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
               <Wifi className="w-4 h-4" />
               {t('models.providers.foundServices').replace('{{count}}', String(discoveredServices.length))}
             </h3>
             <div className="space-y-2">
               {discoveredServices.map((service, idx) => (
                 <div key={idx} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                   <div className="flex items-center gap-3">
                     <span className="w-2 h-2 rounded-full bg-emerald-500" />
                     <div>
                       <p className="text-sm font-medium text-foreground">{service.type}</p>
                       <p className="text-xs text-muted-foreground font-mono">{service.url}</p>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button
                       onClick={() => {
                         openNewProvider('LOCAL');
                         setTimeout(() => {
                           setEditingProvider((prev: any) => ({ ...prev, baseUrl: service.url, localBackend: service.type === 'COMFYUI' ? 'COMFYUI' : 'SD_CPP' }));
                         }, 0);
                       }}
                       className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-xs font-medium"
                     >
                       {t('common.edit')}
                     </button>
                     <button
                       onClick={() => handleQuickAddLocalService(service)}
                       disabled={quickAdding === service.url}
                       className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                     >
                       {quickAdding === service.url ? (
                         <Loader2 className="w-3 h-3 animate-spin" />
                       ) : (
                         <Plus className="w-3 h-3" />
                       )}
                       {t('models.providers.quickAdd')}
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           </div>
         )}
         
         {/* No Services Found - Show Installation Guide */}
         {scanCompleted && discoveredServices.length === 0 && (
           <div className="mt-6 p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
             <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
               <WifiOff className="w-4 h-4" />
               {t('models.providers.noServicesFoundScan')}
             </h3>
             <p className="text-sm text-muted-foreground mb-4">
               未发现本地推理服务。您可以：
             </p>
             <div className="space-y-3">
               {/* Option 1: Auto Install */}
               <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg border border-emerald-500/30">
                 <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                   <Download className="w-4 h-4 text-emerald-500" />
                   自动安装 Z-Image（推荐）
                 </h4>
                 <p className="text-xs text-muted-foreground mb-3">
                   ImageBox 帮你自动下载、编译、配置本地推理环境
                 </p>
                 <button
                   onClick={handleStartInstallWizard}
                   className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                 >
                   <Play className="w-4 h-4" />
                   开始自动安装
                 </button>
               </div>
               
               {/* Option 2: Manual Install with guide */}
               <div className="p-4 bg-card rounded-lg border border-border">
                 <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                   <Terminal className="w-4 h-4 text-blue-500" />
                   手动安装（高级用户）
                 </h4>
                 <p className="text-xs text-muted-foreground mb-3">
                   在终端中手动执行安装命令
                 </p>
                 <details className="text-xs">
                   <summary className="cursor-pointer text-primary hover:underline">查看安装命令</summary>
                   <div className="mt-3 bg-secondary/50 p-3 rounded-lg font-mono text-foreground overflow-x-auto">
                     <p className="text-muted-foreground mb-1"># 1. 克隆项目并初始化子模块</p>
                     <p>git clone https://github.com/leejet/stable-diffusion.cpp</p>
                     <p>cd stable-diffusion.cpp && git submodule update --init --recursive</p>
                     <p className="text-muted-foreground mt-2 mb-1"># 2. 编译 (macOS)</p>
                     <p>mkdir build && cd build</p>
                     <p>cmake .. -DSD_METAL=ON && cmake --build . --config Release</p>
                    <p className="text-muted-foreground mt-2 mb-1"># 3. 下载 Z-Image 模型</p>
                    <p>python3 -c &quot;from huggingface_hub import snapshot_download; snapshot_download(&apos;Tongyi-MAI/Z-Image-Turbo&apos;, local_dir=&apos;models/Z-Image-Turbo&apos;)&quot;</p>
                     <p className="text-muted-foreground mt-2 mb-1"># 4. 启动服务</p>
                     <p>./bin/sd --mode server --model models/z-image-turbo.gguf --port 8080</p>
                   </div>
                 </details>
               </div>
               
               {/* Option 3: Use ComfyUI */}
               <div className="p-4 bg-card rounded-lg border border-border">
                 <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                   <Server className="w-4 h-4 text-violet-500" />
                   使用 ComfyUI
                 </h4>
                 <p className="text-xs text-muted-foreground mb-2">
                   功能丰富的图形化界面，通过工作流支持 Z-Image
                 </p>
                 <a 
                   href="https://github.com/comfyanonymous/ComfyUI" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                 >
                   ComfyUI 安装指南 →
                 </a>
               </div>
               
               {/* Option 4: Manual Add */}
               <div className="flex items-center gap-3 pt-2">
                 <span className="text-xs text-muted-foreground">或者</span>
                 <button
                   onClick={() => openNewProvider('LOCAL')}
                   className="text-xs text-primary hover:underline"
                 >
                   手动添加已有的本地服务 →
                 </button>
               </div>
             </div>
           </div>
         )}
         
         {/* Auto Install Wizard Modal */}
         <AnimatePresence>
           {showInstallWizard && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="w-full max-w-2xl bg-popover border border-border rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
               >
                 <h2 className="text-lg font-bold mb-4 text-popover-foreground flex items-center gap-2">
                   <Download className="w-5 h-5 text-emerald-500" />
                   自动安装 Z-Image 本地模型
                 </h2>
                 
                 {/* Prerequisites Check */}
                 {installPrereqs && (
                   <div className="mb-6 p-4 bg-secondary/30 rounded-lg">
                     <h3 className="text-sm font-medium mb-3">环境检测</h3>
                     <div className="space-y-2 text-xs">
                       {/* Git */}
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           {installPrereqs.prerequisites.git ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                           <span>Git</span>
                         </div>
                         {!installPrereqs.prerequisites.git && (
                           <span className="text-muted-foreground">请手动安装</span>
                         )}
                       </div>
                       
                       {/* CMake */}
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           {installPrereqs.prerequisites.cmake ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                           <span>CMake</span>
                         </div>
                         {!installPrereqs.prerequisites.cmake && (
                           <button
                             onClick={() => handleInstallPrerequisite('cmake')}
                             disabled={installingPrereq === 'cmake'}
                             className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] flex items-center gap-1 disabled:opacity-50"
                           >
                             {installingPrereq === 'cmake' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                             自动安装
                           </button>
                         )}
                       </div>
                       
                       {/* Python */}
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           {installPrereqs.prerequisites.python ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                           <span>Python</span>
                         </div>
                         {!installPrereqs.prerequisites.python && (
                           <span className="text-muted-foreground">请手动安装</span>
                         )}
                       </div>
                       
                       {/* HuggingFace CLI */}
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           {installPrereqs.prerequisites.huggingface ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                           <span>HuggingFace CLI</span>
                         </div>
                         {!installPrereqs.prerequisites.huggingface && installPrereqs.prerequisites.python && (
                           <button
                             onClick={() => handleInstallPrerequisite('huggingface')}
                             disabled={installingPrereq === 'huggingface'}
                             className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] flex items-center gap-1 disabled:opacity-50"
                           >
                             {installingPrereq === 'huggingface' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                             自动安装
                           </button>
                         )}
                         {!installPrereqs.prerequisites.huggingface && !installPrereqs.prerequisites.python && (
                           <span className="text-muted-foreground">需要先安装 Python</span>
                         )}
                       </div>
                       
                       {/* Xcode CLI Tools (macOS only) */}
                       {installPrereqs.prerequisites.xcode !== undefined && (
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             {installPrereqs.prerequisites.xcode ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                             <span>Xcode CLI Tools</span>
                           </div>
                           {!installPrereqs.prerequisites.xcode && (
                             <span className="text-muted-foreground text-[10px]">运行: xcode-select --install</span>
                           )}
                         </div>
                       )}
                     </div>
                     <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border">
                       安装目录: {installPrereqs.installDir}
                     </p>
                   </div>
                 )}
                 
                 {/* Model Variant Selection */}
                 <div className="mb-6">
                   <h3 className="text-sm font-medium mb-3">选择模型版本</h3>
                   <div className="grid grid-cols-2 gap-3">
                     {[
                       { id: 'q4', name: 'Q4 量化版', size: '~3GB', desc: '推荐，平衡质量和大小' },
                       { id: 'q8', name: 'Q8 量化版', size: '~6GB', desc: '高质量' },
                       { id: 'full', name: '完整版', size: '~12GB', desc: '最高质量' },
                       { id: 'q2', name: 'Q2 极限量化', size: '~1.5GB', desc: '最小，质量较低' },
                     ].map((v) => (
                       <button
                         key={v.id}
                         onClick={() => handleModelVariantChange(v.id as any)}
                         className={`p-3 rounded-lg border text-left transition-all ${
                           selectedModelVariant === v.id 
                             ? 'border-emerald-500 bg-emerald-500/10' 
                             : 'border-border hover:border-emerald-500/50'
                         }`}
                       >
                         <div className="flex justify-between items-start">
                           <span className="font-medium text-sm">{v.name}</span>
                           <span className="text-xs text-muted-foreground">{v.size}</span>
                         </div>
                         <p className="text-xs text-muted-foreground mt-1">{v.desc}</p>
                       </button>
                     ))}
                   </div>
                 </div>
                 
                 {/* One-liner copy */}
                 {installCommands && (
                   <div className="mb-6">
                     <h3 className="text-sm font-medium mb-2">一键复制安装命令</h3>
                     <div className="relative">
                       <div className="bg-secondary/50 p-3 pr-12 rounded-lg font-mono text-xs text-foreground overflow-x-auto max-h-20">
                         {installCommands.oneLiner}
                       </div>
                       <button
                         onClick={handleCopyOneLiner}
                         className="absolute right-2 top-2 p-2 bg-secondary hover:bg-secondary/80 rounded-md"
                       >
                         {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                       </button>
                     </div>
                     <p className="text-[10px] text-muted-foreground mt-1">
                       预计下载: {installCommands.estimatedSize}
                     </p>
                   </div>
                 )}
                 
                 {/* Install Logs */}
                 {installLogs.length > 0 && (
                   <div className="mb-6">
                     <h3 className="text-sm font-medium mb-2">安装日志</h3>
                     <div className="bg-secondary/30 p-3 rounded-lg max-h-40 overflow-y-auto">
                       {installLogs.map((log, idx) => (
                         <div key={idx} className="flex items-center gap-2 text-xs py-1">
                           {log.success ? (
                             <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                           ) : (
                             <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                           )}
                           <span className="font-medium">{log.step}:</span>
                           <span className="text-muted-foreground">{log.message}</span>
                         </div>
                       ))}
                       {installing && (
                         <div className="flex items-center gap-2 text-xs py-1">
                           <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                           <span>{installStep}...</span>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
                 
                 {/* Actions */}
                 <div className="flex justify-end gap-3 border-t border-border pt-4">
                   <button 
                     onClick={() => setShowInstallWizard(false)} 
                     className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm"
                   >
                     取消
                   </button>
                   <button
                     onClick={handleRunAutoInstall}
                     disabled={installing || !installPrereqs?.prerequisites.git || !installPrereqs?.prerequisites.cmake}
                     className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                   >
                     {installing ? (
                       <><Loader2 className="w-4 h-4 animate-spin" /> 安装中...</>
                     ) : (
                       <><Download className="w-4 h-4" /> 开始自动安装</>
                     )}
                   </button>
                 </div>
               </motion.div>
             </div>
           )}
         </AnimatePresence>
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
                                        <option value="GRSAI_NANO_BANANA">{t('models.models.option.grsaiNanaBanana')}</option>
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

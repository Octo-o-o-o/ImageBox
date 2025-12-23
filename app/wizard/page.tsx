'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Bot, Image as ImageIcon, Sparkles, Check, Key, Server, Box, HardDrive, Loader2, AlertTriangle, Wifi, Settings } from 'lucide-react';
import { saveProvider, saveModel, detectLocalHardwareAction, discoverLocalServicesAction, checkLocalServiceAction, quickSetupLocalModelAction } from '@/app/actions';
import { useLanguage } from '@/components/LanguageProvider';
import { MODEL_PRESETS } from '@/lib/modelParameters';

export default function WizardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState<'intro' | 'provider' | 'model' | 'local-detect' | 'local-service' | 'local-config' | 'finishing'>('intro');
  const [providerType, setProviderType] = useState<string>('GEMINI');
  const [providerName, setProviderName] = useState<string>('Google Gemini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('Gemini 1.5 Pro');
  const [modelId, setModelId] = useState('gemini-1.5-pro');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Local Model States
  const [localBackend, setLocalBackend] = useState('SD_CPP');
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [detecting, setDetecting] = useState(false);
  const [discoveredServices, setDiscoveredServices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleProviderSelect = async (type: string) => {
    setProviderType(type);
    if (type === 'GEMINI') {
      setProviderName('Google Gemini');
      setBaseUrl('');
      setModelName('Gemini 1.5 Pro');
      setModelId('gemini-1.5-pro');
      setStep('model');
    } else if (type === 'OPENAI') {
      setProviderName('OpenAI');
      setBaseUrl(''); // Official URL is default/empty
      setModelName('DALL-E 3');
      setModelId('dall-e-3');
      setStep('model');
    } else if (type === 'LOCAL') {
      // Start hardware detection for local model
      setProviderName('Local Z-Image');
      setBaseUrl('http://127.0.0.1:8080');
      setModelName('Z-Image Turbo');
      setModelId('z-image-turbo');
      setLocalBackend('SD_CPP');
      setStep('local-detect');
      
      // Detect hardware
      setDetecting(true);
      try {
        const hw = await detectLocalHardwareAction();
        setHardwareInfo(hw);
      } catch (e) {
        console.error('Hardware detection failed:', e);
      }
      setDetecting(false);
    } else {
      setProviderName('Custom Provider');
      setBaseUrl('');
      setModelName('Custom Model');
      setModelId('');
      setStep('model');
    }
  };
  
  // Handle local service discovery
  const handleScanLocalServices = async () => {
    setScanning(true);
    setDiscoveredServices([]);
    try {
      const services = await discoverLocalServicesAction();
      setDiscoveredServices(services);
    } catch (e) {
      console.error('Scan failed:', e);
    }
    setScanning(false);
  };
  
  // Test local service connection
  const handleTestLocalService = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const result = await checkLocalServiceAction(baseUrl);
      if (result.available) {
        setConnectionTestResult({ success: true, message: t('models.providers.testSuccess') });
        // Auto-detect backend type
        if (result.type) {
          if (result.type === 'SD_CPP') setLocalBackend('SD_CPP');
          else if (result.type === 'COMFYUI') setLocalBackend('COMFYUI');
        }
      } else {
        setConnectionTestResult({ success: false, message: result.error || t('models.providers.testFailed') });
      }
    } catch (e) {
      setConnectionTestResult({ success: false, message: t('models.providers.testFailed') });
    }
    setTestingConnection(false);
  };
  
  // Finish local model setup
  const handleFinishLocal = async () => {
    setIsSubmitting(true);
    try {
      // Get parameter config based on backend
      const presetKey = localBackend === 'COMFYUI' ? 'LOCAL_ZIMAGE_COMFYUI' : 'LOCAL_ZIMAGE_SDCPP';
      const parameterConfig = JSON.stringify(MODEL_PRESETS[presetKey as keyof typeof MODEL_PRESETS] || {});
      
      const result = await quickSetupLocalModelAction({
        providerName,
        serviceUrl: baseUrl,
        localBackend,
        modelName,
        modelIdentifier: modelId,
        parameterConfig,
      });
      
      if (result.success) {
        setStep('finishing');
        setTimeout(() => {
          router.refresh();
          router.push('/create');
        }, 1500);
      } else {
        alert(result.error || 'Setup failed');
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      alert('Setup failed: ' + (e instanceof Error ? e.message : String(e)));
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // 1. Save Provider
      const provider = await saveProvider({
        name: providerName,
        type: providerType,
        baseUrl: baseUrl || undefined,
        apiKey: apiKey,
      });

      // 2. Save Model
      await saveModel({
        name: modelName,
        modelIdentifier: modelId,
        type: 'IMAGE',
        providerId: provider.id,
        parameterConfig: '{}', // Default defaults
      });

      // 3. Redirect
      setStep('finishing');
      setTimeout(() => {
        router.refresh();
        router.push('/create');
      }, 1500);
      
    } catch (e) {
      console.error(e);
      alert('Setup failed: ' + (e instanceof Error ? e.message : String(e)));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-orange-500/25">
            <Box className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-orange-600 dark:from-white dark:to-white/70 mb-4">
            Welcome to ImageBox
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Your personal AI image creation studio. <br/>
            Let&apos;s configure your generation model to get started.
          </p>
        </div>

        {/* Card Content */}
        <div className="bg-card border border-border/50 rounded-3xl shadow-2xl p-8 min-h-[400px] flex flex-col justify-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Intro */}
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                   <div className="bg-secondary/30 p-4 rounded-2xl flex flex-col items-center gap-3 border border-border/50">
                      <ImageIcon className="w-8 h-8 text-orange-500" />
                      <span className="font-medium">Image Generation</span>
                   </div>
                   <div className="bg-secondary/30 p-4 rounded-2xl flex flex-col items-center gap-3 border border-border/50">
                      <Sparkles className="w-8 h-8 text-orange-400" />
                      <span className="font-medium">Direct Preview</span>
                   </div>
                </div>

                <div className="h-px bg-border/50 w-full max-w-md my-2" />

                <button
                  onClick={() => setStep('provider')}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium text-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  Start Configuration <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* Step 2: Choose Provider */}
            {step === 'provider' && (
              <motion.div
                key="provider"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold text-center">Choose your AI Provider</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'GEMINI', name: 'Google Gemini', icon: 'G', desc: 'Fast & Efficient', color: 'orange' },
                    { id: 'OPENAI', name: 'OpenAI', icon: 'O', desc: 'DALL-E 3 & more', color: 'orange' },
                    { id: 'CUSTOM', name: 'Custom / Proxy', icon: 'C', desc: 'Self-hosted / Other', color: 'zinc' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProviderSelect(p.id)}
                      className="flex flex-col items-center p-6 border border-border rounded-2xl hover:bg-secondary/50 hover:border-orange-500/50 transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-bold text-xl mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {p.icon}
                      </div>
                      <span className="font-semibold text-lg">{p.name}</span>
                      <span className="text-xs text-muted-foreground mt-1">{p.desc}</span>
                    </button>
                  ))}
                  
                  {/* Local Model Option */}
                  <button
                    onClick={() => handleProviderSelect('LOCAL')}
                    className="flex flex-col items-center p-6 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group text-left relative"
                  >
                    <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
                      {t('wizard.localBadge')}
                    </span>
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <HardDrive className="w-6 h-6 text-emerald-500 group-hover:text-white" />
                    </div>
                    <span className="font-semibold text-lg">{t('wizard.local')}</span>
                    <span className="text-xs text-muted-foreground mt-1">{t('wizard.localDesc')}</span>
                  </button>
                </div>
                <button onClick={() => setStep('intro')} className="w-full text-muted-foreground text-sm hover:underline">Back</button>
              </motion.div>
            )}

            {/* Step 3: Configure Details */}
            {step === 'model' && (
              <motion.div
                key="model"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-md mx-auto w-full"
              >
                <h2 className="text-2xl font-semibold text-center">Setup {providerName}</h2>
                
                <div className="space-y-4">
                  {/* API Key */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Key className="w-4 h-4" /> API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={`Enter your ${providerName} API Key`}
                      className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>

                  {/* Base URL (Optional/Custom) */}
                  {(providerType === 'CUSTOM' || providerType === 'OPENAI') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Server className="w-4 h-4" /> Base URL
                      </label>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">Optional for specific proxies.</p>
                    </div>
                  )}

                  {/* Model ID */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Bot className="w-4 h-4" /> Model ID
                    </label>
                    <input
                      type="text"
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      placeholder="e.g. dall-e-3"
                      className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                   <button 
                      onClick={() => setStep('provider')}
                      className="flex-1 py-3 rounded-xl font-medium border border-border hover:bg-secondary transition-colors"
                   >
                     Back
                   </button>
                   <button 
                      onClick={handleFinish}
                      disabled={!apiKey || !modelId || isSubmitting}
                      className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                     {isSubmitting ? 'Saving...' : 'Finish Setup'}
                   </button>
                </div>
              </motion.div>
            )}

            {/* Step: Local Hardware Detection */}
            {step === 'local-detect' && (
              <motion.div
                key="local-detect"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-md mx-auto w-full"
              >
                <h2 className="text-2xl font-semibold text-center">{t('wizard.detectingHardware')}</h2>
                
                {detecting ? (
                  <div className="flex flex-col items-center py-8">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                    <p className="text-muted-foreground">{t('wizard.detectingHardware')}</p>
                  </div>
                ) : hardwareInfo ? (
                  <div className="space-y-4">
                    {/* Hardware Info Card */}
                    <div className={`p-4 rounded-xl border ${
                      hardwareInfo.localModelSupport.supported 
                        ? 'bg-emerald-500/5 border-emerald-500/30' 
                        : 'bg-red-500/5 border-red-500/30'
                    }`}>
                      <div className="flex items-start gap-3 mb-3">
                        {hardwareInfo.localModelSupport.supported ? (
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <Check className="w-5 h-5 text-emerald-500" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          </div>
                        )}
                        <div>
                          <p className={`font-medium ${hardwareInfo.localModelSupport.supported ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {hardwareInfo.localModelSupport.supported 
                              ? (hardwareInfo.localModelSupport.level === 'experimental' ? t('wizard.hardwareSupportedExp') : t('wizard.hardwareSupported'))
                              : t('wizard.hardwareNotSupported')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{hardwareInfo.localModelSupport.reason}</p>
                        </div>
                      </div>
                      
                      {/* Hardware Details */}
                      <div className="text-xs text-muted-foreground space-y-1 font-mono bg-secondary/30 p-3 rounded-lg">
                        {hardwareInfo.gpu && (
                          <p>GPU: {hardwareInfo.gpu.name}</p>
                        )}
                        {hardwareInfo.appleChip && (
                          <>
                            <p>Chip: {hardwareInfo.appleChip.name}</p>
                            <p>Memory: {Math.round(hardwareInfo.appleChip.unifiedMemory / 1024)}GB</p>
                            <p>{t('wizard.availableMemory')}: ~{Math.round(hardwareInfo.appleChip.availableForAI / 1024)}GB</p>
                          </>
                        )}
                        {hardwareInfo.gpu?.vram && (
                          <p>VRAM: {Math.round(hardwareInfo.gpu.vram / 1024)}GB</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    {hardwareInfo.localModelSupport.supported ? (
                      <button
                        onClick={() => {
                          setStep('local-service');
                          handleScanLocalServices();
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                      >
                        Continue <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setStep('provider')}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-medium"
                      >
                        Choose Another Provider
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">Detection failed</p>
                    <button onClick={() => setStep('provider')} className="mt-4 text-primary hover:underline">Go back</button>
                  </div>
                )}
                
                <button onClick={() => setStep('provider')} className="w-full text-muted-foreground text-sm hover:underline">Back</button>
              </motion.div>
            )}
            
            {/* Step: Local Service Discovery */}
            {step === 'local-service' && (
              <motion.div
                key="local-service"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-md mx-auto w-full"
              >
                <h2 className="text-2xl font-semibold text-center">
                  {scanning ? t('wizard.scanningServices') : (discoveredServices.length > 0 ? t('wizard.servicesFound').replace('{{count}}', String(discoveredServices.length)) : t('wizard.noServicesFound'))}
                </h2>
                
                {scanning ? (
                  <div className="flex flex-col items-center py-8">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                    <p className="text-muted-foreground">{t('wizard.scanningServices')}</p>
                  </div>
                ) : discoveredServices.length > 0 ? (
                  <div className="space-y-3">
                    {discoveredServices.map((service, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setBaseUrl(service.url);
                          setLocalBackend(service.type === 'COMFYUI' ? 'COMFYUI' : 'SD_CPP');
                          setStep('local-config');
                        }}
                        className="w-full flex items-center justify-between p-4 bg-secondary/30 border border-border rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          <div className="text-left">
                            <p className="font-medium">{service.type}</p>
                            <p className="text-xs text-muted-foreground font-mono">{service.url}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm mb-4">{t('wizard.noServicesDesc')}</p>
                  </div>
                )}
                
                <div className="border-t border-border pt-4 space-y-3">
                  <button
                    onClick={() => setStep('local-config')}
                    className="w-full flex items-center justify-center gap-2 p-3 border border-border rounded-xl hover:bg-secondary/50 transition-all"
                  >
                    <Settings className="w-4 h-4" />
                    {t('wizard.manualAdd')}
                  </button>
                </div>
                
                <button onClick={() => setStep('local-detect')} className="w-full text-muted-foreground text-sm hover:underline">Back</button>
              </motion.div>
            )}
            
            {/* Step: Local Configuration */}
            {step === 'local-config' && (
              <motion.div
                key="local-config"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-md mx-auto w-full"
              >
                <h2 className="text-2xl font-semibold text-center">Configure {providerName}</h2>
                
                <div className="space-y-4">
                  {/* Service URL */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Server className="w-4 h-4" /> {t('wizard.serviceUrl')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => {
                          setBaseUrl(e.target.value);
                          setConnectionTestResult(null);
                        }}
                        placeholder={t('wizard.serviceUrlPlaceholder')}
                        className="flex-1 bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-mono"
                      />
                      <button
                        onClick={handleTestLocalService}
                        disabled={testingConnection || !baseUrl}
                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-sm font-medium disabled:opacity-50"
                      >
                        {testingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : t('models.providers.testConnection')}
                      </button>
                    </div>
                    {connectionTestResult && (
                      <p className={`text-xs flex items-center gap-1 ${connectionTestResult.success ? 'text-emerald-500' : 'text-red-500'}`}>
                        {connectionTestResult.success ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {connectionTestResult.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{t('wizard.serviceUrlHint')}</p>
                  </div>
                  
                  {/* Backend Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('models.providers.localBackend')}</label>
                    <select
                      value={localBackend}
                      onChange={(e) => setLocalBackend(e.target.value)}
                      className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    >
                      <option value="SD_CPP">{t('models.providers.backendSdCpp')}</option>
                      <option value="COMFYUI">{t('models.providers.backendComfyUI')}</option>
                      <option value="CUSTOM">{t('models.providers.backendCustom')}</option>
                    </select>
                  </div>
                  
                  {/* Model Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model Name</label>
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="Z-Image Turbo"
                      className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    />
                  </div>
                  
                  {/* Model ID */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model ID</label>
                    <input
                      type="text"
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      placeholder="z-image-turbo"
                      className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-mono"
                    />
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep('local-service')} 
                    className="flex-1 py-3 border border-border rounded-xl text-muted-foreground hover:bg-secondary/50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinishLocal}
                    disabled={isSubmitting || !baseUrl}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Finish Setup
                  </button>
                </div>
              </motion.div>
            )}

             {/* Step 4: Finishing */}
              {step === 'finishing' && (
              <motion.div
                key="finishing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                 <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-2">
                    <Check className="w-10 h-10" />
                 </div>
                 <h2 className="text-2xl font-bold">All Set!</h2>
                 <p className="text-muted-foreground">Redirecting you to the studio...</p>
                 <div className="loading-dots flex gap-1 justify-center mt-4">
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.0 }} className="w-2 h-2 bg-orange-500 rounded-full" />
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-orange-500 rounded-full" />
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-orange-500 rounded-full" />
                 </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

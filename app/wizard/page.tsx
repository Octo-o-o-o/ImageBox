'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Bot, Image as ImageIcon, Sparkles, Check, Key, Server, Box } from 'lucide-react';
import { saveProvider, saveModel } from '@/app/actions';

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<'intro' | 'provider' | 'model' | 'finishing'>('intro');
  const [providerType, setProviderType] = useState<string>('GEMINI');
  const [providerName, setProviderName] = useState<string>('Google Gemini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('Gemini 1.5 Pro');
  const [modelId, setModelId] = useState('gemini-1.5-pro');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProviderSelect = (type: string) => {
    setProviderType(type);
    if (type === 'GEMINI') {
      setProviderName('Google Gemini');
      setBaseUrl('');
      setModelName('Gemini 1.5 Pro');
      setModelId('gemini-1.5-pro');
    } else if (type === 'OPENAI') {
      setProviderName('OpenAI');
      setBaseUrl(''); // Official URL is default/empty
      setModelName('DALL-E 3');
      setModelId('dall-e-3');
    } else {
      setProviderName('Custom Provider');
      setBaseUrl('');
      setModelName('Custom Model');
      setModelId('');
    }
    setStep('model');
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
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20">
            <Box className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-white dark:to-white/70 mb-4">
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
                      <ImageIcon className="w-8 h-8 text-indigo-500" />
                      <span className="font-medium">Image Generation</span>
                   </div>
                   <div className="bg-secondary/30 p-4 rounded-2xl flex flex-col items-center gap-3 border border-border/50">
                      <Sparkles className="w-8 h-8 text-violet-500" />
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'GEMINI', name: 'Google Gemini', icon: 'G', desc: 'Fast & Efficient' },
                    { id: 'OPENAI', name: 'OpenAI', icon: 'O', desc: 'DALL-E 3 & more' },
                    { id: 'CUSTOM', name: 'Custom / Proxy', icon: 'C', desc: 'Self-hosted / Other' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProviderSelect(p.id)}
                      className="flex flex-col items-center p-6 border border-border rounded-2xl hover:bg-secondary/50 hover:border-indigo-500/50 transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-bold text-xl mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {p.icon}
                      </div>
                      <span className="font-semibold text-lg">{p.name}</span>
                      <span className="text-xs text-muted-foreground mt-1">{p.desc}</span>
                    </button>
                  ))}
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
                      className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-mono"
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
                      className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.0 }} className="w-2 h-2 bg-indigo-500 rounded-full" />
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-indigo-500 rounded-full" />
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-indigo-500 rounded-full" />
                 </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

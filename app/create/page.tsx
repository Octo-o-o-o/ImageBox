'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTemplates, generateImageAction, generateTextAction, saveGeneratedImage, getModels, getFolders, ensureDefaultFolder } from '@/app/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Image as ImageIcon, Sparkles, Copy, AlertCircle, RefreshCw, PenLine, Upload, X, Download, ZoomIn, Folder, AlertTriangle } from 'lucide-react';
import { getMaxRefImages, getModelParameters } from '@/lib/modelParameters';
import { useLanguage } from '@/components/LanguageProvider';
import { replaceTemplate } from '@/lib/i18n';

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", title: "Square" },
  { value: "2:3", label: "2:3", title: "Portrait" },
  { value: "3:2", label: "3:2", title: "Landscape" },
  { value: "3:4", label: "3:4", title: "Portrait Full" },
  { value: "4:3", label: "4:3", title: "Landscape Full" },
  { value: "4:5", label: "4:5", title: "Portrait" },
  { value: "5:4", label: "5:4", title: "Landscape" },
  { value: "9:16", label: "9:16", title: "Tall Portrait" },
  { value: "16:9", label: "16:9", title: "Wide" },
  { value: "21:9", label: "21:9", title: "Ultra Wide" },
];

type Template = {
  id: string;
  name: string;
  promptTemplate: string;
  systemPrompt?: string | null;
  promptGeneratorId?: string | null;
  imageGeneratorId?: string | null;
  defaultParams: string;
};

function StudioPageContent() {
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const { t } = useLanguage();
  const tr = (key: string, vars?: Record<string, string | number>) => vars ? replaceTemplate(t(key), vars) : t(key);

  // Generation State
  const [templatePrompt, setTemplatePrompt] = useState(''); // The prompt with {{vars}} or the raw prompt gen prompt
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [variableKeys, setVariableKeys] = useState<string[]>([]);

  const [finalImagePrompt, setFinalImagePrompt] = useState(''); // The result of "Generate Prompt"
  const [_isPromptGenerated, setIsPromptGenerated] = useState(false); // Reserved for future use

  // Configuration Overrides
  const [selectedPromptModelId, setSelectedPromptModelId] = useState('');
  const [selectedImageModelId, setSelectedImageModelId] = useState('');

  // Status
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  // Results
  const [results, setResults] = useState<{ id: string, url: string, prompt: string }[]>([]);

  // Config State
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('1K');
  const [returnType, setReturnType] = useState('IMAGE'); // IMAGE or TEXT_IMAGE
  const [refImages, setRefImages] = useState<{file: File, preview: string, base64: string, width: number, height: number}[]>([]);
  const [maxRefImages, setMaxRefImages] = useState<number>(14); // Dynamically adjusted based on model config
  const [supportedParams, setSupportedParams] = useState<string[]>(['aspectRatio', 'imageSize', 'responseModalities', 'refImagesEnabled']); // Params supported by current model
  const [toast, setToast] = useState<{ message: string } | null>(null);

  const ASPECT_RATIO_ORIGINAL = "ORIGINAL";

  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  // Drag State
  const [isDragging, setIsDragging] = useState(false);

  // Image Preview State
  const [previewImage, setPreviewImage] = useState<{ url: string, prompt: string } | null>(null);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (message: string) => {
      setToast({ message });
      setTimeout(() => setToast(null), 3000);
  };

  const processFiles = async (files: File[]) => {
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      const currentCount = refImages.length;
      const availableSlots = maxRefImages - currentCount;

      if (availableSlots <= 0) {
          showToast(tr('create.toast.limitExceeded', { count: imageFiles.length }));
          return;
      }

      let filesToProcess = imageFiles;
      if (imageFiles.length > availableSlots) {
          filesToProcess = imageFiles.slice(0, availableSlots);
          showToast(tr('create.toast.limitExceeded', { count: imageFiles.length - availableSlots }));
      }

      // Reset error
      setError('');
      setWarning('');

      const newImages: {file: File, preview: string, base64: string, width: number, height: number}[] = [];

      for (const file of filesToProcess) {
          // Check file size
          const MAX_SIZE = 30 * 1024 * 1024; 
          if (file.size > MAX_SIZE) {
               setError(tr('create.error.fileTooLarge', { name: file.name, size: (file.size / 1024 / 1024).toFixed(2) }));
               continue;
          }

          try {
              const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
              });

              const { width, height } = await new Promise<{width: number, height: number}>((resolve, reject) => {
                  const img = new Image();
                  img.onload = () => resolve({ width: img.width, height: img.height });
                  img.onerror = reject;
                  img.src = base64;
              });

              // Check resolution warning
              const MIN_RESOLUTION = 512;
              if (width < MIN_RESOLUTION || height < MIN_RESOLUTION) {
                  // We can still accumulate warnings if needed, or just let it slide as user removed the yellow warning request
                  // Keeping it minimal as requested
              }

              newImages.push({
                  file,
                  preview: URL.createObjectURL(file),
                  base64,
                  width,
                  height
              });

          } catch (e) {
              console.error("Error processing file", file.name, e);
              setError(tr('create.error.fileRead', { name: file.name }));
          }
      }
      
      if (newImages.length > 0) {
          setRefImages(prev => [...prev, ...newImages]);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          processFiles(Array.from(e.target.files));
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFiles(Array.from(e.dataTransfer.files));
      }
  };

  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
  };

  const onDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set to false if we are leaving the main container
      // (checking relatedTarget is one way, but simpler here is to rely on the overlay)
      
      // If the related target is outside the current target (the container), then we left.
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
          return;
      }
      setIsDragging(false);
  };

  useEffect(() => {
      const handlePaste = (e: ClipboardEvent) => {
           if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
               processFiles(Array.from(e.clipboardData.files));
           }
      };
      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
  }, [refImages, maxRefImages]); // Re-bind when state changes to capture correct closure limits OR use functional updates (but processFiles uses limit)
  // Actually processFiles uses refImages.length. To avoid stale closures, processFiles should be in dependency, or use ref inside.
  // Better: use functional upgrade in processFiles logic? 
  // Wait, `processFiles` reads `refImages.length`. If I don't put it in dependencies, `handlePaste` which calls `processFiles` will see old `refImages`.
  // So [refImages, maxRefImages] is correct, but frequent re-binding. It's fine for this page.

  const getEffectiveAspectRatio = (): string => {
      if (refImages.length === 0) return "1:1";

      // 1. Calculate stats for each image against candidates
      const counts: Record<string, { count: number, maxRes: number }> = {};
      
      // Initialize counts
      ASPECT_RATIOS.forEach(r => counts[r.value] = { count: 0, maxRes: 0 });

      refImages.forEach(img => {
          const imgRatio = img.width / img.height;
          
          // Find closest candidate
          let bestRatio = "1:1";
          let minDiff = Number.MAX_VALUE;

          ASPECT_RATIOS.forEach(r => {
              const [w, h] = r.value.split(':').map(Number);
              const targetRatio = w / h;
              const diff = Math.abs(imgRatio - targetRatio);
              if (diff < minDiff) {
                  minDiff = diff;
                  bestRatio = r.value;
              }
          });

          // Update stats
          if (counts[bestRatio]) {
              counts[bestRatio].count++;
              counts[bestRatio].maxRes = Math.max(counts[bestRatio].maxRes, Math.max(img.width, img.height)); // "Resolution big" - simply using max dimension or area? User said "resolution big". I'll use area.
              // Actually let's use area
          }
      });
      
      // Find winner
      let winner = "1:1";
      let maxCount = -1;
      let winnerMaxRes = -1;

      Object.entries(counts).forEach(([ratio, stats]) => {
          if (stats.count > maxCount) {
              maxCount = stats.count;
              winner = ratio;
              winnerMaxRes = stats.maxRes;
          } else if (stats.count === maxCount) {
              if (stats.maxRes > winnerMaxRes) {
                  winner = ratio;
                  winnerMaxRes = stats.maxRes;
              }
          }
      });

      return winner;
  };

  const removeImage = (index: number) => {
      setRefImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    getTemplates().then(setTemplates);
    getModels().then(setModels);

    // Load folders and set default
    getFolders().then(folderList => {
      setFolders(folderList);
      const defaultFolder = folderList.find((f: any) => f.isDefault);
      if (defaultFolder) {
        setSelectedFolderId(defaultFolder.id);
      }
    });
  }, []);

  // Read URL parameters for recreating from library
  useEffect(() => {
    if (models.length === 0) return; // Wait for models to load
    
    const prompt = searchParams.get('prompt');
    const modelName = searchParams.get('model');
    const paramsStr = searchParams.get('params');

    if (prompt) {
      setFinalImagePrompt(prompt);
      setIsPromptGenerated(true);
    }

    if (modelName && models.length > 0) {
      // Try to find model by name
      const model = models.find(m => m.name === modelName || m.modelIdentifier === modelName);
      if (model) {
        setSelectedImageModelId(model.id);
      }
    }

    if (paramsStr) {
      try {
        const params = JSON.parse(paramsStr);
        if (params.aspectRatio) setAspectRatio(params.aspectRatio);
        if (params.imageSize) setResolution(params.imageSize);
        if (params.responseModalities) {
          const hasText = params.responseModalities.includes('TEXT');
          setReturnType(hasText ? 'TEXT_IMAGE' : 'IMAGE');
        }
      } catch (e) {
        console.error('Failed to parse params from URL:', e);
      }
    }
  }, [searchParams, models]);

  // Update maxRefImages and supportedParams when image model changes
  useEffect(() => {
    if (selectedImageModelId && models.length > 0) {
      const selectedModel = models.find(m => m.id === selectedImageModelId);
      if (selectedModel && selectedModel.parameterConfig) {
        // Get max ref images
        const max = getMaxRefImages(selectedModel.parameterConfig);
        setMaxRefImages(max);

        // Get supported parameters
        const params = getModelParameters(selectedModel.parameterConfig);
        const paramKeys = params.map(p => p.key);
        setSupportedParams(paramKeys);

        // If current ref images exceed the new limit, show warning and trim
        if (refImages.length > max) {
          setWarning(tr('create.warning.limitTrimmed', { count: max }));
          setRefImages(prev => prev.slice(0, max));
        }
      } else {
        // Default to all params if no config
        setSupportedParams(['aspectRatio', 'imageSize', 'responseModalities', 'refImagesEnabled']);
        setMaxRefImages(14);
      }
    }
  }, [selectedImageModelId, models]);

  // Check aspect ratio mismatch when aspect ratio changes


  useEffect(() => {
    if (selectedTemplateId) {
      const tmpl = templates.find(t => t.id === selectedTemplateId);
      if (tmpl) {
        setTemplatePrompt(tmpl.promptTemplate);
        if (tmpl.promptGeneratorId) setSelectedPromptModelId(tmpl.promptGeneratorId);
        if (tmpl.imageGeneratorId) setSelectedImageModelId(tmpl.imageGeneratorId);
        
        // Apply default params from template
        try {
          const defaultParams = JSON.parse(tmpl.defaultParams || '{}');
          if (defaultParams.aspectRatio) setAspectRatio(defaultParams.aspectRatio);
          if (defaultParams.resolution) setResolution(defaultParams.resolution);
        } catch (e) {
          console.error('Failed to parse template defaultParams:', e);
        }
        
        // Extract variables {{var}}
        const regex = /\{\{([^}]+)\}\}/g;
        const matches = [...tmpl.promptTemplate.matchAll(regex)];
        const keys = Array.from(new Set(matches.map(m => m[1]))).filter(k => k !== 'user_input');
        setVariableKeys(keys);
        setVariables(keys.reduce((acc, k) => ({...acc, [k]: ''}), {}));
        
        setFinalImagePrompt('');
        setIsPromptGenerated(false);
      }
    } else {
         // Custom Mode
         setTemplatePrompt('');
         setVariableKeys([]);
         setFinalImagePrompt('');
         setIsPromptGenerated(true); // In custom mode, you write directly
    }
  }, [selectedTemplateId, templates]);

  // Step 1: Generate Prompt (if using template)
  const [lastPromptRunId, setLastPromptRunId] = useState<string | undefined>(undefined);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);

  const handleGeneratePrompt = async () => {
    // If no optimizer is selected, we can't really "optimize".
    // But check if we are in "Variable Mode" or "Direct Mode"
    const inputPrompt = finalImagePrompt || templatePrompt; 

    if (!inputPrompt) return; // Nothing to optimize

    // If variables exist and we haven't compiled them yet into finalImagePrompt, do that first?
    let promptToProcess = templatePrompt;
    
    // Inject Main Textarea content as user_input
    promptToProcess = promptToProcess.replace(/\{\{user_input\}\}/g, finalImagePrompt);

    // Inject other variables
    for (const k of variableKeys) {
        promptToProcess = promptToProcess.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), variables[k]);
    }

    if (!selectedPromptModelId) {
        // Just fill variables if no optimizer
        setFinalImagePrompt(promptToProcess);
        setIsPromptGenerated(true);
        return;
    }

    setGeneratingPrompt(true);
    setError('');
    
    // Save current state for Undo
    setPreviousPrompt(promptToProcess);

    try {
        const tmpl = templates.find(t => t.id === selectedTemplateId);
        // Pass variables as config if needed
        const res = await generateTextAction(selectedPromptModelId, promptToProcess, tmpl?.systemPrompt || undefined, { variables });
        
        if (res.success && res.text) {
            setFinalImagePrompt(res.text);
            setIsPromptGenerated(true);
            setLastPromptRunId(res.runId);
        } else {
            setError(res.error || tr('create.error.promptGenerateFail'));
        }
    } catch (e: any) {
        setError(e.message);
    } finally {
        setGeneratingPrompt(false);
    }
  };

  const handleUndoPrompt = () => {
      if (previousPrompt !== null) {
          setFinalImagePrompt(previousPrompt);
          setPreviousPrompt(null);
      }
  };

  // Step 2: Generate Image
  const handleGenerateImage = async () => {
    if (!finalImagePrompt.trim() || !selectedImageModelId) {
        setError(tr('create.error.imageGeneratePrereq'));
        return;
    }

    // If there are existing results, show confirmation
    if (results.length > 0) {
        setConfirmDialog({
          isOpen: true,
          title: tr('create.confirmRegenerate.title'),
          message: tr('create.confirmRegenerate.message'),
          onConfirm: () => performImageGeneration(),
        });
        return;
    }

    performImageGeneration();
  };

  // Perform the actual image generation
  const performImageGeneration = async () => {
    setGeneratingImage(true);
    setError('');

    try {
      const effectiveRatio = aspectRatio === ASPECT_RATIO_ORIGINAL ? getEffectiveAspectRatio() : aspectRatio;
      const params = {
          aspectRatio: effectiveRatio,
          imageSize: resolution,
          responseModalities: returnType === 'TEXT_IMAGE' ? ['TEXT', 'IMAGE'] : ['IMAGE'],
          refImages: refImages.map(img => img.base64) // Pass base64 strings
      };

      // Pass lastPromptRunId as parentTaskId, selectedTemplateId, and selectedFolderId
      const res = await generateImageAction(selectedImageModelId, finalImagePrompt, params, lastPromptRunId, selectedTemplateId || undefined, selectedFolderId || undefined);

      if (res.success && res.images) {
        const newImages = res.images as { id: string, url: string, prompt: string }[];
        setResults(newImages); // Replace instead of prepend when regenerating
      } else {
        setError(res.error || tr('create.error.unknown'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingImage(false);
    }
  };

  // Download image
  const handleDownloadImage = (url: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prompt.substring(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy image to clipboard
  const handleCopyImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert(tr('create.copy.success'));
    } catch (err) {
      console.error('copy failed:', err);
      alert(tr('create.copy.fail'));
    }
  };

  const promptModels = models.filter(m => m.type === 'TEXT');
  const imageModels = models.filter(m => m.type === 'IMAGE');

  return (
    <div 
      className="h-[calc(100vh-6rem)] flex gap-4 relative"
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      
      {/* 1. Parameters Column */}
      <div className="w-[320px] flex-none flex flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-6 p-5 rounded-2xl bg-card border border-border backdrop-blur-md min-h-full shadow-sm">
            
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Wand2 className="w-5 h-5 text-primary" />
                {tr('create.title')}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">{tr('create.subtitle')}</p>
            </div>

            {/* Template */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">{tr('create.templateLabel')}</label>
                <div className="relative">
                    <select 
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full appearance-none bg-secondary/30 hover:bg-secondary/50 transition-colors rounded-xl px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                        <option value="">{tr('create.template.customOption')}</option>
                        {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>

             {/* Input Variables */}
            {selectedTemplateId && variableKeys.length > 0 && (
                <div className="p-3 bg-secondary/20 rounded-xl border border-border space-y-3">
                    <h3 className="text-xs font-bold text-foreground/80 uppercase flex items-center gap-2">
                        <PenLine className="w-3 h-3" /> {tr('create.variables.title')}
                    </h3>
                    {variableKeys.map(key => (
                        <div key={key}>
                            <label className="text-xs text-muted-foreground block mb-1">{key}</label>
                            <input 
                                value={variables[key]}
                                onChange={e => setVariables(p => ({...p, [key]: e.target.value}))}
                                className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none"
                                placeholder={tr('create.variables.placeholder', { key })}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Image Model */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">{tr('create.imageModelLabel')}</label>
                <div className="relative">
                    <select 
                        value={selectedImageModelId}
                        onChange={(e) => setSelectedImageModelId(e.target.value)}
                        className="w-full appearance-none bg-secondary/30 hover:bg-secondary/50 transition-colors rounded-xl px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                        <option value="">{tr('create.imageModelPlaceholder')}</option>
                        {imageModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>

            {/* Aspect Ratio - Only show if model supports aspectRatio */}
            {supportedParams.includes('aspectRatio') && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">{tr('create.aspectRatioLabel')}</label>
                
                {/* Follow Original Button - Full Width */}
                <button
                    onClick={() => setAspectRatio(ASPECT_RATIO_ORIGINAL)}
                    className={`w-full relative py-2.5 px-3 rounded-xl text-xs font-medium transition-all duration-200 border flex items-center justify-center gap-2 ${
                        aspectRatio === ASPECT_RATIO_ORIGINAL
                        ? 'bg-primary/5 border-primary/20 text-primary shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)]'
                        : 'bg-secondary/30 border-transparent hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <span className="truncate">{tr('create.aspectRatio.original')}</span>
                    {aspectRatio === ASPECT_RATIO_ORIGINAL && refImages.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                            {getEffectiveAspectRatio()}
                        </span>
                    )}
                </button>

                <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map(ratio => {
                        const [w, h] = ratio.value.split(':').map(Number);
                        const aspect = w / h;
                        const isWide = aspect >= 1;
                        const width = isWide ? 24 : 24 * aspect;
                        const height = isWide ? 24 / aspect : 24;

                        return (
                        <button
                        key={ratio.value}
                        onClick={() => setAspectRatio(ratio.value)}
                        className={`group relative py-2 px-1 rounded-xl text-xs font-medium transition-all duration-200 border ${
                            aspectRatio === ratio.value
                            ? 'bg-primary/5 border-primary/20 text-primary shadow-sm'
                            : 'bg-secondary/30 border-transparent hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                        }`}
                        >   
                            <div className="flex flex-col items-center gap-1.5">
                                <span className="truncate w-full text-center">{ratio.label}</span>
                            </div>

                             {/* Visual Tooltip */}
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-popover text-popover-foreground border border-border/50 p-2 rounded-xl shadow-xl z-[100] pointer-events-none scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all origin-bottom duration-200">
                                <div className="w-8 h-8 flex items-center justify-center bg-secondary/50 rounded-lg mb-1">
                                    <div 
                                        className="bg-primary rounded-[2px]"
                                        style={{ width: `${width}px`, height: `${height}px` }}
                                    />
                                </div>
                                <span className="text-[10px] whitespace-nowrap opacity-70">{ratio.title}</span>
                            </div>
                        </button>
                        );
                    })}
                </div>
              </div>
            )}

            {/* Resolution - Only show if model supports imageSize */}
            {supportedParams.includes('imageSize') && (
              <div className="space-y-3">
                  <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">{tr('create.resolutionLabel')}</label>
                  <div className="relative">
                    <select
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        className="w-full appearance-none bg-secondary/30 hover:bg-secondary/50 transition-colors rounded-xl px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                    <option value="1K">1024x1024 (1K)</option>
                    <option value="2K">2048x2048 (2K)</option>
                    <option value="4K">4096x4096 (4K)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
              </div>
            )}

            {/* Return Type */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">{tr('create.returnTypeLabel')}</label>
                <div className="relative">
                    <select
                        value={returnType}
                        onChange={(e) => setReturnType(e.target.value as 'IMAGE' | 'TEXT_IMAGE')}
                        className="w-full appearance-none bg-secondary/30 hover:bg-secondary/50 transition-colors rounded-xl px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                    <option value="IMAGE">{tr('create.returnType.imageOnly')}</option>
                    <option value="TEXT_IMAGE">{tr('create.returnType.imageText')}</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>

            {/* Folder Selection */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
                  <Folder className="w-3 h-3" />
                  {tr('create.folderLabel')}
                </label>
                <div className="relative">
                    <select
                        value={selectedFolderId}
                        onChange={(e) => setSelectedFolderId(e.target.value)}
                        className="w-full appearance-none bg-secondary/30 hover:bg-secondary/50 transition-colors rounded-xl px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                    {folders.map(folder => (
                        <option key={folder.id} value={folder.id}>
                        {folder.name} {folder.isDefault ? `(${tr('create.folderDefault')})` : ''}
                        </option>
                    ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. Prompt & Upload Column */}
      <div className="w-[440px] flex-none flex flex-col gap-4">
          
          <div className="flex-1 flex flex-col gap-6 p-5 rounded-2xl bg-card border border-border backdrop-blur-md overflow-y-auto">
             
            {/* Final Image Prompt & Optimizer */}
            <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{tr('create.promptLabel')}</label>
                    {selectedPromptModelId && (
                         <span className="text-[10px] items-center gap-1.5 text-muted-foreground hidden group-hover:flex">
                             <Sparkles className="w-3 h-3 text-primary" />
                             {promptModels.find(m=>m.id===selectedPromptModelId)?.name}
                         </span>
                    )}
                </div>
                
                <div className="relative flex-1 flex flex-col group">
                    <textarea
                        value={finalImagePrompt}
                        onChange={(e) => setFinalImagePrompt(e.target.value)}
                        className="w-full h-full min-h-[220px] bg-secondary/30 hover:bg-secondary/40 transition-colors rounded-xl p-4 pb-14 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none font-mono text-foreground placeholder-muted-foreground/50 leading-relaxed custom-scrollbar"
                        placeholder={selectedPromptModelId ? tr('create.promptPlaceholderWithModel') : tr('create.promptPlaceholder')}
                    />
                    
                    {/* Inner Toolbar */}
                    <div className="absolute bottom-2 right-2 left-2 flex items-center justify-between p-1">
                        <div className='flex items-center gap-2'>
                             {/* Undo Button */}
                             {previousPrompt !== null && (
                                <button
                                    onClick={handleUndoPrompt}
                                    className="p-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center gap-1.5"
                                    title={tr('create.undoTooltip')}
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>{tr('create.undo')}</span>
                                </button>
                             )}
                        </div>

                        <div>
                            {/* Optimizer Button */}
                            {selectedPromptModelId && (
                                <button
                                    onClick={handleGeneratePrompt}
                                    disabled={generatingPrompt || !finalImagePrompt.trim()}
                                    className="py-2 px-4 bg-primary/90 hover:bg-primary text-primary-foreground rounded-lg text-xs font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2 backdrop-blur-sm"
                                >
                                    {generatingPrompt ? (
                                        <LoaderSpin />
                                    ) : (
                                        <Wand2 className="w-3.5 h-3.5" />
                                    )}
                                    {generatingPrompt ? tr('create.optimizeLoading') : tr('create.optimize')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

             {/* Reference Images */}
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">{tr('create.refImages.label')}</label>
                    {maxRefImages > 0 && (
                        <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-md">
                            {refImages.length}/{maxRefImages}
                        </span>
                    )}
                    {maxRefImages === 0 && (
                        <span className="text-[10px] text-yellow-500 font-medium">{tr('create.refImages.unsupported')}</span>
                    )}
                </div>
                {/* Drop Zone (Visual only now, logic handled by parent) */}
                <div 
                  className={`grid grid-cols-4 gap-2 min-h-[80px] rounded-xl transition-all duration-300 ${maxRefImages > 0 ? 'border-2 border-dashed border-border/20 hover:border-primary/20 hover:bg-primary/5' : ''}`}
                >
                    {refImages.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-secondary/20 group">
                        <img src={img.preview} alt={tr('create.refImages.alt', { index: index + 1 })} className="w-full h-full object-cover" />
                        <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-destructive/80 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                        >
                        <X className="w-3 h-3" />
                        </button>
                    </div>
                    ))}
                    {refImages.length < maxRefImages && maxRefImages > 0 && (
                    <label className="flex flex-col items-center justify-center aspect-square rounded-lg border border-dashed border-border/40 text-muted-foreground/50 cursor-pointer hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all">
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                        <Upload className="w-5 h-5 mb-1 opacity-70" />
                        <span className="text-[9px] font-medium opacity-70">{tr('create.upload')}</span>
                    </label>
                    )}
                </div>
            </div>

          </div>

          <div className="p-0 space-y-3">
             {warning && (
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex gap-2 items-start">
                   <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                   <div className="whitespace-pre-line">{warning}</div>
                </div>
             )}

             {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-start">
                   <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                   <div>{error}</div>
                </div>
             )}

             <button
                onClick={handleGenerateImage}
                disabled={generatingImage || !finalImagePrompt || !selectedImageModelId}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                {generatingImage ? (
                   <>
                     <LoaderSpin />
                     {tr('create.generating')}
                   </>
                ) : results.length > 0 ? (
                   <>
                     <RefreshCw className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     {tr('create.regenerate')}
                   </>
                ) : (
                   <>
                     <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     {tr('create.generate')}
                   </>
                )}
              </button>
          </div>
      </div>

      {/* 3. Results Column */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="h-full p-5 rounded-2xl bg-card border border-border backdrop-blur-md overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-4">
            <AnimatePresence mode='popLayout'>
                {results.map((res) => (
                <motion.div
                    key={res.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full rounded-2xl overflow-hidden bg-card border border-border group shadow-sm hover:shadow-md transition-shadow"
                >
                    <img
                        src={res.url}
                        alt={res.prompt}
                        className="w-full h-auto object-contain cursor-zoom-in"
                        onClick={() => setPreviewImage({ url: res.url, prompt: res.prompt })}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end pointer-events-none">
                        <p className="text-xs text-white/90 line-clamp-2 mb-3 font-medium">{res.prompt}</p>
                        <div className="flex gap-2 pointer-events-auto">
                            <button
                                onClick={() => setPreviewImage({ url: res.url, prompt: res.prompt })}
                                className="p-2 rounded-lg bg-white/10 hover:bg-indigo-500 text-white transition-colors backdrop-blur-sm"
                                title={tr('create.preview.view')}
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleCopyImage(res.url)}
                                className="p-2 rounded-lg bg-white/10 hover:bg-indigo-500 text-white transition-colors backdrop-blur-sm"
                                title={tr('create.preview.copy')}
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDownloadImage(res.url, res.prompt)}
                                className="p-2 rounded-lg bg-white/10 hover:bg-indigo-500 text-white transition-colors backdrop-blur-sm"
                                title={tr('create.preview.download')}
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
                ))}
            </AnimatePresence>

            {results.length === 0 && !generatingImage && (
                <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="font-medium text-muted-foreground">{tr('create.empty.title')}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{tr('create.empty.desc')}</p>
                </div>
            )}

            {generatingImage && (
                <div className="w-full aspect-square max-h-[500px] rounded-2xl bg-card/50 animate-pulse border border-border flex flex-col items-center justify-center gap-3">
                    <LoaderSpin />
                    <span className="text-xs text-muted-foreground animate-pulse">{tr('create.generatingPlaceholder')}</span>
                </div>
            )}
            </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                title={tr('create.close')}
              >
                <X className="w-6 h-6" />
              </button>

              {/* Image */}
              <img
                src={previewImage.url}
                alt={previewImage.prompt}
                className="w-full h-auto max-h-[calc(90vh-80px)] object-contain rounded-2xl"
              />

              {/* Actions Bar */}
              <div className="mt-4 p-4 rounded-2xl bg-zinc-900/80 border border-white/5 backdrop-blur-md">
                <p className="text-sm text-zinc-300 mb-3 line-clamp-2">{previewImage.prompt}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyImage(previewImage.url)}
                    className="flex-1 py-2 px-4 rounded-lg bg-white/10 hover:bg-primary text-white transition-colors backdrop-blur-sm flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Copy className="w-4 h-4" />
                    {tr('create.preview.copy')}
                  </button>
                  <button
                    onClick={() => handleDownloadImage(previewImage.url, previewImage.prompt)}
                    className="flex-1 py-2 px-4 rounded-lg bg-white/10 hover:bg-indigo-500 text-white transition-colors backdrop-blur-sm flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    {tr('create.preview.download')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 pb-4 border-b border-white/5">
                <h3 className="text-lg font-bold text-white">{confirmDialog.title}</h3>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>

              {/* Actions */}
              <div className="p-6 pt-4 flex gap-3">
                <button
                  onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                  className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                >
                  {tr('create.cancel')}
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  {tr('create.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <StudioPageContent />
    </Suspense>
  );
}

function LoaderSpin() {
    return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
}

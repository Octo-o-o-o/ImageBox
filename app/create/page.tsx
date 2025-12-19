'use client';

import { useState, useEffect } from 'react';
import { getTemplates, generateImageAction, generateTextAction, saveGeneratedImage, getModels, getFolders, ensureDefaultFolder } from '@/app/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Image as ImageIcon, Sparkles, Copy, AlertCircle, RefreshCw, PenLine, Upload, X, Download, ZoomIn, Folder } from 'lucide-react';

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", title: "正方形" },
  { value: "2:3", label: "2:3", title: "竖版" },
  { value: "3:2", label: "3:2", title: "横版" },
  { value: "3:4", label: "3:4", title: "竖版全屏" },
  { value: "4:3", label: "4:3", title: "横版全屏" },
  { value: "4:5", label: "4:5", title: "竖版" },
  { value: "5:4", label: "5:4", title: "横版" },
  { value: "9:16", label: "9:16", title: "竖版加长" },
  { value: "16:9", label: "16:9", title: "横版加宽" },
  { value: "21:9", label: "21:9", title: "超宽屏" },
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

export default function StudioPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Generation State
  const [templatePrompt, setTemplatePrompt] = useState(''); // The prompt with {{vars}} or the raw prompt gen prompt
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [variableKeys, setVariableKeys] = useState<string[]>([]);

  const [finalImagePrompt, setFinalImagePrompt] = useState(''); // The result of "Generate Prompt"
  const [isPromptGenerated, setIsPromptGenerated] = useState(false);

  // Configuration Overrides
  const [selectedPromptModelId, setSelectedPromptModelId] = useState('');
  const [selectedImageModelId, setSelectedImageModelId] = useState('');

  // Status
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [error, setError] = useState('');

  // Results
  const [results, setResults] = useState<{ id: string, url: string, prompt: string }[]>([]);

  // Config State
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('1K');
  const [returnType, setReturnType] = useState('IMAGE'); // IMAGE or TEXT_IMAGE
  const [refImages, setRefImages] = useState<{file: File, preview: string, base64: string}[]>([]);

  // Folder State
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  // Image Preview State
  const [previewImage, setPreviewImage] = useState<{ url: string, prompt: string } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const newFiles = Array.from(e.target.files);
          if (refImages.length + newFiles.length > 14) {
              setError("最多可添加 14 张参考图。");
              return;
          }
          
          newFiles.forEach(file => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  setRefImages(prev => [...prev, {
                      file,
                      preview: URL.createObjectURL(file), // for preview
                      base64: reader.result as string
                  }]);
              };
              reader.readAsDataURL(file);
          });
      }
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

  useEffect(() => {
    if (selectedTemplateId) {
      const tmpl = templates.find(t => t.id === selectedTemplateId);
      if (tmpl) {
        setTemplatePrompt(tmpl.promptTemplate);
        if (tmpl.promptGeneratorId) setSelectedPromptModelId(tmpl.promptGeneratorId);
        if (tmpl.imageGeneratorId) setSelectedImageModelId(tmpl.imageGeneratorId);
        
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
            setError(res.error || '生成提示词失败');
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
        setError('请先选择图像模型并准备好提示词。');
        return;
    }

    // If there are existing results, show confirmation
    if (results.length > 0) {
        const confirmed = window.confirm(
            '重新生成将清空当前的图片结果。\n\n确定要继续吗？之前生成的图片仍会保存在资料库中。'
        );
        if (!confirmed) return;
    }

    setGeneratingImage(true);
    setError('');

    try {
      const params = {
          aspectRatio,
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
        setError(res.error || '发生未知错误');
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
      alert('图片已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请重试');
    }
  };

  const promptModels = models.filter(m => m.type === 'TEXT');
  const imageModels = models.filter(m => m.type === 'IMAGE');

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-4">
      
      {/* 1. Parameters Column */}
      <div className="w-[320px] flex-none flex flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-6 p-5 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md min-h-full">
            
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-400" />
                生成图片
              </h2>
              <p className="text-zinc-500 text-sm mt-1">配置生成参数与模型。</p>
            </div>

            {/* Template */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">模板</label>
                <select 
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none text-white"
                >
                    <option value="">自定义（直接输入）</option>
                    {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

             {/* Input Variables */}
            {selectedTemplateId && variableKeys.length > 0 && (
                <div className="p-3 bg-zinc-800/30 rounded-xl border border-white/5 space-y-3">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase flex items-center gap-2">
                        <PenLine className="w-3 h-3" /> 变量输入
                    </h3>
                    {variableKeys.map(key => (
                        <div key={key}>
                            <label className="text-xs text-zinc-500 block mb-1">{key}</label>
                            <input 
                                value={variables[key]}
                                onChange={e => setVariables(p => ({...p, [key]: e.target.value}))}
                                className="w-full bg-black/20 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none"
                                placeholder={`填写 ${key}...`}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Image Model */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">图像模型</label>
                <select 
                    value={selectedImageModelId}
                    onChange={(e) => setSelectedImageModelId(e.target.value)}
                    className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                    <option value="">请选择模型</option>
                    {imageModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">画幅比例</label>
                <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map(ratio => {
                        const [w, h] = ratio.value.split(':').map(Number);
                        const aspect = w / h;
                        const isWide = aspect >= 1;
                        const width = isWide ? 32 : 32 * aspect;
                        const height = isWide ? 32 / aspect : 32;

                        return (
                        <button
                        key={ratio.value}
                        onClick={() => setAspectRatio(ratio.value)}
                        className={`group relative py-2 px-1 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1 ${
                            aspectRatio === ratio.value
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        }`}
                        >
                            <span className="truncate w-full text-center">{ratio.label}</span>
                             {/* Visual Tooltip (Simplified) */}
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-zinc-900 border border-zinc-700 p-2 rounded-lg shadow-xl z-[100] pointer-events-none">
                                <div className="w-8 h-8 flex items-center justify-center bg-zinc-800/50 rounded mb-1">
                                    <div 
                                        className="bg-indigo-500 rounded-[1px]"
                                        style={{ width: `${width}px`, height: `${height}px` }}
                                    />
                                </div>
                            </div>
                        </button>
                        );
                    })}
                </div>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">分辨率</label>
                <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                <option value="1K">1024x1024 (1K)</option>
                <option value="2K">2048x2048 (2K)</option>
                <option value="4K">4096x4096 (4K)</option>
                </select>
            </div>

            {/* Return Type */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">返回类型</label>
                <select
                value={returnType}
                onChange={(e) => setReturnType(e.target.value as 'IMAGE' | 'TEXT_IMAGE')}
                className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                <option value="IMAGE">仅图片</option>
                <option value="TEXT_IMAGE">图片 + 文本描述</option>
                </select>
            </div>

            {/* Folder Selection */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Folder className="w-3 h-3" />
                  保存到文件夹
                </label>
                <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name} {folder.isDefault ? '(默认)' : ''}
                  </option>
                ))}
                </select>
            </div>
        </div>
      </div>

      {/* 2. Prompt & Upload Column */}
      <div className="w-[440px] flex-none flex flex-col gap-4">
          
          <div className="flex-1 flex flex-col gap-6 p-5 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md overflow-y-auto">
             
            {/* Final Image Prompt & Optimizer */}
            <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">提示词</label>
                    {selectedPromptModelId && (
                         <span className="text-[10px] items-center gap-1.5 text-zinc-600 hidden group-hover:flex">
                             <Sparkles className="w-3 h-3 text-indigo-500" />
                             {promptModels.find(m=>m.id===selectedPromptModelId)?.name}
                         </span>
                    )}
                </div>
                
                <div className="relative flex-1 flex flex-col group">
                    <textarea
                        value={finalImagePrompt}
                        onChange={(e) => setFinalImagePrompt(e.target.value)}
                        className="w-full h-full min-h-[220px] bg-black/40 border border-zinc-800 rounded-xl p-4 pb-14 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none font-mono text-zinc-300 placeholder-zinc-700 leading-relaxed transition-all custom-scrollbar"
                        placeholder={selectedPromptModelId ? "在此输入您的想法，点击一键优化..." : "在这里描述你想要的画面..."}
                    />
                    
                    {/* Inner Toolbar */}
                    <div className="absolute bottom-2 right-2 left-2 flex items-center justify-between p-1">
                        <div className='flex items-center gap-2'>
                             {/* Undo Button */}
                             {previousPrompt !== null && (
                                <button
                                    onClick={handleUndoPrompt}
                                    className="p-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1.5"
                                    title="撤销优化"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>撤销</span>
                                </button>
                             )}
                        </div>

                        <div>
                            {/* Optimizer Button */}
                            {selectedPromptModelId && (
                                <button
                                    onClick={handleGeneratePrompt}
                                    disabled={generatingPrompt || !finalImagePrompt.trim()}
                                    className="py-2 px-4 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2 backdrop-blur-sm"
                                >
                                    {generatingPrompt ? (
                                        <LoaderSpin />
                                    ) : (
                                        <Wand2 className="w-3.5 h-3.5" />
                                    )}
                                    {generatingPrompt ? '优化中...' : '一键优化'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

             {/* Reference Images */}
             <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">参考图</label>
                <div className="grid grid-cols-4 gap-2">
                    {refImages.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700 group">
                        <img src={img.preview} alt={`参考图 ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100"
                        >
                        <X className="w-3 h-3" />
                        </button>
                    </div>
                    ))}
                    {refImages.length < 14 && (
                    <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 cursor-pointer hover:border-indigo-500 hover:text-indigo-400 transition-colors bg-black/20 hover:bg-indigo-500/5">
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                        <Upload className="w-4 h-4 mb-1" />
                        <span className="text-[9px] font-medium">上传</span>
                    </label>
                    )}
                </div>
            </div>

          </div>

          <div className="p-0 space-y-3">
             {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
                   <AlertCircle className="w-4 h-4 shrink-0" />
                   {error}
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
                     生成中...
                   </>
                ) : results.length > 0 ? (
                   <>
                     <RefreshCw className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     重新生成
                   </>
                ) : (
                   <>
                     <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     生成图片
                   </>
                )}
              </button>
          </div>
      </div>

      {/* 3. Results Column */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="h-full p-5 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-4">
            <AnimatePresence mode='popLayout'>
                {results.map((res) => (
                <motion.div
                    key={res.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full rounded-2xl overflow-hidden bg-black/50 border border-white/5 group shadow-sm hover:shadow-md transition-shadow"
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
                                title="查看大图"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleCopyImage(res.url)}
                                className="p-2 rounded-lg bg-white/10 hover:bg-indigo-500 text-white transition-colors backdrop-blur-sm"
                                title="复制图片"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDownloadImage(res.url, res.prompt)}
                                className="p-2 rounded-lg bg-white/10 hover:bg-indigo-500 text-white transition-colors backdrop-blur-sm"
                                title="下载图片"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
                ))}
            </AnimatePresence>

            {results.length === 0 && !generatingImage && (
                <div className="h-[500px] flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800/50 rounded-2xl">
                    <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="font-medium text-zinc-500">生成的图片会展示在这里</p>
                    <p className="text-xs text-zinc-700 mt-1">先配置模型与提示词即可开始</p>
                </div>
            )}

            {generatingImage && (
                <div className="w-full aspect-square max-h-[500px] rounded-2xl bg-zinc-900/50 animate-pulse border border-white/5 flex flex-col items-center justify-center gap-3">
                    <LoaderSpin />
                    <span className="text-xs text-zinc-500 animate-pulse">正在创作...</span>
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
                title="关闭"
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
                    className="flex-1 py-2 px-4 rounded-lg bg-white/10 hover:bg-indigo-500 text-white transition-colors backdrop-blur-sm flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Copy className="w-4 h-4" />
                    复制图片
                  </button>
                  <button
                    onClick={() => handleDownloadImage(previewImage.url, previewImage.prompt)}
                    className="flex-1 py-2 px-4 rounded-lg bg-white/10 hover:bg-indigo-500 text-white transition-colors backdrop-blur-sm flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    下载图片
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoaderSpin() {
    return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
}

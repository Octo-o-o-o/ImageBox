'use client';
import { getTemplates, createTemplate, deleteTemplate, updateTemplate, getModels } from '@/app/actions';
import { useState, useEffect } from 'react';
import { Plus, Trash2, LayoutTemplate, X, Save, FileText, Image as ImageIcon, Pencil, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

    const load = () => {
        getTemplates().then(setTemplates);
        getModels().then(setModels);
    }

    useEffect(() => {
        load();
    }, []);

    const handleSave = async () => {
        if (!name || !promptTemplate) return;
        
        const data = {
            name,
            promptTemplate,
            systemPrompt,
            promptGeneratorId: selectedPromptModel || undefined,
            imageGeneratorId: selectedImageModel || undefined,
            defaultParams: '{}'
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
    }
    
    const promptModels = models.filter(m => m.type === 'TEXT');
    const imageModels = models.filter(m => m.type === 'IMAGE');

    return (
        <div className="space-y-8 relative">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">模板库</h1>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    新建模板
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((t, i) => (
                    <motion.div 
                        key={t.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all hover:bg-zinc-900 relative flex flex-col"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-zinc-800 rounded-xl">
                                <LayoutTemplate className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                    onClick={() => handleEdit(t)}
                                    className="p-2 text-zinc-600 hover:text-white transition-colors"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => setDeleteId(t.id)}
                                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-white">{t.name}</h3>
                        <div className="flex-1">
                             <p className="text-sm text-zinc-500 line-clamp-3 font-mono bg-black/20 p-3 rounded-lg border border-white/5 mb-4">
                                {t.promptTemplate}
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-2 mt-auto">
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <FileText className="w-3 h-3" />
                                <span className="opacity-70">提示词模型：</span>
                                <span className={t.promptGenerator ? 'text-zinc-300' : 'text-zinc-600'}>
                                    {t.promptGenerator?.name || '手动填写'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <ImageIcon className="w-3 h-3" />
                                <span className="opacity-70">出图模型：</span>
                                <span className={t.imageGenerator ? 'text-zinc-300' : 'text-zinc-600'}>
                                    {t.imageGenerator?.name || '默认'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Config Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">{editingId ? '编辑模板' : '新建模板'}</h2>
                                <button onClick={() => setIsCreating(false)}><X className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-medium text-zinc-400 uppercase">模板名称</label>
                                    <input 
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full bg-black/40 border border-zinc-800 rounded-lg p-3 mt-1 focus:ring-2 focus:ring-indigo-500/50 outline-none text-white"
                                        placeholder="例如：电影感人像" 
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4 p-4 rounded-xl bg-zinc-800/20 border border-white/5">
                                        <h3 className="font-semibold text-indigo-400 flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> 提示词生成
                                        </h3>
                                        
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 uppercase">提示词模型</label>
                                            <select 
                                                value={selectedPromptModel}
                                                onChange={e => setSelectedPromptModel(e.target.value)}
                                                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2 mt-1 text-sm outline-none text-white"
                                            >
                                                <option value="">不使用模型（手动编辑）</option>
                                                {promptModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-medium text-zinc-400 uppercase">提示词模板</label>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setPromptTemplate(prev => prev + ' {{user_input}}')}
                                                        className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded border border-white/5 text-indigo-400 transition-colors"
                                                    >
                                                        + {'{{user_input}}'}
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea 
                                                value={promptTemplate}
                                                onChange={e => setPromptTemplate(e.target.value)}
                                                className="w-full h-32 bg-black/40 border border-zinc-800 rounded-lg p-3 mt-1 focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-sm text-zinc-300"
                                                placeholder="详细描述一个 {{user_input}} ..." 
                                            />
                                            <p className="text-[10px] text-zinc-500 mt-1">
                                                使用 <code>{'{{variable}}'}</code> 在工作室里生成可填写的变量。
                                                该提示词将用于生成最终出图描述。
                                            </p>
                                        </div>
                                        
                                         <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-medium text-zinc-400 uppercase">系统提示（可选）</label>
                                            </div>
                                            <input 
                                                value={systemPrompt}
                                                onChange={e => setSystemPrompt(e.target.value)}
                                                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2 text-sm outline-none text-white"
                                                placeholder="例如：你是一位资深摄影师..."
                                            />
                                            <p className="text-[10px] text-zinc-500 mt-1">
                                                用于限定 AI 的语气或角色，有助于模型更好遵守要求。
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 p-4 rounded-xl bg-zinc-800/20 border border-white/5">
                                        <h3 className="font-semibold text-pink-400 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4" /> 图像生成
                                        </h3>
                                         <div>
                                            <label className="text-xs font-medium text-zinc-400 uppercase">出图模型</label>
                                            <select 
                                                value={selectedImageModel}
                                                onChange={e => setSelectedImageModel(e.target.value)}
                                                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2 mt-1 text-sm outline-none text-white"
                                            >
                                                <option value="">默认</option>
                                                {imageModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-4">
                                <button 
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-zinc-400 hover:text-white"
                                >
                                    取消
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={!name || !promptTemplate}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                                >
                                    {editingId ? '保存修改' : '创建模板'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                                    <AlertTriangle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">确认删除模板？</h3>
                                    <p className="text-sm text-zinc-400">该操作无法恢复。</p>
                                </div>
                                <div className="flex gap-3 w-full mt-2">
                                    <button 
                                        onClick={() => setDeleteId(null)}
                                        className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button 
                                        onClick={confirmDelete}
                                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                                    >
                                        删除
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

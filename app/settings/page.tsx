'use client';
import { useState, useEffect } from 'react';
import { getModels, saveModel, deleteModel, getProviders, saveProvider, deleteProvider } from '@/app/actions';
import { Save, Loader2, Key, Plus, Trash2, Cpu, Server, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  
  // UI State
  const [editingProvider, setEditingProvider] = useState<any>(null); // null = not editing
  const [editingModel, setEditingModel] = useState<any>(null);
  
  // New States
  const [newProvider, setNewProvider] = useState({ name: '', type: 'OPENAI', baseUrl: '', apiKey: '' });
  const [newModel, setNewModel] = useState({ name: '', modelIdentifier: '', type: 'IMAGE', providerId: '' });

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
    setNewProvider({ name: '', type: 'OPENAI', baseUrl: '', apiKey: '' });
    refreshInfo();
  };

  const handleDeleteProvider = async (id: string) => {
    if (confirm('删除该服务商？关联的模型也会被删除。')) {
        await deleteProvider(id);
        refreshInfo();
    }
  };
  
  const openNewProvider = () => {
    setNewProvider({ name: '', type: 'OPENAI', baseUrl: '', apiKey: '' });
    setEditingProvider(null); // Clear edit mode if any
    setEditingProvider({ id: undefined, name: '', type: 'OPENAI', baseUrl: '', apiKey: '' }); // Hack to reuse modal
  };

  // --- Model Handlers ---
  const handleSaveModel = async () => {
    const data = editingModel;
    if (!data.name || !data.modelIdentifier || !data.providerId) return;
    
    await saveModel(data);
    setEditingModel(null);
    refreshInfo();
  };

  const handleDeleteModel = async (id: string) => {
    if (confirm('删除该模型？')) {
        await deleteModel(id);
        refreshInfo();
    }
  };
  
  const openNewModel = () => {
      if (providers.length === 0) {
          alert('请先添加至少一个服务商！');
          return;
      }
      setEditingModel({ name: '', modelIdentifier: '', type: 'IMAGE', providerId: providers[0].id });
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
            设置
          </h1>
          <p className="text-zinc-500">管理你的 AI 服务商与模型映射。</p>
      </motion.div>
      
      {/* 1. Providers Section */}
      <section className="space-y-6">
         <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Server className="w-5 h-5" /></div>
                <div>
                    <h2 className="text-xl font-semibold">服务商</h2>
                    <p className="text-xs text-zinc-500">连接 OpenAI、Gemini 或本地大模型。</p>
                </div>
            </div>
            <button 
                onClick={openNewProvider}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
                <Plus className="w-4 h-4" /> 新增服务商
            </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map(p => (
                <div key={p.id} className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 group hover:border-indigo-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">{p.name}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingProvider(p)} className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><SettingsIcon className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteProvider(p.id)} className="p-2 hover:bg-red-500/10 rounded text-zinc-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-zinc-500 font-mono bg-black/20 p-3 rounded-lg">
                        <div className="flex justify-between">
                            <span>类型:</span> <span className="text-zinc-300">{p.type === 'OPENAI' ? 'OpenAI 兼容' : 'Google Gemini 官方'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>基础地址:</span> <span className="text-zinc-300 truncate max-w-[150px]" title={p.baseUrl}>{p.baseUrl || '默认'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>API 密钥:</span> <span className="text-zinc-300">{p.apiKey ? '••••••••' : '未设置'}</span>
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
                    <h2 className="text-xl font-semibold">模型</h2>
                    <p className="text-xs text-zinc-500">为服务商配置可用模型。</p>
                </div>
            </div>
            <button 
                onClick={openNewModel}
                className="flex items-center gap-2 bg-white text-black px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
                <Plus className="w-4 h-4" /> 新增模型
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map(m => (
                <div key={m.id} className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            {m.name}
                            <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold", m.type === 'IMAGE' ? "bg-pink-500/20 text-pink-300" : "bg-blue-500/20 text-blue-300")}>
                                {m.type === 'IMAGE' ? '图像' : '文本'}
                            </span>
                        </h3>
                        <p className="text-xs text-zinc-500 font-mono mt-1 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-zinc-700" />
                             {m.provider?.name}
                             <span className="text-zinc-600 px-1">/</span> 
                             {m.modelIdentifier}
                        </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingModel(m)} className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-300"><SettingsIcon className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteModel(m.id)} className="p-2 bg-red-500/10 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
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
                    className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
                >
                    <h2 className="text-lg font-bold mb-6 text-white">{editingProvider.id ? '编辑服务商' : '新增服务商'}</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-zinc-400 uppercase font-semibold">名称</label>
                            <input 
                                value={editingProvider.name}
                                onChange={e => setEditingProvider({...editingProvider, name: e.target.value})}
                                placeholder="例如：公司 OpenAI"
                                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2.5 mt-1 text-sm text-white outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-zinc-400 uppercase font-semibold">类型</label>
                            <select 
                                value={editingProvider.type}
                                onChange={e => setEditingProvider({...editingProvider, type: e.target.value})}
                                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2.5 mt-1 text-sm text-white outline-none"
                            >
                                <option value="OPENAI">OpenAI 兼容（推荐）</option>
                                <option value="GEMINI">Google Gemini 官方</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-zinc-400 uppercase font-semibold">基础地址</label>
                            <input 
                                value={editingProvider.baseUrl || ''}
                                onChange={e => setEditingProvider({...editingProvider, baseUrl: e.target.value})}
                                placeholder={editingProvider.type === 'OPENAI' ? "https://api.openai.com/v1" : "默认"}
                                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2.5 mt-1 text-sm text-white outline-none focus:border-indigo-500 font-mono"
                            />
                            <p className="text-[10px] text-zinc-500 mt-1">不填则使用官方默认地址。</p>
                        </div>

                        <div>
                            <label className="text-xs text-zinc-400 uppercase font-semibold">API 密钥</label>
                            <input 
                                type="password"
                                value={editingProvider.apiKey || ''}
                                onChange={e => setEditingProvider({...editingProvider, apiKey: e.target.value})}
                                placeholder="sk-..."
                                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2.5 mt-1 text-sm text-white outline-none focus:border-indigo-500 font-mono"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-4">
                        <button onClick={() => setEditingProvider(null)} className="px-4 py-2 text-zinc-400 hover:text-white text-sm">取消</button>
                        <button onClick={handleSaveProvider} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium">保存服务商</button>
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
                    className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
                >
                    <h2 className="text-lg font-bold mb-6 text-white">{editingModel.id ? '编辑模型' : '新增模型'}</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-zinc-400 uppercase font-semibold">所属服务商</label>
                            <select 
                                value={editingModel.providerId}
                                onChange={e => setEditingModel({...editingModel, providerId: e.target.value})}
                                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2.5 mt-1 text-sm text-white outline-none"
                            >
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                            </select>
                        </div>
                        
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-zinc-400 uppercase font-semibold">显示名称</label>
                                <input 
                                    value={editingModel.name}
                                    onChange={e => setEditingModel({...editingModel, name: e.target.value})}
                                    placeholder="例如：GPT-4o"
                                    className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2.5 mt-1 text-sm text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-400 uppercase font-semibold">类型</label>
                                <select 
                                    value={editingModel.type}
                                    onChange={e => setEditingModel({...editingModel, type: e.target.value})}
                                    className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2.5 mt-1 text-sm text-white outline-none"
                                >
                                    <option value="IMAGE">图像生成</option>
                                    <option value="TEXT">文本生成</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-zinc-400 uppercase font-semibold">模型 ID（API）</label>
                            <input 
                                value={editingModel.modelIdentifier}
                                onChange={e => setEditingModel({...editingModel, modelIdentifier: e.target.value})}
                                placeholder="例如：gpt-4o 或 gemini-1.5-pro"
                                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-2.5 mt-1 text-sm text-white outline-none focus:border-indigo-500 font-mono"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-4">
                        <button onClick={() => setEditingModel(null)} className="px-4 py-2 text-zinc-400 hover:text-white text-sm">取消</button>
                        <button onClick={handleSaveModel} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium">保存模型</button>
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

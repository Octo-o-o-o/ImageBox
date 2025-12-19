'use client';

import { useState, useEffect } from 'react';
import { getRunLogs } from '@/app/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileCode, 
  Image as ImageIcon,
  Calendar,
  Terminal
} from 'lucide-react';

// Use a type that matches the Prisma model
type RunLog = {
  id: string;
  requestTime: Date;
  completionTime: Date | null;
  duration: number | null;
  type: string;
  status: string; // SUCCESS, FAILURE, RUNNING
  modelUsed: string | null;
  actualInput: string | null;
  output: string | null;
  parentTaskId: string | null;
  configParams: string | null;
};

export default function RunLogPage() {
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const typeLabels: Record<string, string> = { PROMPT_GEN: '提示词生成', IMAGE_GEN: '图像生成' };
  const statusLabels: Record<string, string> = { SUCCESS: '成功', FAILURE: '失败', RUNNING: '进行中' };
  
  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  // Simplified time filter for demo (could be date picker)
  const [timeRange, setTimeRange] = useState<string>('all'); 

  useEffect(() => {
    loadLogs();
  }, [filterType, filterStatus, timeRange]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const serverLogs = await getRunLogs({
        type: filterType || undefined,
        status: filterStatus || undefined,
        // TODO: Implement actual Date filtering based on timeRange if needed
      });
      setLogs(serverLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6 text-zinc-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="text-indigo-500" />
            运行日志
          </h1>
          <p className="text-zinc-500 mt-1">查看所有生成请求的历史与详情。</p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
          <Filter className="w-4 h-4 text-zinc-400 ml-2" />
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 text-zinc-300 outline-none"
          >
            <option value="">全部类型</option>
            <option value="PROMPT_GEN">提示词生成</option>
            <option value="IMAGE_GEN">图像生成</option>
          </select>

          <div className="h-4 w-[1px] bg-zinc-700" />

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 text-zinc-300 outline-none"
          >
            <option value="">全部状态</option>
            <option value="SUCCESS">成功</option>
            <option value="FAILURE">失败</option>
            <option value="RUNNING">进行中</option>
          </select>

           <div className="h-4 w-[1px] bg-zinc-700" />
           
           <button onClick={() => loadLogs()} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <Search className="w-4 h-4 text-zinc-400" />
           </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {loading ? (
             <div className="text-center py-20 text-zinc-500">正在加载日志...</div>
        ) : logs.length === 0 ? (
             <div className="text-center py-20 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                暂无记录。
             </div>
        ) : (
          logs.map(log => (
            <LogItem key={log.id} log={log} typeLabels={typeLabels} statusLabels={statusLabels} />
          ))
        )}
      </div>
    </div>
  );
}

function LogItem({ log, typeLabels, statusLabels }: { log: RunLog, typeLabels: Record<string, string>, statusLabels: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);

  // Status Styles
  const statusColor = 
    log.status === 'SUCCESS' ? 'text-green-400' : 
    log.status === 'FAILURE' ? 'text-red-400' : 'text-yellow-400';

  const StatusIcon = 
    log.status === 'SUCCESS' ? CheckCircle2 : 
    log.status === 'FAILURE' ? XCircle : Clock;
  const statusText = statusLabels[log.status] || log.status;

  // Type Styles
  const isImage = log.type === 'IMAGE_GEN';
  const TypeIcon = isImage ? ImageIcon : FileCode;
  const typeText = typeLabels[log.type] || log.type;

  return (
    <motion.div 
      layout
      onClick={() => setExpanded(!expanded)}
      className={`
        group relative overflow-hidden rounded-xl border transition-all cursor-pointer
        ${expanded ? 'bg-zinc-900/80 border-indigo-500/30 shadow-2xl shadow-black/50' : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/60'}
      `}
    >
      {/* Summary Row */}
      <div className="flex items-center gap-4 p-4 h-16">
        
        {/* Icon & Type */}
        <div className={`p-2 rounded-lg ${isImage ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
           <TypeIcon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
            {/* ID & Type Name */}
            <div className="col-span-3">
                 <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200 text-sm">{typeText}</span>
                 </div>
                 <p className="text-[10px] font-mono text-zinc-600 truncate" title={log.id}>#{log.id}</p>
            </div>

            {/* Time */}
            <div className="col-span-3 flex items-center gap-2 text-zinc-400 text-xs">
                <Calendar className="w-3 h-3" />
                {new Date(log.requestTime).toLocaleString()}
            </div>

            {/* Duration */}
            <div className="col-span-2 text-zinc-500 text-xs font-mono">
                {log.duration ? `${log.duration}ms` : '-'}
            </div>

             {/* Status */}
            <div className={`col-span-3 flex items-center gap-2 text-xs font-medium ${statusColor}`}>
                <StatusIcon className="w-4 h-4" />
                {statusText}
            </div>

             {/* Expand Arrow */}
            <div className="col-span-1 flex justify-end">
                {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500/50 group-hover:text-zinc-500" />}
            </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-black/20"
          >
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 text-sm">
                
                {/* Left: Input & Config */}
                <div className="space-y-6">
                    <div>
                        <h4 className="flex items-center gap-2 text-zinc-400 font-medium mb-3">
                            <Terminal className="w-4 h-4" /> 输入提示
                        </h4>
                        <div className="p-4 bg-black/40 rounded-lg border border-white/5 font-mono text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                            {log.actualInput}
                        </div>
                    </div>

                    {log.configParams && log.configParams !== '{}' && (
                        <div>
                             <h4 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">配置参数</h4>
                             <pre className="text-[10px] text-zinc-400 font-mono bg-zinc-900/50 p-2 rounded border border-white/5 overflow-x-auto">
                                {JSON.stringify(JSON.parse(log.configParams), null, 2)}
                             </pre>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                            <span className="text-zinc-500 text-xs block mb-1">使用模型</span>
                            <span className="text-zinc-300 font-medium">{log.modelUsed || '未知'}</span>
                        </div>
                        {log.parentTaskId && (
                             <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                                <span className="text-zinc-500 text-xs block mb-1">父任务 ID</span>
                                <span className="text-zinc-300 font-mono text-[10px] break-all">{log.parentTaskId}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Output */}
                <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-zinc-400 font-medium">
                        输出结果
                    </h4>
                    
                    <div className="min-h-[200px] bg-zinc-900/30 rounded-xl border border-white/5 p-4">
                         {log.status === 'FAILURE' ? (
                             <div className="text-red-400 font-mono text-xs">
                                错误：{log.output}
                             </div>
                         ) : isImage ? (
                             <div className="space-y-4">
                                {(log.output?.split(', ') || []).map((path, idx) => (
                                    <div key={idx} className="relative aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/10">
                                        <img src={path} alt="生成图片" className="w-full h-full object-contain" />
                                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-[10px] rounded font-mono">
                                            {path}
                                        </div>
                                    </div>
                                ))}
                             </div>
                         ) : (
                             <div className="font-mono text-zinc-300 text-xs whitespace-pre-wrap">
                                 {log.output}
                             </div>
                         )}
                    </div>
                </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

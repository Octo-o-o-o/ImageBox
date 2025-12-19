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
import { useLanguage } from '@/components/LanguageProvider';

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
  const { t } = useLanguage();
  const typeLabels: Record<string, string> = { 
    PROMPT_GEN: t('runLog.filter.promptGen'), 
    IMAGE_GEN: t('runLog.filter.imageGen') 
  };
  const statusLabels: Record<string, string> = { 
    SUCCESS: t('runLog.status.success'), 
    FAILURE: t('runLog.status.failure'), 
    RUNNING: t('runLog.status.running') 
  };
  
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
      // Calculate date range based on timeRange
      let start: Date | undefined;
      const now = new Date();
      
      switch (timeRange) {
        case '24h':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
        default:
          start = undefined;
          break;
      }
      
      const serverLogs = await getRunLogs({
        type: filterType || undefined,
        status: filterStatus || undefined,
        start,
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
          <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
            <Activity className="text-primary" />
            {t('runLog.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('runLog.subtitle')}</p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3 bg-card p-2 rounded-xl border border-border backdrop-blur-sm shadow-sm">
          <Filter className="w-4 h-4 text-muted-foreground ml-2" />
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 text-foreground outline-none"
          >
            <option value="">{t('runLog.filter.allTypes')}</option>
            <option value="PROMPT_GEN">{t('runLog.filter.promptGen')}</option>
            <option value="IMAGE_GEN">{t('runLog.filter.imageGen')}</option>
          </select>

          <div className="h-4 w-[1px] bg-border" />

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 text-foreground outline-none"
          >
            <option value="">{t('runLog.filter.allStatuses')}</option>
            <option value="SUCCESS">{t('runLog.status.success')}</option>
            <option value="FAILURE">{t('runLog.status.failure')}</option>
            <option value="RUNNING">{t('runLog.status.running')}</option>
          </select>

           <div className="h-4 w-[1px] bg-border" />
           
           <select 
           value={timeRange}
           onChange={(e) => setTimeRange(e.target.value)}
           className="bg-transparent text-sm border-none focus:ring-0 text-foreground outline-none"
          >
            <option value="all">{t('runLog.timeRange.all')}</option>
            <option value="24h">{t('runLog.timeRange.24h')}</option>
            <option value="7d">{t('runLog.timeRange.7d')}</option>
            <option value="30d">{t('runLog.timeRange.30d')}</option>
          </select>
           
           <div className="h-4 w-[1px] bg-border" />
           
           <button onClick={() => loadLogs()} className="p-1 hover:bg-secondary rounded-full transition-colors">
              <Search className="w-4 h-4 text-muted-foreground" />
           </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {loading ? (
             <div className="text-center py-20 text-muted-foreground">{t('runLog.loading')}</div>
        ) : logs.length === 0 ? (
             <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
                {t('runLog.empty')}
             </div>
        ) : (
          logs.map(log => (
            <LogItem key={log.id} log={log} typeLabels={typeLabels} statusLabels={statusLabels} t={t} />
          ))
        )}
      </div>
    </div>
  );
}

function LogItem({ log, typeLabels, statusLabels, t }: { log: RunLog, typeLabels: Record<string, string>, statusLabels: Record<string, string>, t: (key: string) => string }) {
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
        ${expanded ? 'bg-card border-primary/50 shadow-lg' : 'bg-card/50 border-border hover:border-primary/20 hover:bg-card'}
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
                    <span className="font-semibold text-foreground text-sm">{typeText}</span>
                 </div>
                 <p className="text-[10px] font-mono text-muted-foreground truncate" title={log.id}>#{log.id}</p>
            </div>

            {/* Time */}
            <div className="col-span-3 flex items-center gap-2 text-muted-foreground text-xs">
                <Calendar className="w-3 h-3" />
                {new Date(log.requestTime).toLocaleString()}
            </div>

            {/* Duration */}
            <div className="col-span-2 text-muted-foreground text-xs font-mono">
                {log.duration ? `${log.duration}ms` : '-'}
            </div>

             {/* Status */}
            <div className={`col-span-3 flex items-center gap-2 text-xs font-medium ${statusColor}`}>
                <StatusIcon className="w-4 h-4" />
                {statusText}
            </div>

             {/* Expand Arrow */}
            <div className="col-span-1 flex justify-end">
                {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground" />}
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
            className="border-t border-border bg-muted/5"
          >
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 text-sm">
                
                {/* Left: Input & Config */}
                <div className="space-y-6">
                    <div>
                        <h4 className="flex items-center gap-2 text-muted-foreground font-medium mb-3">
                            <Terminal className="w-4 h-4" /> {t('runLog.inputPrompt')}
                        </h4>
                        <div className="p-4 bg-secondary/50 rounded-lg border border-border font-mono text-foreground text-xs leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                            {log.actualInput}
                        </div>
                    </div>

                    {log.configParams && log.configParams !== '{}' && (
                        <div>
                             <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">{t('runLog.configParams')}</h4>
                             <pre className="text-[10px] text-muted-foreground font-mono bg-secondary/30 p-2 rounded border border-border overflow-x-auto">
                                {JSON.stringify(JSON.parse(log.configParams), null, 2)}
                             </pre>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-secondary/20 p-3 rounded-lg border border-border">
                            <span className="text-muted-foreground text-xs block mb-1">{t('runLog.modelUsed')}</span>
                            <span className="text-foreground font-medium">{log.modelUsed || t('runLog.unknown')}</span>
                        </div>
                        {log.parentTaskId && (
                             <div className="bg-secondary/20 p-3 rounded-lg border border-border">
                                <span className="text-muted-foreground text-xs block mb-1">{t('runLog.parentTaskId')}</span>
                                <span className="text-foreground font-mono text-[10px] break-all">{log.parentTaskId}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Output */}
                <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-muted-foreground font-medium">
                        {t('runLog.outputResult')}
                    </h4>
                    
                    <div className="min-h-[200px] bg-secondary/30 rounded-xl border border-border p-4">
                         {log.status === 'FAILURE' ? (
                             <div className="text-red-400 font-mono text-xs">
                                {t('runLog.errorPrefix')}{log.output}
                             </div>
                         ) : isImage ? (
                             <div className="space-y-4">
                                {(log.output?.split(', ') || []).map((path, idx) => (
                                    <div key={idx} className="relative aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/10">
                                        <img src={path} alt={t('runLog.imageAlt')} className="w-full h-full object-contain" />
                                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-[10px] rounded font-mono">
                                            {path}
                                        </div>
                                    </div>
                                ))}
                             </div>
                         ) : (
                             <div className="font-mono text-foreground text-xs whitespace-pre-wrap">
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

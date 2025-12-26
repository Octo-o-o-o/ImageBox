'use client';

import { useState, useEffect } from 'react';
import { getRunLogs, getAllRunLogs } from '@/app/actions';
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
import { ImagePreviewModal } from '@/components/ui';
import { getImageUrl } from '@/lib/imageUrl';
import { isDesktopApp } from '@/lib/env';
import { getStorageConfig } from '@/app/actions';

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
  const [isDesktopMode, setIsDesktopMode] = useState(() => isDesktopApp());
  const [isCustomStoragePath, setIsCustomStoragePath] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState<string>(''); 

  useEffect(() => {
    loadLogs();
  }, [filterType, filterStatus, timeRange]);

  useEffect(() => {
    setIsDesktopMode(isDesktopApp());
    getStorageConfig()
      .then((cfg) => setIsCustomStoragePath(!!cfg.path))
      .catch(() => setIsCustomStoragePath(false));
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Calculate days based on timeRange
      let days: number | undefined;

      switch (timeRange) {
        case '24h':
          days = 1;
          break;
        case '7d':
          days = 7;
          break;
        case '30d':
          days = 30;
          break;
        case 'all':
        default:
          days = undefined;
          break;
      }

      let serverLogs;
      if (days === undefined) {
        // Load all logs
        serverLogs = await getAllRunLogs({
          type: filterType || undefined,
          status: filterStatus || undefined,
        });
      } else {
        serverLogs = await getRunLogs({
          type: filterType || undefined,
          status: filterStatus || undefined,
          days,
        });
      }
      setLogs(serverLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filter logs by search query on client side
  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    return log.actualInput?.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

           <div className="flex items-center gap-2">
             <Search className="w-4 h-4 text-muted-foreground" />
             <input
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder={t('runLog.searchPlaceholder')}
               className="bg-transparent text-sm border-none focus:ring-0 text-foreground outline-none w-32 placeholder:text-muted-foreground/50"
             />
           </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {loading ? (
             <div className="text-center py-20 text-muted-foreground">{t('runLog.loading')}</div>
        ) : filteredLogs.length === 0 ? (
             <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
                {searchQuery ? t('runLog.noResults') : t('runLog.empty')}
             </div>
        ) : (
          filteredLogs.map(log => (
            <LogItem
              key={log.id}
              log={log}
              typeLabels={typeLabels}
              statusLabels={statusLabels}
              t={t}
              isDesktopMode={isDesktopMode}
              isCustomStoragePath={isCustomStoragePath}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LogItem({
  log,
  typeLabels,
  statusLabels,
  t,
  isDesktopMode,
  isCustomStoragePath
}: {
  log: RunLog
  typeLabels: Record<string, string>
  statusLabels: Record<string, string>
  t: (key: string) => string
  isDesktopMode: boolean
  isCustomStoragePath: boolean
}) {
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deletedImages, setDeletedImages] = useState<Set<string>>(new Set());

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

  // Check if all images are deleted
  const imagePaths = log.output?.split(', ') || [];
  const imageUrls = imagePaths.map((p) => getImageUrl(p, isCustomStoragePath, isDesktopMode));
  const allImagesDeleted = imageUrls.length > 0 && imageUrls.every(url => deletedImages.has(url));

  // Handler for image load error
  const handleImageError = (url: string) => {
    setDeletedImages(prev => new Set(prev).add(url));
  };

  return (
    <motion.div
      layout
      className={`
        group relative overflow-hidden rounded-xl border transition-all
        ${expanded ? 'bg-card border-primary/50 shadow-lg' : 'bg-card/50 border-border hover:border-primary/20 hover:bg-card'}
      `}
    >
      {/* Summary Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-4 p-4 h-16 cursor-pointer"
      >
        
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
            onClick={(e) => e.stopPropagation()}
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

                    {/* Image Paths - Only show for successful image generation and when images exist */}
                    {isImage && log.status === 'SUCCESS' && log.output && !allImagesDeleted && (
                        <div className="bg-secondary/20 p-3 rounded-lg border border-border">
                            <span className="text-muted-foreground text-xs block mb-2">{t('runLog.imagePaths')}</span>
                            <div className="space-y-1">
                                {imagePaths.map((path, idx) => (
                                    <div key={idx} className="text-foreground font-mono text-[10px] break-all bg-background/50 p-2 rounded">
                                        {path}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Output */}
                <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-muted-foreground font-medium">
                        {t('runLog.outputResult')}
                    </h4>
                    
                    <div className="min-h-[200px]">
                         {log.status === 'FAILURE' ? (
                             <div className="text-red-400 font-mono text-xs bg-secondary/30 rounded-xl border border-border p-4">
                                {t('runLog.errorPrefix')}{log.output}
                             </div>
                         ) : isImage ? (
                             <div className="space-y-4">
                                {imageUrls.map((url, idx) => (
                                    <div
                                        key={idx}
                                        className="relative w-full bg-black/50 rounded-lg overflow-hidden"
                                    >
                                        <div className="group/image cursor-pointer" onClick={() => setPreviewImage(url)}>
                                            <img
                                                src={url}
                                                alt={t('runLog.imageAlt')}
                                                className="w-full h-auto object-contain"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    handleImageError(url);
                                                    target.style.display = 'none';
                                                    target.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-destructive/10', 'min-h-[200px]');
                                                    const span = document.createElement('span');
                                                    span.className = 'text-destructive text-xs font-semibold';
                                                    span.innerText = t('runLog.imageDeleted');
                                                    target.parentElement?.appendChild(span);
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100 pointer-events-none">
                                                <div className="px-3 py-1.5 bg-white/90 text-black text-xs font-semibold rounded-full">
                                                    {t('common.clickToView')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                         ) : (
                             <div className="font-mono text-foreground text-xs whitespace-pre-wrap bg-secondary/30 rounded-xl border border-border p-4">
                                 {log.output}
                             </div>
                         )}
                    </div>
                </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        imageUrl={previewImage || ''}
        imageAlt={t('runLog.imageAlt')}
        onClose={() => setPreviewImage(null)}
      />
    </motion.div>
  );
}

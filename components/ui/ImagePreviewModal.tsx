'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Copy, ZoomIn, ZoomOut, Maximize2, Check } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { useEffect, useState, useRef } from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageAlt?: string;
  onClose: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
  additionalActions?: React.ReactNode;
}

export function ImagePreviewModal({
  isOpen,
  imageUrl,
  imageAlt = 'Preview',
  onClose,
  onDownload,
  onCopy,
  additionalActions,
}: ImagePreviewModalProps) {
  const { t } = useLanguage();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copySuccess, setCopySuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom and position when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Mouse wheel zoom handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!isOpen) return;

      e.preventDefault();

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
    };

    const container = containerRef.current;
    if (container && isOpen) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [isOpen]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => {
    setScale(prev => Math.min(5, prev + 0.25));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `image_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
    } else {
      // Default copy behavior
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2"
          onClick={onClose}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Right side controls */}
          <div className="absolute top-4 right-4 z-[10001] flex flex-col gap-2">
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="group/close relative p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm shadow-lg"
            >
              <X className="w-6 h-6" />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 flex items-center bg-popover text-popover-foreground border border-border/50 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover/close:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
                {t('common.close')}
              </span>
            </button>

            {/* Divider */}
            <div className="h-px bg-white/10 mx-2" />

            {/* Zoom Controls */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoomIn();
              }}
              className="group/zoomin relative p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm shadow-lg"
            >
              <ZoomIn className="w-5 h-5" />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 flex items-center bg-popover text-popover-foreground border border-border/50 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover/zoomin:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
                {t('common.zoomIn')}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoomOut();
              }}
              className="group/zoomout relative p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm shadow-lg"
            >
              <ZoomOut className="w-5 h-5" />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 flex items-center bg-popover text-popover-foreground border border-border/50 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover/zoomout:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
                {t('common.zoomOut')}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResetZoom();
              }}
              className="group/reset relative p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm shadow-lg"
            >
              <Maximize2 className="w-5 h-5" />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 flex items-center bg-popover text-popover-foreground border border-border/50 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover/reset:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
                {t('common.resetZoom')}
              </span>
            </button>

            {/* Scale indicator */}
            <div className="px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium backdrop-blur-sm text-center">
              {Math.round(scale * 100)}%
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 mx-2" />

            {/* Action Buttons */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className={`group/copy relative p-3 rounded-full text-white transition-all backdrop-blur-sm shadow-lg ${
                copySuccess
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-white/10 hover:bg-primary'
              }`}
            >
              {copySuccess ? (
                <Check className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 flex items-center bg-popover text-popover-foreground border border-border/50 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover/copy:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
                {t('create.preview.copy')}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="group/download relative p-3 rounded-full bg-white/10 hover:bg-indigo-500 text-white transition-colors backdrop-blur-sm shadow-lg"
            >
              <Download className="w-5 h-5" />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 flex items-center bg-popover text-popover-foreground border border-border/50 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover/download:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs font-medium">
                {t('create.preview.download')}
              </span>
            </button>
            {additionalActions}
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full h-full"
          >
            {/* Image Container */}
            <div
              ref={containerRef}
              className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black/20"
              style={{
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                src={imageUrl}
                alt={imageAlt}
                className="w-auto h-auto max-w-full max-h-full object-contain select-none"
                draggable={false}
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

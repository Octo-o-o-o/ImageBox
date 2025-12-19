'use client';

import { getImagesByFolder, getFolders, createFolder, updateFolder, deleteFolder, deleteImage, toggleFavorite, moveImageToFolder } from '@/app/actions';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Folder,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Download,
  Copy,
  LayoutGrid,
  List as ListIcon,
  Search,
  Maximize2,
  Star,
  FolderInput,
  AlertTriangle,
  Wand2,
  CheckSquare,
  Square
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/components/LanguageProvider';
import { replaceTemplate } from '@/lib/i18n';

type FolderType = {
  id: string;
  name: string;
  isDefault: boolean;
  _count: { images: number };
};

type ViewMode = 'grid' | 'list';

export default function LibraryPage() {
  const { t } = useLanguage();
  const tr = (key: string, vars?: Record<string, string | number>) =>
    vars ? replaceTemplate(t(key), vars) : t(key);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Batch selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  // Folder management state
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // IME composition state for Chinese/Japanese/Korean input methods
  const [isComposing, setIsComposing] = useState(false);

  // Image preview state
  const [previewImage, setPreviewImage] = useState<{ 
    id: string, 
    url: string, 
    prompt: string, 
    createdAt: string, 
    isFavorite: boolean,
    modelName: string,
    params: string,
    templateName?: string,
    folderName?: string
  } | null>(null);

  // Image dimensions cache
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number, height: number }>>({});
  
  // Move image state
  const [movingImageId, setMovingImageId] = useState<string | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>('');

  // Delete confirmation state
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolderId !== null) {
      loadImages(selectedFolderId);
    }
  }, [selectedFolderId]);

  const loadFolders = async () => {
    const folderList = await getFolders();
    setFolders(folderList);

    // Auto-select "all" by default
    if (selectedFolderId === null) {
      setSelectedFolderId('all');
    }
  };

  const loadImages = async (folderId: string) => {
    setLoading(true);
    const imageList = await getImagesByFolder(folderId === 'all' ? undefined : folderId);
    setImages(imageList);
    setLoading(false);
  };

  const totalImagesCount = folders.reduce((sum, folder) => sum + folder._count.images, 0);
  const favoriteImagesCount = images.filter(img => img.isFavorite).length;
  
  // Filter images based on favorites and search
  let filteredImages = showFavoritesOnly ? images.filter(img => img.isFavorite) : images;
  
  // Apply search filter
  if (searchKeyword.trim()) {
    const keyword = searchKeyword.toLowerCase();
    filteredImages = filteredImages.filter(img => 
      img.finalPrompt?.toLowerCase().includes(keyword) || 
      img.modelName?.toLowerCase().includes(keyword)
    );
  }
  
  const displayedImages = filteredImages;

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName);
    setNewFolderName('');
    setIsCreating(false);
    await loadFolders();
  };

  const handleUpdateFolder = async (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingName.trim()) return;
    await updateFolder(id, editingName);
    setEditingFolderId(null);
    setEditingName('');
    await loadFolders();
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm(tr('library.deleteFolderConfirm'))) return;
    try {
      await deleteFolder(id);
      if (selectedFolderId === id) {
        setSelectedFolderId('all');
      }
      await loadFolders();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteImage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteImageId(id);
  };

  const confirmDeleteImage = async () => {
    if (!deleteImageId) return;

    // 乐观更新：立即移除图片
    const previousImages = images;
    const previousFolders = folders;

    setImages(prevImages => prevImages.filter(img => img.id !== deleteImageId));
    setDeleteImageId(null);

    // 关闭预览 modal（如果正在预览这张图片）
    if (previewImage?.id === deleteImageId) {
      setPreviewImage(null);
    }

    try {
      await deleteImage(deleteImageId);
      // 删除成功后，更新文件夹计数
      await loadFolders();
    } catch (e: any) {
      // 如果失败，回滚到之前的状态
      setImages(previousImages);
      setFolders(previousFolders);
      alert(e.message);
    }
  };

  const handleDownloadImage = (url: string, prompt: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prompt.substring(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyImage = async (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert(tr('library.imageCopied'));
    } catch (err) {
      console.error('Copy failed:', err);
      alert(tr('library.copyFailed'));
    }
  };

  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // 乐观更新：立即更新本地 state
    const previousImages = images;
    const previousPreview = previewImage;

    setImages(prevImages =>
      prevImages.map(img =>
        img.id === id ? { ...img, isFavorite: !img.isFavorite } : img
      )
    );

    // 如果在 preview modal 中，也更新 previewImage
    if (previewImage?.id === id) {
      setPreviewImage(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }

    try {
      await toggleFavorite(id);
    } catch (e: any) {
      // 如果失败，回滚到之前的状态
      setImages(previousImages);
      setPreviewImage(previousPreview);
      alert(e.message);
    }
  };

  const handleMoveImage = async () => {
    if (!movingImageId || !targetFolderId) return;
    try {
      await moveImageToFolder(movingImageId, targetFolderId);
      setMovingImageId(null);
      setTargetFolderId('');
      if (selectedFolderId) {
        await loadImages(selectedFolderId);
        await loadFolders();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openMoveDialog = (imageId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMovingImageId(imageId);
    const firstFolder = folders.find(f => !f.isDefault) || folders[0];
    setTargetFolderId(firstFolder?.id || '');
  };

  const handleImageLoad = (imgId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageDimensions(prev => ({
        ...prev,
        [imgId]: { width: img.naturalWidth, height: img.naturalHeight }
      }));
    }
  };

  const handleImageRef = (imgId: string, element: HTMLImageElement | null) => {
    if (element && element.complete && element.naturalWidth && element.naturalHeight) {
      if (!imageDimensions[imgId]) {
        setImageDimensions(prev => {
          if (prev[imgId]) return prev;
          return {
            ...prev,
            [imgId]: { width: element.naturalWidth, height: element.naturalHeight }
          };
        });
      }
    }
  };

  // Batch selection handlers
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedImageIds([]); // Clear selection when exiting
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImageIds(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const selectAllImages = () => {
    setSelectedImageIds(displayedImages.map(img => img.id));
  };

  const clearSelection = () => {
    setSelectedImageIds([]);
  };

  const handleBatchDelete = async () => {
    if (selectedImageIds.length === 0) return;
    
    if (!confirm(tr('library.deleteSelectedConfirm', { count: selectedImageIds.length }))) return;

    const previousImages = images;
    
    // Optimistic update
    setImages(prevImages => prevImages.filter(img => !selectedImageIds.includes(img.id)));
    setSelectedImageIds([]);

    try {
      // Delete all selected images
      await Promise.all(selectedImageIds.map(id => deleteImage(id)));
      await loadFolders(); // Update folder counts
    } catch (e: any) {
      // Rollback on error
      setImages(previousImages);
      alert(e.message);
    }
  };

  const handleBatchMove = async (targetFolderId: string) => {
    if (selectedImageIds.length === 0) return;

    try {
      await Promise.all(selectedImageIds.map(id => moveImageToFolder(id, targetFolderId)));
      setSelectedImageIds([]);
      if (selectedFolderId) {
        await loadImages(selectedFolderId);
        await loadFolders();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBatchDownload = () => {
    if (selectedImageIds.length === 0) return;

    selectedImageIds.forEach(id => {
      const img = images.find(i => i.id === id);
      if (img) {
        handleDownloadImage(img.path, img.finalPrompt);
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] -m-8 bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 flex flex-col bg-muted/30 border-r border-border backdrop-blur-sm">
        {/* Sidebar Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <span className="font-semibold tracking-tight">{tr('sidebar.library')}</span>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="p-2 -mr-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={tr('library.createFolder')}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Folders List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {/* Create Input */}
          <AnimatePresence>
            {isCreating && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className="overflow-hidden mb-2"
              >
                <div className="p-2 rounded-lg bg-background border border-border shadow-sm flex items-center gap-2">
                  <Folder className="w-4 h-4 text-primary shrink-0" />
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isComposing) {
                        handleCreateFolder();
                      }
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-0 placeholder:text-muted-foreground/50"
                    placeholder={tr('library.enterName')}
                  />
                  <button onClick={handleCreateFolder} className="text-green-500 hover:text-green-600"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setIsCreating(false)} className="text-red-500 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* All Images Item */}
          <button
            onClick={() => {
              setSelectedFolderId('all');
              setShowFavoritesOnly(false);
            }}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
              selectedFolderId === 'all' && !showFavoritesOnly
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <LayoutGrid className="w-4 h-4 opacity-70" />
            <span className="flex-1 text-left truncate">{tr('library.allImages')}</span>
            <span className={clsx(
              "text-xs px-2 py-0.5 rounded-full bg-background/20",
              selectedFolderId === 'all' && !showFavoritesOnly ? "text-primary-foreground/90" : "text-muted-foreground group-hover:bg-background/50"
            )}>
              {totalImagesCount}
            </span>
          </button>

          {/* Favorites Item */}
          <button
            onClick={() => {
              setSelectedFolderId('all');
              setShowFavoritesOnly(true);
            }}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
              showFavoritesOnly
                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <Star className={clsx("w-4 h-4", showFavoritesOnly ? "fill-yellow-500" : "")} />
            <span className="flex-1 text-left truncate">{tr('library.favorites')}</span>
            <span className={clsx(
              "text-xs px-2 py-0.5 rounded-full",
              showFavoritesOnly ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" : "bg-background/20 text-muted-foreground group-hover:bg-background/50"
            )}>
              {favoriteImagesCount}
            </span>
          </button>

          <div className="h-px bg-border/50 my-2 mx-3" />

          <div className="space-y-0.5">
            <h3 className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr('library.collections')}</h3>
            {folders.map(folder => {
              if (editingFolderId === folder.id) {
                return (
                  <div key={folder.id} className="p-2 rounded-lg bg-background border border-border shadow-sm flex items-center gap-2 mx-1">
                    <Folder className="w-4 h-4 text-primary shrink-0" />
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={() => setIsComposing(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isComposing) {
                          handleUpdateFolder(folder.id, e);
                        }
                      }}
                      className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
                    />
                    <button onClick={(e) => handleUpdateFolder(folder.id, e)} className="text-green-500 hover:text-green-600"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingFolderId(null)} className="text-red-500 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                );
              }

              return (
                <div key={folder.id} className="group relative flex items-center">
                  <button
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      setShowFavoritesOnly(false);
                    }}
                    className={clsx(
                      'flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      selectedFolderId === folder.id && !showFavoritesOnly
                        ? 'bg-secondary text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    )}
                  >
                    {selectedFolderId === folder.id ? 
                      <FolderOpen className="w-4 h-4 text-primary" /> : 
                      <Folder className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    }
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                    <span className="text-xs text-muted-foreground opacity-70">{folder._count.images}</span>
                  </button>
                  
                  {!folder.isDefault && (
                    <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-secondary/80 backdrop-blur-sm rounded-md shadow-sm">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditingName(folder.name); }}
                        className="p-1.5 hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                        className="p-1.5 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header - Redesigned */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10 gap-6">
          <div className="flex-1 max-w-xl">
             <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder={tr('library.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary/50 border border-transparent focus:bg-background focus:border-primary/20 hover:bg-secondary/80 outline-none text-sm transition-all shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Batch selection mode button */}
             <button
               onClick={toggleSelectionMode}
               className={clsx(
                 "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                 isSelectionMode
                   ? "bg-primary text-primary-foreground shadow-sm"
                   : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50"
               )}
               title={isSelectionMode ? tr('library.selection.exitTitle') : tr('library.selection.enterTitle')}
             >
               {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
               <span className="hidden md:inline">{isSelectionMode ? tr('library.selection.exit') : tr('library.selection.enter')}</span>
             </button>

             <div className="flex items-center p-1 rounded-lg bg-secondary/50 border border-border/50">
               <button
                 onClick={() => setViewMode('grid')}
                 className={clsx(
                   "p-1.5 rounded-md transition-all duration-200",
                 viewMode === 'grid' 
                   ? "bg-background text-primary shadow-sm" 
                   : "text-muted-foreground hover:text-foreground hover:bg-background/50"
               )}
                 title={tr('library.view.grid')}
               >
                 <LayoutGrid className="w-4 h-4" />
               </button>
               <button
                 onClick={() => setViewMode('list')}
                 className={clsx(
                   "p-1.5 rounded-md transition-all duration-200",
                  viewMode === 'list' 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
                 title={tr('library.view.list')}
               >
                 <ListIcon className="w-4 h-4" />
               </button>
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Batch Action Toolbar */}
          <AnimatePresence>
            {isSelectionMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  {selectedImageIds.length > 0 && (
                    <span className="text-sm font-medium text-foreground">
                      {tr('library.selection.selected', { count: selectedImageIds.length })}
                    </span>
                  )}

                  <button
                    onClick={selectAllImages}
                    className="p-2 rounded-lg bg-background hover:bg-secondary text-foreground transition-colors border border-border"
                    title={tr('library.selection.selectAll')}
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={clearSelection}
                    className="p-2 rounded-lg bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border"
                    title={tr('library.selection.clear')}
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>

                {selectedImageIds.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleBatchDownload}
                      className="p-2 rounded-lg bg-background hover:bg-secondary text-foreground transition-colors border border-border"
                      title={tr('library.selection.download')}
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBatchMove(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-background hover:bg-secondary text-foreground text-sm font-medium transition-colors border border-border"
                      title={tr('library.selection.moveTo')}
                    >
                      <option value="">{tr('library.selection.moveTo')}</option>
                      {folders.map(folder => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name} {folder.isDefault ? tr('library.folderDefaultTag') : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleBatchDelete}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-destructive transition-colors border border-destructive/20"
                      title={tr('library.selection.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
             viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse border border-border/40" />
                  ))}
                </div>
             ) : (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 w-full rounded-xl bg-muted animate-pulse border border-border/40" />
                  ))}
                </div>
             )
          ) : displayedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-20">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
                <ImageIcon className="w-10 h-10 opacity-50" />
              </div>
              <p className="text-xl font-medium text-foreground mb-2">{tr('library.noImages.title')}</p>
              <p className="text-sm max-w-sm text-center mb-8">
                {tr('library.noImages.desc')}
              </p>
              <a
                href="/create"
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                {tr('library.noImages.cta')}
              </a>
            </div>
          ) : (
             viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {displayedImages.map((img, i) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    key={img.id}
                    className={clsx(
                      "group relative aspect-square rounded-xl overflow-hidden bg-card border transition-all duration-300",
                      isSelectionMode
                        ? "cursor-pointer hover:shadow-md"
                        : "hover:shadow-lg hover:border-primary/50",
                      selectedImageIds.includes(img.id)
                        ? "ring-2 ring-primary border-primary shadow-lg"
                        : "border-border/50"
                    )}
                    onClick={(e) => {
                      if (isSelectionMode) {
                        toggleImageSelection(img.id);
                      } else {
                        setPreviewImage({
                          id: img.id,
                          url: img.path,
                          prompt: img.finalPrompt,
                          createdAt: img.createdAt,
                          isFavorite: img.isFavorite,
                          modelName: img.modelName,
                          params: img.params,
                          templateName: img.template?.name,
                          folderName: img.folder?.name
                        });
                      }
                    }}
                  >
                    <img
                      src={img.path}
                      alt={img.finalPrompt}
                      loading="lazy"
                      onLoad={(e) => handleImageLoad(img.id, e)}
                      ref={(el) => handleImageRef(img.id, el)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    
                    {/* Selection Checkbox */}
                    {isSelectionMode && (
                      <div className="absolute top-3 left-3 z-10">
                        <div className={clsx(
                          "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors",
                          selectedImageIds.includes(img.id)
                            ? "bg-primary border-primary"
                            : "bg-black/20 border-white backdrop-blur-sm"
                        )}>
                          {selectedImageIds.includes(img.id) && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Overlay */}
                    <div className={clsx(
                      "absolute inset-0 bg-black/40 transition-opacity duration-300 flex flex-col justify-between p-3",
                      isSelectionMode ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <div className="flex justify-between items-start">
                        <button
                          onClick={(e) => handleToggleFavorite(img.id, e)}
                          className={clsx(
                            "p-2 rounded-lg backdrop-blur-md transition-colors",
                            img.isFavorite 
                              ? "bg-yellow-500/90 hover:bg-yellow-600 text-white" 
                              : "bg-black/20 hover:bg-yellow-500/90 text-white"
                          )}
                          title={img.isFavorite ? tr('library.favorite.remove') : tr('library.favorite.add')}
                        >
                          <Star className={clsx("w-4 h-4", img.isFavorite && "fill-white")} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteImage(img.id, e)}
                          className="p-2 rounded-lg bg-black/20 hover:bg-red-500/90 text-white backdrop-blur-md transition-colors"
                          title={tr('library.actions.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 justify-center translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <button
                          onClick={(e) => openMoveDialog(img.id, e)}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                          title={tr('library.actions.move')}
                        >
                          <FolderInput className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleCopyImage(img.path, e)}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                          title={tr('library.actions.copy')}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDownloadImage(img.path, img.finalPrompt, e)}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
                          title={tr('library.actions.download')}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
               /* List View */
              <div className="min-w-full">
                {/* Table Header */}
                <div className={clsx(
                  "gap-4 px-4 py-3 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background/95 backdrop-blur-sm z-10",
                  isSelectionMode ? "grid grid-cols-[auto_1fr_auto_auto_auto]" : "grid grid-cols-12"
                )}>
                  {isSelectionMode && (
                    <div className="flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectedImageIds.length === displayedImages.length ? clearSelection() : selectAllImages();
                        }}
                        className="w-5 h-5 rounded border-2 border-border hover:border-primary transition-colors flex items-center justify-center"
                      >
                        {selectedImageIds.length > 0 && selectedImageIds.length === displayedImages.length && (
                          <Check className="w-3 h-3 text-primary" />
                        )}
                      </button>
                    </div>
                  )}
                  <div className={isSelectionMode ? "" : "col-span-6 md:col-span-5"}>{tr('library.table.prompt')}</div>
                  {!isSelectionMode && <div className="col-span-2 hidden md:block">{tr('library.table.dimensions')}</div>}
                  <div className={isSelectionMode ? "hidden md:block" : "col-span-3 md:col-span-3"}>{tr('library.table.created')}</div>
                  {!isSelectionMode && <div className="col-span-3 md:col-span-2 text-right">{tr('library.table.actions')}</div>}
                </div>
                
                {/* Table Rows */}
                <div className="divide-y divide-border/40">
                  {displayedImages.map((img, i) => (
                     <motion.div
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: i * 0.03, duration: 0.2 }}
                       key={img.id}
                       className={clsx(
                         "group gap-4 px-4 py-3 items-center transition-colors cursor-pointer",
                         isSelectionMode ? "grid grid-cols-[auto_1fr_auto_auto_auto]" : "grid grid-cols-12",
                         selectedImageIds.includes(img.id)
                           ? "bg-primary/10 hover:bg-primary/15"
                           : "hover:bg-secondary/30"
                       )}
                       onClick={(e) => {
                        if (isSelectionMode) {
                          toggleImageSelection(img.id);
                        } else {
                          setPreviewImage({
                            id: img.id,
                            url: img.path,
                            prompt: img.finalPrompt,
                            createdAt: img.createdAt,
                            isFavorite: img.isFavorite,
                            modelName: img.modelName,
                            params: img.params,
                            templateName: img.template?.name,
                            folderName: img.folder?.name
                          });
                        }
                      }}
                     >
                       {/* Checkbox Column (Selection Mode) */}
                       {isSelectionMode && (
                         <div className="flex items-center" onClick={e => e.stopPropagation()}>
                           <button
                             onClick={() => toggleImageSelection(img.id)}
                             className={clsx(
                               "w-5 h-5 rounded border-2 transition-colors flex items-center justify-center",
                               selectedImageIds.includes(img.id)
                                 ? "bg-primary border-primary"
                                 : "border-border hover:border-primary"
                             )}
                           >
                             {selectedImageIds.includes(img.id) && (
                               <Check className="w-3 h-3 text-white" />
                             )}
                           </button>
                         </div>
                       )}

                       {/* Column 1: Image & Prompt */}
                       <div className={clsx(
                         "flex items-center gap-3 min-w-0",
                         isSelectionMode ? "" : "col-span-6 md:col-span-5"
                       )}>
                          <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 border border-border">
                             <img src={img.path} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <p className="text-sm text-foreground truncate">{img.finalPrompt}</p>
                       </div>

                       {/* Column 2: Dimensions (Hidden in selection mode) */}
                       {!isSelectionMode && (
                         <div className="col-span-2 hidden md:flex items-center text-sm text-muted-foreground">
                            {imageDimensions[img.id] ? 
                              `${imageDimensions[img.id].width} × ${imageDimensions[img.id].height}` : 
                              <span className="text-xs opacity-50">-</span>
                            }
                         </div>
                       )}

                       {/* Column 3: Date */}
                       <div className={clsx(
                         "text-sm text-muted-foreground",
                         isSelectionMode ? "hidden md:block" : "col-span-3 md:col-span-3"
                       )}>
                         {new Date(img.createdAt).toLocaleDateString()} {!isSelectionMode && <span className="text-xs opacity-50 hidden md:inline ml-1">{new Date(img.createdAt).toLocaleTimeString()}</span>}
                       </div>

                       {/* Column 4: Actions (Hidden in selection mode) */}
                       {!isSelectionMode && (
                         <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleToggleFavorite(img.id, e)}
                            className={clsx(
                              "p-1.5 rounded-md border transition-all",
                              img.isFavorite
                                ? "text-yellow-500 hover:bg-yellow-500/10 hover:shadow-sm border-yellow-500/20"
                                : "text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm border-transparent hover:border-border"
                            )}
                            title={img.isFavorite ? tr('library.favorite.remove') : tr('library.favorite.add')}
                          >
                            <Star className={clsx("w-3.5 h-3.5", img.isFavorite && "fill-yellow-500")} />
                          </button>
                          <button
                            onClick={(e) => openMoveDialog(img.id, e)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm border border-transparent hover:border-border transition-all"
                            title={tr('library.actions.move')}
                          >
                            <FolderInput className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleCopyImage(img.path, e)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm border border-transparent hover:border-border transition-all"
                            title={tr('library.actions.copy')}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDownloadImage(img.path, img.finalPrompt, e)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm border border-transparent hover:border-border transition-all"
                            title={tr('library.actions.download')}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                                setPreviewImage({
                                id: img.id,
                                url: img.path,
                                prompt: img.finalPrompt,
                                createdAt: img.createdAt,
                                isFavorite: img.isFavorite,
                                modelName: img.modelName,
                                params: img.params,
                                templateName: img.template?.name,
                                folderName: img.folder?.name
                              });
                            }}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm border border-transparent hover:border-border transition-all"
                            title={tr('library.actions.view')}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          
                           <button
                            onClick={(e) => handleDeleteImage(img.id, e)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-destructive hover:shadow-sm border border-transparent hover:border-destructive/20 transition-all"
                            title={tr('library.actions.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                         </div>
                       )}
                     </motion.div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Move Image Modal */}
      <AnimatePresence>
        {movingImageId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-popover border border-border rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-popover-foreground flex items-center gap-2">
                  <FolderInput className="w-5 h-5 text-primary" />
                  {tr('library.moveModal.title')}
                </h3>
                <button
                  onClick={() => setMovingImageId(null)}
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase block mb-2">{tr('library.moveModal.label')}</label>
                  <select
                    value={targetFolderId}
                    onChange={(e) => setTargetFolderId(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  >
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name} {folder.isDefault ? tr('library.folderDefaultTag') : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
                <button
                  onClick={() => setMovingImageId(null)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground"
                >
                  {tr('library.cancel')}
                </button>
                <button
                  onClick={handleMoveImage}
                  disabled={!targetFolderId}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {tr('library.moveModal.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 md:p-10"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-6xl h-full max-h-[90vh] flex flex-col md:flex-row gap-6 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors backdrop-blur-md md:hidden"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image Area */}
              <div className="flex-1 bg-black/5 dark:bg-black/40 relative flex items-center justify-center p-4">
                <img
                  src={previewImage.url}
                  alt={previewImage.prompt}
                  className="max-w-full max-h-full object-contain shadow-sm"
                />
              </div>

              {/* Sidebar Info */}
              <div className="w-full md:w-80 lg:w-96 bg-card flex flex-col border-l border-border">
                <div className="p-6 flex items-center justify-between border-b border-border">
                  <h3 className="font-semibold text-lg">{tr('library.details.title')}</h3>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors hidden md:block"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {/* Prompt */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">{tr('library.details.prompt')}</label>
                    <p className="text-sm text-foreground leading-relaxed bg-secondary/30 p-3 rounded-lg border border-border/50">
                      {previewImage.prompt}
                    </p>
                  </div>

                  {/* Model & Template */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">{tr('library.details.model')}</label>
                      <p className="text-sm text-foreground bg-secondary/30 px-3 py-2 rounded-lg border border-border/50 font-mono">
                        {previewImage.modelName}
                      </p>
                    </div>
                    {previewImage.templateName && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">{tr('library.details.template')}</label>
                        <p className="text-sm text-foreground bg-secondary/30 px-3 py-2 rounded-lg border border-border/50 truncate">
                          {previewImage.templateName}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Parameters */}
                  {previewImage.params && previewImage.params !== '{}' && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">{tr('library.details.params')}</label>
                      <div className="bg-secondary/30 p-3 rounded-lg border border-border/50">
                        {(() => {
                          try {
                            const params = JSON.parse(previewImage.params);
                            return (
                              <div className="space-y-2">
                                {Object.entries(params).map(([key, value]: [string, any]) => (
                                  <div key={key} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    <span className="text-foreground font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch {
                            return <p className="text-xs text-muted-foreground italic">{tr('library.details.paramsInvalid')}</p>;
                          }
                        })()}
                      </div>
                    </div>
                  )}
                  
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">{tr('library.details.created')}</label>
                      <p className="text-sm text-foreground">
                        {new Date(previewImage.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(previewImage.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    {imageDimensions[previewImage.id] && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">{tr('library.details.dimensions')}</label>
                        <p className="text-sm text-foreground">
                          {imageDimensions[previewImage.id].width} × {imageDimensions[previewImage.id].height}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tr('library.details.ratio', { ratio: (imageDimensions[previewImage.id].width / imageDimensions[previewImage.id].height).toFixed(2) })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Folder */}
                  {previewImage.folderName && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">{tr('library.details.folder')}</label>
                      <p className="text-sm text-foreground bg-secondary/30 px-3 py-2 rounded-lg border border-border/50 flex items-center gap-2">
                        <Folder className="w-4 h-4 text-muted-foreground" />
                        {previewImage.folderName}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-border bg-muted/10 space-y-3">
                  {/* Recreate Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({
                          prompt: previewImage.prompt,
                          model: previewImage.modelName,
                          params: previewImage.params
                        });
                        window.location.href = `/create?${params.toString()}`;
                      }}
                      className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Wand2 className="w-4 h-4" />
                      {tr('library.details.recreate')}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(previewImage.prompt);
                          alert(tr('library.details.copyPromptSuccess'));
                        } catch (err) {
                          console.error('Failed to copy:', err);
                          alert(tr('library.details.copyPromptFail'));
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors flex items-center justify-center gap-2 border border-border"
                    >
                      <Copy className="w-4 h-4" />
                      {tr('library.details.copyPrompt')}
                    </button>
                  </div>
                  
                  {/* Divider */}
                  <div className="h-px bg-border/50" />
                  
                  {/* Standard Actions */}
                  <button
                    onClick={() => handleToggleFavorite(previewImage.id)}
                    className={clsx(
                      "w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm border",
                      previewImage.isFavorite
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border"
                    )}
                  >
                    <Star className={clsx("w-4 h-4", previewImage.isFavorite && "fill-white")} />
                    {previewImage.isFavorite ? tr('library.favorite.remove') : tr('library.favorite.add')}
                  </button>
                  <button
                    onClick={() => handleDownloadImage(previewImage.url, previewImage.prompt)}
                    className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    {tr('library.downloadImage')}
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCopyImage(previewImage.url)}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2 border border-border"
                    >
                      <Copy className="w-4 h-4" />
                      {tr('library.copyImage')}
                    </button>
                    <button
                      onClick={() => handleDeleteImage(previewImage.id)}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2 border border-destructive/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      {tr('library.delete')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Image Confirmation Modal */}
      <AnimatePresence>
        {deleteImageId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-popover border border-border rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{tr('library.deleteImageConfirmTitle')}</h3>
                  <p className="text-sm text-muted-foreground">{tr('library.deleteImageConfirmDesc')}</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setDeleteImageId(null)}
                    className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg font-medium transition-colors"
                  >
                    {tr('library.cancel')}
                  </button>
                  <button
                    onClick={confirmDeleteImage}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                  >
                    {tr('library.delete')}
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

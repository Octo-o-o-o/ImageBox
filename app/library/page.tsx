'use client';

import { getImagesByFolder, getFolders, createFolder, updateFolder, deleteFolder, deleteImage } from '@/app/actions';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Folder, FolderOpen, Plus, Edit2, Trash2, Check, X, Download, Copy, ZoomIn } from 'lucide-react';
import clsx from 'clsx';

type FolderType = {
  id: string;
  name: string;
  isDefault: boolean;
  _count: { images: number };
};

export default function LibraryPage() {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Folder management state
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Image preview state
  const [previewImage, setPreviewImage] = useState<{ id: string, url: string, prompt: string, createdAt: string } | null>(null);

  // Image dimensions cache
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number, height: number }>>({});

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

    // Auto-select first folder (default)
    if (folderList.length > 0 && selectedFolderId === null) {
      setSelectedFolderId(folderList[0].id);
    }
  };

  const loadImages = async (folderId: string) => {
    setLoading(true);
    const imageList = await getImagesByFolder(folderId);
    setImages(imageList);
    setLoading(false);
  };

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
    if (!confirm('确定要删除这个文件夹吗？文件夹内的图片会被移动到默认文件夹。')) return;

    try {
      await deleteFolder(id);

      // If deleted folder was selected, select the default folder
      if (selectedFolderId === id) {
        const defaultFolder = folders.find(f => f.isDefault);
        setSelectedFolderId(defaultFolder?.id || null);
      }

      await loadFolders();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteImage = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!confirm('确定要删除这张图片吗？\n\n删除后将无法恢复。')) return;

    try {
      await deleteImage(id);
      // Reload images
      if (selectedFolderId) {
        await loadImages(selectedFolderId);
        await loadFolders(); // Reload to update counts
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Download image
  const handleDownloadImage = (url: string, prompt: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const link = document.createElement('a');
    link.href = url;
    link.download = `${prompt.substring(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy image to clipboard
  const handleCopyImage = async (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

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

  // Handle image load to get dimensions
  const handleImageLoad = (imgId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions(prev => ({
      ...prev,
      [imgId]: { width: img.naturalWidth, height: img.naturalHeight }
    }));
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="flex h-[calc(100vh-2rem)] -m-8">
      {/* Folders Sidebar */}
      <div className="w-72 bg-zinc-900/50 border-r border-white/10 flex flex-col pt-6">
        <div className="px-4 flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">文件夹</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="新建文件夹"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar">
          {/* Create new folder input */}
          <AnimatePresence>
            {isCreating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-3 py-2 rounded-md bg-zinc-800/80 border border-indigo-500/50 flex items-center gap-2 mb-2">
                  <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    className="flex-1 bg-transparent border-none outline-none text-white text-sm min-w-0"
                    placeholder="输入名称..."
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCreateFolder}
                      className="p-1 text-green-400 hover:text-green-300"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setNewFolderName('');
                      }}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            const isEditing = editingFolderId === folder.id;

            if (isEditing) {
              return (
                 <div
                  key={folder.id}
                  className="px-3 py-2 rounded-md bg-zinc-800/80 border border-indigo-500/50 flex items-center gap-2"
                >
                  <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateFolder(folder.id, e)}
                    className="flex-1 bg-transparent border-none outline-none text-white text-sm min-w-0"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleUpdateFolder(folder.id, e)}
                      className="p-1 text-green-400 hover:text-green-300"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingFolderId(null);
                        setEditingName('');
                      }}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={clsx(
                  'group flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                )}
              >
                {isSelected ? (
                  <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 shrink-0 transition-colors group-hover:text-zinc-300" />
                )}
                
                <span className="flex-1 text-sm truncate relative top-px">
                  {folder.name}
                </span>

                <span className={clsx(
                  "text-xs transition-colors",
                  isSelected ? "text-white/50" : "text-zinc-600 group-hover:text-zinc-500"
                )}>
                  {folder._count.images}
                </span>

                {/* Actions */}
                {!folder.isDefault && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                     <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolderId(folder.id);
                          setEditingName(folder.name);
                        }}
                        className="p-1 hover:bg-white/10 rounded"
                        title="重命名"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-red-400"
                        title="删除"
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50">
        <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 flex-none backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center">
                {selectedFolderId === folders.find(f => f.isDefault)?.id ? 
                  <Folder className="w-5 h-5 text-indigo-400" /> : 
                  <FolderOpen className="w-5 h-5 text-indigo-400" />
                }
             </div>
             <div>
                <h1 className="text-lg font-bold text-white leading-none mb-1">
                  {selectedFolder?.name || '资料库'}
                </h1>
                <p className="text-xs text-zinc-500 font-medium">
                  {images.length} 张图片
                </p>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-zinc-900/50 animate-pulse border border-white/5" />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <div className="w-24 h-24 rounded-2xl bg-zinc-900/50 flex items-center justify-center mb-6 border border-white/5">
                <ImageIcon className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-xl font-medium text-zinc-300 mb-2">此文件夹为空</p>
              <p className="text-base text-zinc-500 text-center max-w-sm mb-8">
                还没有生成任何图片。去创建一些新的杰作吧！
              </p>
              <a href="/create" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-indigo-500/20">
                去生成图片
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {images.map((img, i) => {
                const dimensions = imageDimensions[img.id];
                const resolution = dimensions ? `${dimensions.width}×${dimensions.height}` : '加载中...';

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    key={img.id}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-900/50 border border-white/5 cursor-zoom-in shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
                    onClick={() => setPreviewImage({
                      id: img.id,
                      url: img.path,
                      prompt: img.finalPrompt,
                      createdAt: img.createdAt
                    })}
                  >
                    <img
                      src={img.path}
                      alt={img.finalPrompt}
                      loading="lazy"
                      onLoad={(e) => handleImageLoad(img.id, e)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />

                    {/* Overlay - only visible on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      {/* Top Left - Created Date */}
                      <div className="absolute top-3 left-3 text-[10px] text-white/80 font-medium px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm pointer-events-auto">
                        {new Date(img.createdAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>

                      {/* Top Right - Delete Button */}
                      <button
                        onClick={(e) => handleDeleteImage(img.id, e)}
                        className="absolute top-3 right-3 p-2 rounded-lg bg-black/40 hover:bg-red-500/80 text-zinc-400 hover:text-white transition-all backdrop-blur-sm pointer-events-auto"
                        title="删除图片"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Bottom Left - Resolution */}
                      <div className="absolute bottom-3 left-3 text-[10px] text-white/80 font-medium px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm pointer-events-auto">
                        {resolution}
                      </div>

                      {/* Bottom Right - Action Buttons */}
                      <div className="absolute bottom-3 right-3 flex gap-2 pointer-events-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage({
                              id: img.id,
                              url: img.path,
                              prompt: img.finalPrompt,
                              createdAt: img.createdAt
                            });
                          }}
                          className="p-2 rounded-lg bg-black/40 hover:bg-indigo-500 text-white transition-all backdrop-blur-sm"
                          title="查看大图"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleCopyImage(img.path, e)}
                          className="p-2 rounded-lg bg-black/40 hover:bg-indigo-500 text-white transition-all backdrop-blur-sm"
                          title="复制图片"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDownloadImage(img.path, img.finalPrompt, e)}
                          className="p-2 rounded-lg bg-black/40 hover:bg-indigo-500 text-white transition-all backdrop-blur-sm"
                          title="下载图片"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
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
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-zinc-300 mb-1 line-clamp-2">{previewImage.prompt}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(previewImage.createdAt).toLocaleString('zh-CN')}
                      {imageDimensions[previewImage.id] && (
                        <span className="ml-3">
                          {imageDimensions[previewImage.id].width}×{imageDimensions[previewImage.id].height}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
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
                  <button
                    onClick={() => {
                      handleDeleteImage(previewImage.id);
                      setPreviewImage(null);
                    }}
                    className="py-2 px-4 rounded-lg bg-white/10 hover:bg-red-500 text-white transition-colors backdrop-blur-sm flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
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

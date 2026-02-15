'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, X, Check, FileText, Image as ImageIcon, Video as VideoIcon, Music, CloudUpload, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useUpload } from '@/context/upload-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type FileCategory = 'images' | 'videos' | 'audios' | 'documents';

type RemoteInput = { url: string; name?: string; mime?: string; size?: number; external?: boolean };

interface CategorizedFile {
  file: File | RemoteInput;
  category: FileCategory;
  preview?: string;
}

export function SmartUploadDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [files, setFiles] = useState<CategorizedFile[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { uploadFile } = useUpload();

  const detectFileCategory = (file: File): FileCategory => {
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/')) return 'images';
    if (type.startsWith('video/')) return 'videos';
    if (type.startsWith('audio/')) return 'audios';
    
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/rtf',
    ];
    
    if (documentTypes.includes(type) || file.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf)$/i)) {
      return 'documents';
    }
    
    return 'documents';
  };

  const createPreview = async (file: File | RemoteInput, category: FileCategory): Promise<string | undefined> => {
    if (category === 'images') {
      if ('url' in file && file.url) return file.url;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file as File);
      });
    }
    return undefined;
  };

  const detectCategoryFromUrl = (url: string): FileCategory => {
    const extMatch = url.split('?')[0].match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';

    if (ext.match(/^(jpg|jpeg|png|gif|webp|avif|svg|heic|heif)$/i)) return 'images';
    if (ext.match(/^(mp4|mov|webm|mkv|avi|3gp|ogg|flv|ts)$/i)) return 'videos';
    if (ext.match(/^(mp3|wav|m4a|flac|aac|ogg)$/i)) return 'audios';
    if (ext.match(/^(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf)$/i)) return 'documents';
    // fallback to documents
    return 'documents';
  };

  const extractFileNameFromUrl = (url: string) => {
    try {
      const u = new URL(url);
      const last = u.pathname.split('/').filter(Boolean).pop() ?? '';
      return decodeURIComponent(last) || `file-${Date.now()}`;
    } catch (err) {
      return `file-${Date.now()}`;
    }
  };

  const processFile = async (file: File) => {
    const MAX_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setErrorMessage(`File too large. Maximum file size is 50 MB.`);
      setShowErrorModal(true);
      return;
    }

    const category = detectFileCategory(file);
    const preview = await createPreview(file, category);
    setFiles([{ file, category, preview }]);
  };

  const processLink = async (url: string) => {
    try {
      const parsed = new URL(url);
      const name = extractFileNameFromUrl(url);
      const category = detectCategoryFromUrl(url);
      const preview = category === 'images' ? url : undefined;
      // default to external for known hosts (YouTube/Drive) — otherwise we'll attempt to fetch the file server-side
      const externalDefault = /youtube\.com|youtu\.be|drive\.google\.com|docs\.google\.com/i.test(url);
      const remote: RemoteInput = { url, name, external: externalDefault };
      setFiles([{ file: remote, category, preview }]);
      setLinkUrl('');
      setMode('file'); // switch back to file mode to reuse the same preview UI
    } catch (err) {
      setErrorMessage('Please enter a valid URL.');
      setShowErrorModal(true);
    }
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mode !== 'file') return;
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    await processFile(selectedFiles[0]);
  }, [mode]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    if (mode !== 'file') return;
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await processFile(droppedFiles[0]);
    }
  }, [mode]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = () => {
    setFiles([]);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setErrorMessage('Please select a file or provide a link to upload.');
      setShowErrorModal(true);
      return;
    }

    const { file, category } = files[0];

    try {
      // If file is a native File, upload directly; otherwise it's a remote URL descriptor
      if (file instanceof File) {
        await uploadFile(file, description, category);
      } else {
        await uploadFile({ url: file.url || '', name: file.name, mime: file.mime, size: file.size, external: (file as any).external }, description, category);
      }

      // Close dialog and reset
      setOpen(false);
      setFiles([]);
      setDescription('');
      setMode('file');
    } catch (error) {
      setErrorMessage('Failed to upload file. Please try again.');
      setShowErrorModal(true);
    }
  };

  const getCategoryIcon = (category: FileCategory) => {
    switch (category) {
      case 'images': return <ImageIcon className="h-5 w-5" />;
      case 'videos': return <VideoIcon className="h-5 w-5" />;
      case 'audios': return <Music className="h-5 w-5" />;
      case 'documents': return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryData = (category: FileCategory) => {
    switch (category) {
      case 'images': 
        return { 
          color: 'from-blue-500 to-cyan-500', 
          bg: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-600 dark:text-blue-400',
          emoji: '📸',
          label: 'Image'
        };
      case 'videos': 
        return { 
          color: 'from-purple-500 to-pink-500', 
          bg: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10',
          border: 'border-purple-500/30',
          text: 'text-purple-600 dark:text-purple-400',
          emoji: '🎥',
          label: 'Video'
        };
      case 'audios': 
        return { 
          color: 'from-green-500 to-emerald-500', 
          bg: 'bg-gradient-to-br from-green-500/10 to-emerald-500/10',
          border: 'border-green-500/30',
          text: 'text-green-600 dark:text-green-400',
          emoji: '🎵',
          label: 'Audio'
        };
      case 'documents': 
        return { 
          color: 'from-orange-500 to-amber-500', 
          bg: 'bg-gradient-to-br from-orange-500/10 to-amber-500/10',
          border: 'border-orange-500/30',
          text: 'text-orange-600 dark:text-orange-400',
          emoji: '📄',
          label: 'Document'
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-gradient-shine rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 h-9 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm font-semibold">
          <Upload className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[92vw] sm:w-full max-h-[88vh] overflow-hidden rounded-3xl border-0 shadow-2xl p-0 bg-background">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-5">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-foreground">Upload File</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Max 50 MB • Images, Videos, Audio, Documents
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5 max-h-[calc(88vh-160px)] overflow-y-auto">
          {/* Mode toggle: File or Link */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={cn(
                'px-3 py-1 rounded-lg text-sm font-medium border-2',
                mode === 'file' ? 'bg-muted/40 border-primary text-foreground' : 'bg-transparent border-muted-foreground/10 text-muted-foreground'
              )}
            >
              File
            </button>
            <button
              type="button"
              onClick={() => setMode('link')}
              className={cn(
                'px-3 py-1 rounded-lg text-sm font-medium border-2',
                mode === 'link' ? 'bg-muted/40 border-primary text-foreground' : 'bg-transparent border-muted-foreground/10 text-muted-foreground'
              )}
            >
              Link
            </button>
            <div className="ml-auto text-xs text-muted-foreground">You can paste a public URL and we will fetch & categorize it</div>
          </div>

          {/* Link input (shown in Link mode when no file selected) */}
          {mode === 'link' && files.length === 0 && (
            <div className="space-y-3 mt-3">
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/photo.jpg"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && processLink(linkUrl)}
                />
                <Button onClick={() => processLink(linkUrl)}>
                  Add
                </Button>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <input
                  id="external-toggle"
                  type="checkbox"
                  checked={files.length === 0 ? /youtube\.com|youtu\.be|drive\.google\.com|docs\.google\.com/i.test(linkUrl) : ('external' in files[0].file && (files[0].file as any).external)}
                  onChange={(e) => {
                    // user can toggle external mode before pressing Add; store temporarily in linkUrl metadata by re-parsing on Add
                    // (no-op here; processLink will set default external for known hosts)
                  }}
                />
                <label htmlFor="external-toggle">Add as external link (don't fetch/download)</label>
                <div className="ml-auto text-xs text-muted-foreground">YouTube/Drive links default to external</div>
              </div>
            </div>
          )}

          {/* Drag & Drop Zone - Only show when no file selected and in File mode */}
          {mode === 'file' && files.length === 0 && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-10 transition-all duration-200 cursor-pointer group",
                isDragging 
                  ? "border-primary bg-primary/5 scale-[0.98]" 
                  : "border-muted-foreground/20 hover:border-primary hover:bg-primary/5"
              )}
            >
            <input
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />
            
            <div className="flex flex-col items-center justify-center gap-4 text-center pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CloudUpload className="h-10 w-10 text-primary" />
              </div>
              
              <div className="space-y-2">
                <p className="text-lg font-bold text-foreground">
                  {isDragging ? "Drop it here!" : "Click or drag file here"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Support all file types up to 50MB
                </p>
              </div>
            </div>
          </div>
          )}
          {/* Selected File Preview */}
          {files.length > 0 && (
            <div className="space-y-4">
              {files.map((item, index) => {
                const categoryData = getCategoryData(item.category);
                return (
                  <div
                    key={index}
                    className="rounded-2xl border bg-muted/30 p-4 hover:bg-muted/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Preview/Icon */}
                      <div className="flex-shrink-0">
                        {item.preview ? (
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden ring-2 ring-border">
                            <img
                              src={item.preview}
                              alt={item.file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={cn(
                            "w-20 h-20 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                            categoryData.color
                          )}>
                            <span className="text-3xl">{categoryData.emoji}</span>
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold mb-2 shadow-sm", categoryData.bg, categoryData.text)}>
                          {getCategoryIcon(item.category)}
                          <span>{categoryData.label}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-base font-bold truncate text-foreground mb-0">{item.file.name}</p>
                          {('external' in item.file && (item.file as any).external) && (
                            <div className="text-xs text-muted-foreground">External link: <a className="underline" href={(item.file as any).url} target="_blank" rel="noreferrer">open</a></div>
                          )}
                          <p className="text-sm font-medium text-muted-foreground">
                            {('size' in item.file && (item.file as any).size)
                              ? `${(((item.file as any).size) / 1024 / 1024).toFixed(2)} MB`
                              : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={removeFile}
                        className="rounded-full h-10 w-10 hover:bg-destructive/20 hover:text-destructive flex-shrink-0"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Description */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="description" className="text-sm font-semibold text-foreground">
                Description (Optional)
              </Label>
              <span className="text-xs font-medium text-muted-foreground">
                {description.length}/500
              </span>
            </div>
            <Textarea
              id="description"
              placeholder="Add a description for your file..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="rounded-xl resize-none text-sm border-2 focus:border-primary"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-5 border-t bg-muted/20">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFiles([]);
                setDescription('');
                setOpen(false);
              }}
              className="flex-1 h-12 rounded-xl font-semibold text-base border-2"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={files.length === 0}
              className="flex-1 h-12 rounded-xl font-bold text-base shadow-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Check className="mr-2 h-5 w-5" />
              Upload
            </Button>
          </div>
        </div>

      </DialogContent>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <DialogTitle className="text-center text-xl">Error</DialogTitle>
            <DialogDescription className="text-center">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={() => setShowErrorModal(false)} variant="destructive" className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

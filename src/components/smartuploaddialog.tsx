'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Check, FileText, Image as ImageIcon, Video as VideoIcon, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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

type FileCategory = 'images' | 'videos' | 'audio' | 'documents';

interface CategorizedFile {
  file: File;
  category: FileCategory;
  preview?: string;
}

export function SmartUploadDialog() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<CategorizedFile[]>([]);
  const [description, setDescription] = useState('');
  const { uploadFile } = useUpload();
  const { toast } = useToast();

  const detectFileCategory = (file: File): FileCategory => {
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/')) return 'images';
    if (type.startsWith('video/')) return 'videos';
    if (type.startsWith('audio/')) return 'audio';
    
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

  const createPreview = async (file: File, category: FileCategory): Promise<string | undefined> => {
    if (category === 'images') {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
    return undefined;
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const categorizedFiles = await Promise.all(
      selectedFiles.map(async (file) => {
        const category = detectFileCategory(file);
        const preview = await createPreview(file, category);
        return { file, category, preview };
      })
    );
    
    setFiles((prev) => [...prev, ...categorizedFiles]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (files.length === 0) {
      toast({
        title: '⚠️ No files selected',
        description: 'Please select at least one file to upload.',
        variant: 'destructive',
      });
      return;
    }

    // Use the existing uploadFile function from context for each file
    files.forEach(({ file, category }) => {
      uploadFile(file, description, category);
    });

    toast({
      title: '📤 Uploading!',
      description: `${files.length} file(s) are being uploaded...`,
    });

    // Clear and close
    setFiles([]);
    setDescription('');
    setOpen(false);
  };

  const getCategoryIcon = (category: FileCategory) => {
    switch (category) {
      case 'images': return <ImageIcon className="h-4 w-4" />;
      case 'videos': return <VideoIcon className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'documents': return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: FileCategory) => {
    switch (category) {
      case 'images': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'videos': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'audio': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'documents': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    }
  };

  const categoryCounts = files.reduce((acc, { category }) => {
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<FileCategory, number>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 h-10 sm:h-12 px-4 sm:px-6 text-sm sm:text-base">
          <Upload className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-semibold">Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl sm:text-2xl font-bold">Upload Files</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Select files and they'll be automatically sorted
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="file-upload" className="text-sm sm:text-base font-semibold">Select Files</Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              onChange={handleFileSelect}
              className="rounded-2xl border-2 border-dashed h-12 sm:h-14 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold file:text-sm"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />
            <p className="text-xs sm:text-sm text-muted-foreground">
              📸 Images • 🎥 Videos • 🎵 Audio • 📄 Documents
            </p>
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([category, count]) => (
                <div
                  key={category}
                  className={cn(
                    'flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 text-xs sm:text-sm font-bold backdrop-blur-sm',
                    getCategoryColor(category as FileCategory)
                  )}
                >
                  {getCategoryIcon(category as FileCategory)}
                  <span className="capitalize hidden sm:inline">{category}</span>
                  <span className="capitalize sm:hidden">{category.slice(0, 3)}</span>
                  <span className="bg-current text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2 sm:space-y-3 max-h-60 sm:max-h-80 overflow-y-auto rounded-2xl border-2 p-3 sm:p-4 bg-muted/30">
              {files.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-2xl border-2 bg-background hover:bg-accent/50 transition-all duration-200"
                >
                  <div className="flex-shrink-0">
                    {item.preview ? (
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden">
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={cn('w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center', getCategoryColor(item.category))}>
                        {getCategoryIcon(item.category)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="font-medium">{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="capitalize font-medium hidden sm:inline">{item.category}</span>
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" onClick={() => removeFile(index)} className="rounded-full h-8 w-8 sm:h-9 sm:w-9">
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
                <Label htmlFor="description" className="text-sm sm:text-base font-semibold">Description (Optional)</Label>
                <span className="text-xs text-muted-foreground">{description.length} / 500</span>
            </div>
            <Textarea
              id="description"
              placeholder="Add a description for all selected files..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="rounded-2xl resize-none text-sm sm:text-base"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setFiles([]);
                setDescription('');
                setOpen(false);
              }}
              className="flex-1 rounded-full h-10 sm:h-12 font-semibold text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0}
              className="flex-1 rounded-full h-10 sm:h-12 font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
            >
              <Check className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

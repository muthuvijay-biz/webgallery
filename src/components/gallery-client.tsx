'use client';

import Image from 'next/image';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Video as VideoIcon,
  Info,
  Music,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize,
  Download,
  ZoomIn,
  ZoomOut,
  Upload,
  Trash2,
  Check,
  MoreVertical,
  Share2,
  Heart,
  Grid3x3,
  List,
  Search,
  Filter,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileMetadata } from '@/lib/files';
import { cn } from '@/lib/utils';
import { useUpload } from '@/context/upload-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type GalleryClientProps = {
  photos: FileMetadata[];
  videos: FileMetadata[];
  documents: FileMetadata[];
  audio?: FileMetadata[];
  isAdmin?: boolean;
};

type FileCategory = 'images' | 'videos' | 'audio' | 'documents';
type ViewMode = 'grid' | 'list';

interface CategorizedFile {
  file: File;
  category: FileCategory;
  preview?: string;
}

// ============================================================================
// FILE DETAILS MODAL COMPONENT (iOS/Android Style)
// ============================================================================
function FileDetailsModal({ file, children }: { file: FileMetadata; children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold">Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/30 rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">File Name</p>
            <p className="text-sm font-medium break-all">{file['File Name']}</p>
          </div>
          {file['Description'] && (
            <div className="bg-muted/30 rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm">{file['Description']}</p>
            </div>
          )}
          {file['Capture Date'] && (
            <div className="bg-muted/30 rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Capture Date</p>
              <p className="text-sm">{file['Capture Date']}</p>
            </div>
          )}
          {file['Upload Date'] && (
            <div className="bg-muted/30 rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Upload Date</p>
              <p className="text-sm">{file['Upload Date']}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// DELETE BUTTON COMPONENT (iOS/Android Style)
// ============================================================================
function DeleteButton({ fileName, type }: { fileName: string; type: FileCategory }) {
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/delete/${type}?fileName=${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Delete failed');
      }

      toast({
        title: '🗑️ Deleted',
        description: `${fileName} has been removed.`,
      });

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: '❌ Delete failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" disabled={deleting}>
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl border-0 shadow-2xl max-w-[90vw] sm:max-w-md">
        <AlertDialogHeader className="space-y-3">
          <AlertDialogTitle className="text-xl font-bold">Delete File?</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Are you sure you want to delete <span className="font-semibold">{fileName}</span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={deleting} className="rounded-full">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// SMART UPLOAD DIALOG COMPONENT (Using existing upload context)
// ============================================================================
function UploadDialog() {
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
        <Button className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-6">
          <Upload className="mr-2 h-5 w-5" />
          <span className="font-semibold">Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold">Upload Files</DialogTitle>
          <DialogDescription className="text-base">
            Select files and they'll be automatically sorted
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="file-upload" className="text-base font-semibold">Select Files</Label>
            <div className="relative">
              <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileSelect}
                className="rounded-2xl border-2 border-dashed h-14 file:mr-4 file:rounded-full file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              📸 Images • 🎥 Videos • 🎵 Audio • 📄 Documents
            </p>
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([category, count]) => (
                <div
                  key={category}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-bold backdrop-blur-sm',
                    getCategoryColor(category as FileCategory)
                  )}
                >
                  {getCategoryIcon(category as FileCategory)}
                  <span className="capitalize">{category}</span>
                  <span className="bg-current text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-3 max-h-80 overflow-y-auto rounded-2xl border-2 p-4 bg-muted/30">
              {files.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-2xl border-2 bg-background hover:bg-accent/50 transition-all duration-200"
                >
                  <div className="flex-shrink-0">
                    {item.preview ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden">
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', getCategoryColor(item.category))}>
                        {getCategoryIcon(item.category)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="font-medium">{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>•</span>
                      <span className="capitalize font-medium">{item.category}</span>
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" onClick={() => removeFile(index)} className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="description" className="text-base font-semibold">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-2xl resize-none"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setFiles([]);
                setDescription('');
                setOpen(false);
              }}
              className="flex-1 rounded-full h-12 font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0}
              className="flex-1 rounded-full h-12 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Check className="mr-2 h-5 w-5" />
              Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN GALLERY COMPONENT (iOS/Android App Style)
// ============================================================================
export function GalleryClient({
  photos,
  videos,
  documents,
  audio = [],
  isAdmin = false,
}: GalleryClientProps) {
  const [activeTab, setActiveTab] = useState('photos');
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Slideshow state
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  
  // Audio player state
  const [currentAudio, setCurrentAudio] = useState<FileMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isAdmin) {
      const authenticated = localStorage.getItem('is_admin') === 'true';
      if (!authenticated) {
        router.replace('/securelogin');
      } else {
        setIsClient(true);
      }
    } else {
      setIsClient(true);
    }
  }, [router, isAdmin]);

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 75) {
      nextSlide();
    }
    if (touchEndX.current - touchStartX.current > 75) {
      prevSlide();
    }
  };

  // Slideshow logic
  const startSlideshow = useCallback((index: number = 0) => {
    setCurrentIndex(index);
    setSlideshowActive(true);
    setZoom(1);
  }, []);

  const stopSlideshow = useCallback(() => {
    setSlideshowActive(false);
    if (slideshowTimerRef.current) {
      clearTimeout(slideshowTimerRef.current);
    }
  }, []);

  const nextSlide = useCallback(() => {
    if (activeTab === 'photos') {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
      setZoom(1);
    }
  }, [activeTab, photos.length]);

  const prevSlide = useCallback(() => {
    if (activeTab === 'photos') {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      setZoom(1);
    }
  }, [activeTab, photos.length]);

  useEffect(() => {
    if (slideshowActive && !isFullscreen) {
      slideshowTimerRef.current = setTimeout(() => {
        nextSlide();
      }, 3000);
    }
    return () => {
      if (slideshowTimerRef.current) {
        clearTimeout(slideshowTimerRef.current);
      }
    };
  }, [slideshowActive, currentIndex, nextSlide, isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (slideshowActive) {
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'Escape') stopSlideshow();
        if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slideshowActive, nextSlide, prevSlide, stopSlideshow]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const playAudio = useCallback((audioFile: FileMetadata) => {
    if (currentAudio?.['File Name'] === audioFile['File Name'] && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      setCurrentAudio(audioFile);
      setIsPlaying(true);
    }
  }, [currentAudio, isPlaying]);

  useEffect(() => {
    if (audioRef.current && currentAudio) {
      audioRef.current.src = currentAudio.path;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentAudio, isPlaying]);

  const handleLogout = () => {
    localStorage.removeItem('is_admin');
    router.push('/securelogin');
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 1));

  // Filter files based on search
  const filterFiles = (files: FileMetadata[]) => {
    if (!searchQuery) return files;
    return files.filter(file => 
      file['File Name'].toLowerCase().includes(searchQuery.toLowerCase()) ||
      file['Description']?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredPhotos = filterFiles(photos);
  const filteredVideos = filterFiles(videos);
  const filteredAudio = filterFiles(audio);
  const filteredDocuments = filterFiles(documents);

  if (isAdmin && !isClient) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 h-12 w-12 animate-ping text-primary/20">
              <Loader2 className="h-full w-full" />
            </div>
          </div>
          <span className="text-lg font-semibold text-muted-foreground animate-pulse">
            Loading Gallery...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modern App-Like Layout */}
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        
        {/* iOS/Android Style Header */}
        <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/80 border-b border-border/40 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <ImageIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Gallery
                  </h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">Your media collection</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <UploadDialog />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleLogout}
                      className="rounded-full h-10 w-10"
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 h-12 rounded-2xl border-2 bg-muted/30 backdrop-blur-sm"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="photos" value={activeTab} onValueChange={setActiveTab}>
            
            {/* Modern Tab Bar (iOS/Android Style) */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <TabsList className="bg-muted/50 backdrop-blur-sm p-1.5 rounded-2xl border-2 border-border/40 shadow-lg w-full sm:w-auto">
                <TabsTrigger 
                  value="photos" 
                  className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-4 sm:px-6"
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  <span className="font-semibold">{filteredPhotos.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="videos"
                  className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-4 sm:px-6"
                >
                  <VideoIcon className="mr-2 h-4 w-4" />
                  <span className="font-semibold">{filteredVideos.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="audio"
                  className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-4 sm:px-6"
                >
                  <Music className="mr-2 h-4 w-4" />
                  <span className="font-semibold">{filteredAudio.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="documents"
                  className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-4 sm:px-6"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span className="font-semibold">{filteredDocuments.length}</span>
                </TabsTrigger>
              </TabsList>

              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center gap-1 bg-muted/50 backdrop-blur-sm p-1.5 rounded-2xl border-2 border-border/40">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="rounded-xl h-9 w-9"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="rounded-xl h-9 w-9"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Photos Tab */}
            <TabsContent value="photos" className="mt-0 space-y-4">
              {filteredPhotos.length > 0 && (
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={() => startSlideshow(0)} 
                    className="rounded-full shadow-lg hover:shadow-xl transition-all"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Slideshow
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
                  </p>
                </div>
              )}
              
              <div className={cn(
                "grid gap-3 sm:gap-4",
                viewMode === 'grid' 
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                  : "grid-cols-1"
              )}>
                {filteredPhotos.map((photo, index) => (
                  <Card 
                    key={photo['File Name']} 
                    className="overflow-hidden group border-2 border-border/40 hover:border-primary/40 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
                    onClick={() => startSlideshow(index)}
                  >
                    <CardContent className="p-0 relative aspect-square bg-muted/30">
                      <Image
                        src={photo.path}
                        alt={photo['File Name']}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Action Buttons */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <FileDetailsModal file={photo}>
                          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg backdrop-blur-sm bg-background/90">
                            <Info className="h-4 w-4" />
                          </Button>
                        </FileDetailsModal>
                        {isAdmin && (
                          <DeleteButton fileName={photo['File Name']} type="images" />
                        )}
                      </div>

                      {/* File Name Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <p className="text-xs font-semibold text-white truncate drop-shadow-lg">
                          {photo['File Name']}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredPhotos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">No photos found</p>
                  <p className="text-sm text-muted-foreground/70">
                    {searchQuery ? 'Try a different search term' : 'Upload some photos to get started'}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="mt-0 space-y-4">
              {filteredVideos.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
                </p>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredVideos.map((video) => (
                  <Card 
                    key={video['File Name']} 
                    className="overflow-hidden group border-2 border-border/40 hover:border-primary/40 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
                  >
                    <CardContent className="p-0 relative aspect-video bg-black/90">
                      <video
                        controls
                        preload="metadata"
                        src={video.path}
                        className="w-full h-full rounded-t-2xl"
                        controlsList="nodownload"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <FileDetailsModal file={video}>
                          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg backdrop-blur-sm bg-background/90">
                            <Info className="h-4 w-4" />
                          </Button>
                        </FileDetailsModal>
                        {isAdmin && (
                          <DeleteButton fileName={video['File Name']} type="videos" />
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="p-3 bg-gradient-to-br from-muted/30 to-transparent">
                      <p className="text-sm font-semibold truncate w-full">{video['File Name']}</p>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              
              {filteredVideos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                    <VideoIcon className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">No videos found</p>
                  <p className="text-sm text-muted-foreground/70">
                    {searchQuery ? 'Try a different search term' : 'Upload some videos to get started'}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Audio Tab */}
            <TabsContent value="audio" className="mt-0 space-y-4">
              {filteredAudio.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {filteredAudio.length} {filteredAudio.length === 1 ? 'track' : 'tracks'}
                </p>
              )}
              
              <div className="space-y-3">
                {filteredAudio.map((audioFile, index) => (
                  <Card 
                    key={audioFile['File Name']} 
                    className={cn(
                      "overflow-hidden border-2 transition-all duration-300 rounded-2xl bg-gradient-to-br from-card to-card/50 backdrop-blur-sm",
                      currentAudio?.['File Name'] === audioFile['File Name'] 
                        ? "border-primary shadow-xl shadow-primary/20" 
                        : "border-border/40 hover:border-primary/40 shadow-sm hover:shadow-lg"
                    )}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Play Button */}
                      <Button
                        variant={currentAudio?.['File Name'] === audioFile['File Name'] && isPlaying ? "default" : "outline"}
                        size="icon"
                        onClick={() => playAudio(audioFile)}
                        className="flex-shrink-0 h-12 w-12 rounded-full shadow-lg"
                      >
                        {currentAudio?.['File Name'] === audioFile['File Name'] && isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </Button>

                      {/* Track Number */}
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{index + 1}</span>
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-base">{audioFile['File Name']}</p>
                        {audioFile['Description'] && (
                          <p className="text-sm text-muted-foreground truncate">
                            {audioFile['Description']}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <FileDetailsModal file={audioFile}>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                            <Info className="h-4 w-4" />
                          </Button>
                        </FileDetailsModal>
                        {isAdmin && <DeleteButton fileName={audioFile['File Name']} type="audio" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredAudio.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                    <Music className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">No audio files found</p>
                  <p className="text-sm text-muted-foreground/70">
                    {searchQuery ? 'Try a different search term' : 'Upload some music to get started'}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-0 space-y-4">
              {filteredDocuments.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
                </p>
              )}
              
              <div className="space-y-3">
                {filteredDocuments.map((doc) => (
                  <Card 
                    key={doc['File Name']} 
                    className="overflow-hidden border-2 border-border/40 hover:border-primary/40 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Doc Icon */}
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>

                      {/* Doc Info */}
                      <a
                        href={doc.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-0 hover:underline"
                      >
                        <p className="font-semibold truncate text-base">{doc['File Name']}</p>
                        {doc['Description'] && (
                          <p className="text-sm text-muted-foreground truncate">
                            {doc['Description']}
                          </p>
                        )}
                      </a>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <FileDetailsModal file={doc}>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                            <Info className="h-4 w-4" />
                          </Button>
                        </FileDetailsModal>
                        <a href={doc.path} download>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                        {isAdmin && <DeleteButton fileName={doc['File Name']} type="documents" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredDocuments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">No documents found</p>
                  <p className="text-sm text-muted-foreground/70">
                    {searchQuery ? 'Try a different search term' : 'Upload some documents to get started'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modern Slideshow Modal (iOS/Android Style) */}
      {slideshowActive && filteredPhotos.length > 0 && (
        <div 
          className="fixed inset-0 bg-black z-50 flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Slideshow Header */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-4 sm:p-6 z-10 backdrop-blur-sm">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="text-white flex-1 min-w-0 mr-4">
                <p className="text-base sm:text-lg font-bold truncate">{filteredPhotos[currentIndex]['File Name']}</p>
                <p className="text-sm sm:text-base text-white/70 font-medium">
                  {currentIndex + 1} of {filteredPhotos.length}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20 h-10 w-10 rounded-full hidden sm:flex"
                >
                  <Maximize className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={stopSlideshow}
                  className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
            <div 
              className="relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
              style={{ transform: `scale(${zoom})` }}
            >
              <Image
                src={filteredPhotos[currentIndex].path}
                alt={filteredPhotos[currentIndex]['File Name']}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {/* Navigation Buttons */}
            <Button
              variant="ghost"
              size="icon"
              onClick={prevSlide}
              className="absolute left-2 sm:left-6 text-white bg-black/60 hover:bg-black/80 backdrop-blur-sm h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-xl"
            >
              <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextSlide}
              className="absolute right-2 sm:right-6 text-white bg-black/60 hover:bg-black/80 backdrop-blur-sm h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-xl"
            >
              <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </Button>
          </div>

          {/* Thumbnail Strip */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-6 backdrop-blur-sm">
            <div className="flex gap-2 sm:gap-3 overflow-x-auto max-w-7xl mx-auto pb-2 scrollbar-hide">
              {filteredPhotos.map((photo, index) => (
                <button
                  key={photo['File Name']}
                  onClick={() => {
                    setCurrentIndex(index);
                    setZoom(1);
                  }}
                  className={cn(
                    "relative flex-shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-3 transition-all duration-300",
                    index === currentIndex 
                      ? "border-white scale-110 shadow-2xl shadow-white/50 ring-2 ring-white" 
                      : "border-white/20 opacity-50 hover:opacity-100 hover:scale-105"
                  )}
                >
                  <Image
                    src={photo.path}
                    alt={photo['File Name']}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="absolute bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2">
            <div className="flex gap-1.5">
              {filteredPhotos.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    index === currentIndex 
                      ? "w-8 bg-white" 
                      : "w-1.5 bg-white/40"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Audio Player */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Inline Styles for Animations */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @supports (backdrop-filter: blur(0)) {
          .backdrop-blur-xl {
            backdrop-filter: blur(24px);
          }
          .backdrop-blur-sm {
            backdrop-filter: blur(8px);
          }
        }
      `}</style>
    </>
  );
}
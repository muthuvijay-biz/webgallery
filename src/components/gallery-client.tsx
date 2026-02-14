'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Video as VideoIcon,
  Info,
  Music,
  Play,
  Pause,
  Download,
  Grid3x3,
  List,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileMetadata } from '@/lib/files';
import { cn } from '@/lib/utils';
import { GalleryHeader } from './gallery-header';
import { PhotoCard } from './photocard';
import { FileDetailsModal } from './file-details-modal';
import { DeleteButton } from './delete-button';
import { Slideshow } from './slideshow';

type GalleryClientProps = {
  photos: FileMetadata[];
  videos: FileMetadata[];
  documents: FileMetadata[];
  audio?: FileMetadata[];
  isAdmin?: boolean;
};

type ViewMode = 'grid' | 'list';

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
        
        {/* Header */}
        <GalleryHeader
          isAdmin={isAdmin}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLogout={handleLogout}
        />

        {/* Content Area */}
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <Tabs defaultValue="photos" value={activeTab} onValueChange={setActiveTab}>
            
            {/* Modern Tab Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <TabsList className="bg-muted/50 backdrop-blur-sm p-1.5 rounded-xl sm:rounded-2xl border-2 border-border/40 shadow-lg w-full sm:w-auto grid grid-cols-4">
                <TabsTrigger 
                  value="photos" 
                  className="rounded-lg sm:rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-2 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <ImageIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold">{filteredPhotos.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="videos"
                  className="rounded-lg sm:rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-2 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <VideoIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold">{filteredVideos.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="audio"
                  className="rounded-lg sm:rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-2 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <Music className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold">{filteredAudio.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="documents"
                  className="rounded-lg sm:rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-2 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold">{filteredDocuments.length}</span>
                </TabsTrigger>
              </TabsList>

              {/* View Mode Toggle */}
              <div className="hidden md:flex items-center gap-1 bg-muted/50 backdrop-blur-sm p-1.5 rounded-2xl border-2 border-border/40">
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
            <TabsContent value="photos" className="mt-0 space-y-3 sm:space-y-4">
              {filteredPhotos.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Button 
                    onClick={() => startSlideshow(0)} 
                    className="rounded-full shadow-lg hover:shadow-xl transition-all w-full sm:w-auto h-10 sm:h-auto"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Slideshow
                  </Button>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
                  </p>
                </div>
              )}
              
              <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredPhotos.map((photo, index) => (
                  <PhotoCard 
                    key={photo['File Name']}
                    photo={photo}
                    index={index}
                    isAdmin={isAdmin}
                    onView={startSlideshow}
                  />
                ))}
              </div>
              
              {filteredPhotos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                    <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-muted-foreground">No photos found</p>
                  <p className="text-xs sm:text-sm text-muted-foreground/70">
                    {searchQuery ? 'Try a different search term' : 'Upload some photos to get started'}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="mt-0 space-y-3 sm:space-y-4">
              {filteredVideos.length > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
                </p>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredVideos.map((video) => (
                  <Card 
                    key={video['File Name']} 
                    className="overflow-hidden group border-2 border-border/40 hover:border-primary/40 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
                  >
                    <CardContent className="p-0 relative aspect-video bg-black/90">
                      <video
                        controls
                        preload="metadata"
                        src={video.path}
                        className="w-full h-full rounded-t-xl sm:rounded-t-2xl"
                        controlsList="nodownload"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <FileDetailsModal file={video}>
                          <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg backdrop-blur-sm bg-background/90">
                            <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </FileDetailsModal>
                        {isAdmin && (
                          <DeleteButton fileName={video['File Name']} type="videos" />
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="p-2 sm:p-3 bg-gradient-to-br from-muted/30 to-transparent">
                      <p className="text-xs sm:text-sm font-semibold truncate w-full">{video['File Name']}</p>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              
              {filteredVideos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                    <VideoIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-muted-foreground">No videos found</p>
                  <p className="text-xs sm:text-sm text-muted-foreground/70">
                    {searchQuery ? 'Try a different search term' : 'Upload some videos to get started'}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Audio Tab */}
            <TabsContent value="audio" className="mt-0 space-y-3 sm:space-y-4">
              {filteredAudio.length > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {filteredAudio.length} {filteredAudio.length === 1 ? 'track' : 'tracks'}
                </p>
              )}
              
              <div className="space-y-2 sm:space-y-3">
                {filteredAudio.map((audioFile, index) => (
                  <Card 
                    key={audioFile['File Name']} 
                    className={cn(
                      "overflow-hidden border-2 transition-all duration-300 rounded-xl sm:rounded-2xl bg-gradient-to-br from-card to-card/50 backdrop-blur-sm",
                      currentAudio?.['File Name'] === audioFile['File Name'] 
                        ? "border-primary shadow-xl shadow-primary/20" 
                        : "border-border/40 hover:border-primary/40 shadow-sm hover:shadow-lg"
                    )}
                  >
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                      {/* Play Button */}
                      <Button
                        variant={currentAudio?.['File Name'] === audioFile['File Name'] && isPlaying ? "default" : "outline"}
                        size="icon"
                        onClick={() => playAudio(audioFile)}
                        className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-lg"
                      >
                        {currentAudio?.['File Name'] === audioFile['File Name'] && isPlaying ? (
                          <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </Button>

                      {/* Track Number */}
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-primary">{index + 1}</span>
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm sm:text-base">{audioFile['File Name']}</p>
                        {audioFile['Description'] && (
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {audioFile['Description']}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <FileDetailsModal file={audioFile}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full">
                            <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </FileDetailsModal>
                        {isAdmin && <DeleteButton fileName={audioFile['File Name']} type="audio" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredAudio.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                    <Music className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-muted-foreground">No audio files found</p>
                  <p className="text-xs sm:text-sm text-muted-foreground/70">
                    {searchQuery ? 'Try a different search term' : 'Upload some music to get started'}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-0 space-y-3 sm:space-y-4">
              {filteredDocuments.length > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
                </p>
              )}
              
              <div className="space-y-2 sm:space-y-3">
                {filteredDocuments.map((doc) => (
                  <Card 
                    key={doc['File Name']} 
                    className="overflow-hidden border-2 border-border/40 hover:border-primary/40 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
                  >
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                      {/* Doc Icon */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                      </div>

                      {/* Doc Info */}
                      <a
                        href={doc.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-0 hover:underline"
                      >
                        <p className="font-semibold truncate text-sm sm:text-base">{doc['File Name']}</p>
                        {doc['Description'] && (
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {doc['Description']}
                          </p>
                        )}
                      </a>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <FileDetailsModal file={doc}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full">
                            <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </FileDetailsModal>
                        <a href={doc.path} download>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full">
                            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </a>
                        {isAdmin && <DeleteButton fileName={doc['File Name']} type="documents" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredDocuments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-muted-foreground">No documents found</p>
                  <p className="text-xs sm:text-sm text-muted-foreground/70">
                    {searchQuery ? 'Try a different search term' : 'Upload some documents to get started'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Slideshow Modal */}
      {slideshowActive && filteredPhotos.length > 0 && (
        <Slideshow
          photos={filteredPhotos}
          currentIndex={currentIndex}
          zoom={zoom}
          onClose={stopSlideshow}
          onNext={nextSlide}
          onPrev={prevSlide}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onToggleFullscreen={toggleFullscreen}
          onIndexChange={(index) => {
            setCurrentIndex(index);
            setZoom(1);
          }}
        />
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

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
  X,
  ChevronUp,
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

type GalleryClientProps = {
  photos: FileMetadata[];
  videos: FileMetadata[];
  documents: FileMetadata[];
  audio?: FileMetadata[];
  isAdmin?: boolean;
};

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Image viewer state (NO SLIDESHOW)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
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

  const openViewer = useCallback((index: number) => {
    setCurrentIndex(index);
    setViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
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
            <div className="mb-4 sm:mb-6">
              <TabsList className="bg-muted/50 backdrop-blur-sm p-1.5 rounded-xl sm:rounded-2xl border-2 border-border/40 shadow-lg w-full grid grid-cols-4">
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
            </div>

            {/* Photos Tab */}
            <TabsContent value="photos" className="mt-0 space-y-3 sm:space-y-4">
              {filteredPhotos.length > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground px-1">
                  {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
                </p>
              )}
              
              <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredPhotos.map((photo, index) => (
                  <PhotoCard 
                    key={photo['File Name']}
                    photo={photo}
                    index={index}
                    isAdmin={isAdmin}
                    onView={openViewer}
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
                <p className="text-xs sm:text-sm text-muted-foreground px-1">
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
                        playsInline
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
                      <div className="w-full">
                        <p className="text-xs sm:text-sm font-semibold truncate w-full">{video['File Name']}</p>
                        {video['Description'] && (
                          <p className="text-xs text-muted-foreground truncate w-full">{video['Description']}</p>
                        )}
                      </div>
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
                <p className="text-xs sm:text-sm text-muted-foreground px-1">
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

                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-primary">{index + 1}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm sm:text-base">{audioFile['File Name']}</p>
                        {audioFile['Description'] && (
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {audioFile['Description']}
                          </p>
                        )}
                      </div>

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
                <p className="text-xs sm:text-sm text-muted-foreground px-1">
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
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                      </div>

                      <a
                        href={doc.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-0"
                      >
                        <p className="font-semibold truncate text-sm sm:text-base">{doc['File Name']}</p>
                        {doc['Description'] && (
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {doc['Description']}
                          </p>
                        )}
                      </a>

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

      {/* Mobile Image Viewer - NO SLIDESHOW */}
      {viewerOpen && filteredPhotos.length > 0 && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-3 sm:p-4 z-20">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-sm sm:text-base font-medium">
                  {currentIndex + 1} / {filteredPhotos.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const drawer = document.getElementById('image-drawer');
                    if (drawer) {
                      drawer.classList.toggle('translate-y-0');
                      drawer.classList.toggle('translate-y-full');
                    }
                  }}
                  className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10 rounded-full"
                >
                  <Info className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeViewer}
                  className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10 rounded-full"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image Container with Swipe */}
          <div 
            className="flex-1 relative overflow-hidden"
            onTouchStart={(e) => {
              const touch = e.touches[0];
              (window as any).touchStartX = touch.clientX;
              (window as any).touchStartY = touch.clientY;
            }}
            onTouchMove={(e) => {
              if (!(window as any).touchStartX) return;
              const touch = e.touches[0];
              const diffX = touch.clientX - (window as any).touchStartX;
              const diffY = Math.abs(touch.clientY - (window as any).touchStartY);
              
              if (diffY < 50) {
                const img = document.getElementById('swipe-image');
                if (img) {
                  img.style.transform = `translateX(${diffX}px)`;
                  img.style.transition = 'none';
                }
              }
            }}
            onTouchEnd={(e) => {
              const touch = e.changedTouches[0];
              const diffX = touch.clientX - (window as any).touchStartX;
              const diffY = Math.abs(touch.clientY - (window as any).touchStartY);
              
              const img = document.getElementById('swipe-image');
              if (img) {
                img.style.transform = 'translateX(0)';
                img.style.transition = 'transform 0.3s ease-out';
              }
              
              if (diffY < 50) {
                if (diffX > 100 && currentIndex > 0) {
                  setCurrentIndex(prev => prev - 1);
                } else if (diffX < -100 && currentIndex < filteredPhotos.length - 1) {
                  setCurrentIndex(prev => prev + 1);
                }
              }
              
              delete (window as any).touchStartX;
              delete (window as any).touchStartY;
            }}
          >
            <div id="swipe-image" className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out">
              <Image
                src={filteredPhotos[currentIndex].path}
                alt={filteredPhotos[currentIndex]['File Name']}
                fill
                className="object-contain"
                sizes="100vw"
                priority
                quality={90}
              />
            </div>

            {currentIndex > 0 && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 sm:w-20 h-full bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
            )}
            {currentIndex < filteredPhotos.length - 1 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 sm:w-20 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
            )}
          </div>

          {/* Progress Dots */}
          <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-1.5 z-10">
            {filteredPhotos.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 sm:h-1.5 rounded-full transition-all duration-300",
                  index === currentIndex 
                    ? "w-6 sm:w-8 bg-white" 
                    : "w-1 sm:w-1.5 bg-white/40"
                )}
              />
            ))}
          </div>

          {/* Swipe Up Hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/60 z-10 animate-bounce">
            <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />
            <p className="text-xs">Swipe up for details</p>
          </div>

          {/* Bottom Drawer */}
          <div
            id="image-drawer"
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out z-30 translate-y-full"
          >
            <div className="flex justify-center py-3 border-b border-border/40">
              <button
                onClick={() => {
                  const drawer = document.getElementById('image-drawer');
                  if (drawer) {
                    drawer.classList.toggle('translate-y-0');
                    drawer.classList.toggle('translate-y-full');
                  }
                }}
                className="w-10 sm:w-12 h-1 sm:h-1.5 bg-muted-foreground/30 rounded-full active:bg-muted-foreground/50"
              />
            </div>

            <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold">File Details</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const drawer = document.getElementById('image-drawer');
                    if (drawer) {
                      drawer.classList.add('translate-y-full');
                      drawer.classList.remove('translate-y-0');
                    }
                  }}
                  className="rounded-full -mt-2 -mr-2"
                >
                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="bg-muted/30 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    File Name
                  </p>
                  <p className="text-sm font-medium break-all">{filteredPhotos[currentIndex]['File Name']}</p>
                </div>

                {filteredPhotos[currentIndex]['Description'] && (
                  <div className="bg-muted/30 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Description
                    </p>
                    <p className="text-sm">{filteredPhotos[currentIndex]['Description']}</p>
                  </div>
                )}

                {filteredPhotos[currentIndex]['Capture Date'] && (
                  <div className="bg-muted/30 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Capture Date
                    </p>
                    <p className="text-sm">{filteredPhotos[currentIndex]['Capture Date']}</p>
                  </div>
                )}

                {filteredPhotos[currentIndex]['Upload Date'] && (
                  <div className="bg-muted/30 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Upload Date
                    </p>
                    <p className="text-sm">{filteredPhotos[currentIndex]['Upload Date']}</p>
                  </div>
                )}

                {isAdmin && (
                  <div className="pt-3 sm:pt-4 border-t border-border/40">
                    <DeleteButton fileName={filteredPhotos[currentIndex]['File Name']} type="images" />
                  </div>
                )}
              </div>
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
    </>
  );
}
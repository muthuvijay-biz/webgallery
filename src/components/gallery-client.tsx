'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';
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
  ChevronLeft,
  ChevronRight,
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
import { useIsMobile } from '@/hooks/use-mobile';

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
  const pswpRef = useRef<any>(null);

  // Initialize PhotoSwipeLightbox for the grid on client
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const lightbox = new PhotoSwipeLightbox({
        gallery: '#pswp-gallery',
        children: 'a',
        pswpModule: PhotoSwipe,
        showHideAnimationType: 'zoom'
      });
      lightbox.init();
      pswpRef.current = lightbox;
      return () => {
        try { lightbox.destroy(); } catch (e) {}
        pswpRef.current = null;
      };
    } catch (e) {
      console.error('PhotoSwipe init error:', e);
    }
  }, []);
  
  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  // small enter animation flag for smoother opening
  const [viewerJustOpened, setViewerJustOpened] = useState(false);
  // whether the embla/full viewer has positioned to the requested index (prevents flash-through)
  const [viewerReady, setViewerReady] = useState(true);
  // Sliding animation state for mobile/desktop gallery-style transitions
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [slideActive, setSlideActive] = useState(false);

  // Drawer state & drag handling for mobile swipe
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const drawerStartYRef = useRef<number | null>(null);
  const drawerLastTouchYRef = useRef<number | null>(null);
  const drawerLastTouchTimeRef = useRef<number | null>(null);
  const drawerInitialScrollRef = useRef<number>(0);
  const [drawerTranslateY, setDrawerTranslateY] = useState(0);
  const [isDrawerDragging, setIsDrawerDragging] = useState(false);

  // slide/animation timeout ref — used to reliably clear in-flight slide animations
  const slideTimeoutRef = useRef<number | null>(null);

  // Embla carousel for viewer (provides smooth native swipes)
  const [emblaRef, emblaApi] = useEmblaCarousel({ containScroll: 'trimSnaps', skipSnaps: false });

  // Sync Embla selection -> currentIndex
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const selected = emblaApi.selectedScrollSnap();
      setCurrentIndex(selected);
    };
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  // When viewer opens, ensure Embla is at the current index
  useEffect(() => {
    if (!emblaApi) return;

    // If viewer is open, ensure embla is positioned at currentIndex.
    // Use a 'ready' signal to avoid rendering the carousel until it has jumped there.
    if (viewerOpen) {
      try {
        emblaApi.scrollTo(currentIndex);
      } catch (e) {
        /* ignore */
      }

      // when embla reports the selected snap equals our index mark viewerReady
      const onSelect = () => {
        const selected = emblaApi.selectedScrollSnap();
        if (selected === currentIndex) {
          setViewerReady(true);
        }
      };

      // fallback in case the select event doesn't fire quickly
      const t = window.setTimeout(() => setViewerReady(true), 300);
      emblaApi.on('select', onSelect);

      return () => {
        clearTimeout(t);
        try { emblaApi.off('select', onSelect); } catch (e) {}
      };
    } else {
      // viewer closed — mark ready so next open can control readiness explicitly
      setViewerReady(true);
    }
  }, [emblaApi, viewerOpen, currentIndex]);
  
  // Audio player state
  const [currentAudio, setCurrentAudio] = useState<FileMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // detect mobile viewport
  const isMobile = useIsMobile();

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

  // drag tracking for gallery swipe (follows finger)


  const openViewer = useCallback((index: number) => {
    // cancel any in-flight slide cleanup and reset slide state to avoid stuck animations
    if (slideTimeoutRef.current) {
      clearTimeout(slideTimeoutRef.current);
      slideTimeoutRef.current = null;
    }
    setIsSliding(false);
    setPrevIndex(null);
    setSlideDirection(null);
    setSlideActive(false);

    // ensure drawer is closed when opening the full viewer
    setDrawerOpen(false);

    // mark viewer as not-yet-ready so we can avoid showing the wrong slide
    setViewerReady(false);

    setCurrentIndex(index);
    setViewerOpen(true);
    // trigger a brief enter animation for a smoother open transition
    setViewerJustOpened(true);
    // ensure the flag always clears quickly (safety: also clear on animation end)
    window.requestAnimationFrame(() => {
      setTimeout(() => setViewerJustOpened(false), 220);
    });
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    setViewerJustOpened(false);
    setIsSliding(false);
    setPrevIndex(null);
    setSlideDirection(null);
    setSlideActive(false);
    if (slideTimeoutRef.current) {
      clearTimeout(slideTimeoutRef.current);
      slideTimeoutRef.current = null;
    }
    setDrawerOpen(false);
  }, []);

  // PhotoSwipe is initialized below (desktop lightbox).

  // ensure no focused descendant remains inside the drawer when it is hidden
  useEffect(() => {
    if (!drawerOpen && drawerRef.current) {
      const active = document.activeElement as HTMLElement | null;
      if (active && drawerRef.current.contains(active)) {
        try { active.blur(); } catch (e) { /* ignore */ }
      }
    }
  }, [drawerOpen]);

  // LightGallery will be initialized via the React component wrapper on the grid (see JSX)
  // we only store its instance via onInit so we can programmatically open/close it.

  // Navigate with slide animation (gallery-style). If viewer is closed, just set index.
  const navigateTo = useCallback((index: number) => {
    if (index === currentIndex) return;

    // If embla is active and viewer is open, delegate to embla for smooth navigation
    try {
      if (viewerOpen && emblaApi) {
        emblaApi.scrollTo(index);
        setCurrentIndex(index);
        return;
      }
    } catch (e) {
      /* fall back */
    }

    if (isSliding) return; // prevent overlapping animations

    // if viewer isn't open yet, just jump
    if (!viewerOpen) {
      setCurrentIndex(index);
      return;
    }

    const direction: 'left' | 'right' = index > currentIndex ? 'left' : 'right';
    setPrevIndex(currentIndex);
    setSlideDirection(direction);
    setCurrentIndex(index);
    setIsSliding(true);
    setSlideActive(false);

    // start the CSS transition on the next frame
    requestAnimationFrame(() => setSlideActive(true));

    // cleanup after animation duration — store timeout so we can cancel if viewer closes
    if (slideTimeoutRef.current) {
      clearTimeout(slideTimeoutRef.current);
      slideTimeoutRef.current = null;
    }
    const timeout = window.setTimeout(() => {
      setIsSliding(false);
      setPrevIndex(null);
      setSlideDirection(null);
      setSlideActive(false);
      if (slideTimeoutRef.current) {
        clearTimeout(slideTimeoutRef.current);
        slideTimeoutRef.current = null;
      }
    }, 350);
    slideTimeoutRef.current = timeout;
  }, [currentIndex, isSliding, viewerOpen, emblaApi]);

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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        
        <GalleryHeader
          isAdmin={isAdmin}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLogout={handleLogout}
        />

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <Tabs defaultValue="photos" value={activeTab} onValueChange={setActiveTab}>
            
            <div className="mb-4 sm:mb-6">
              <TabsList className="bg-muted/50 backdrop-blur-sm p-1.5 rounded-xl sm:rounded-2xl border-2 border-border/40 shadow-lg w-full grid grid-cols-4">
                <TabsTrigger value="photos" className="rounded-lg sm:rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                  <ImageIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold">{filteredPhotos.length}</span>
                </TabsTrigger>
                <TabsTrigger value="videos" className="rounded-lg sm:rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                  <VideoIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold">{filteredVideos.length}</span>
                </TabsTrigger>
                <TabsTrigger value="audio" className="rounded-lg sm:rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                  <Music className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold">{filteredAudio.length}</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="rounded-lg sm:rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all px-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                  <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-semibold">{filteredDocuments.length}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="photos" className="mt-0 space-y-3 sm:space-y-4">
              {filteredPhotos.length > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground px-1">
                  {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
                </p>
              )}
              
              {/* PhotoSwipe: grid must have id `pswp-gallery` so PhotoSwipeLightbox can index anchors */}
              <div id="pswp-gallery" className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredPhotos.map((photo, index) => (
                  <PhotoCard 
                    key={photo['File Name']}
                    photo={photo}
                    index={index}
                    isAdmin={isAdmin}
                    onView={(idx) => {
                      // Decide viewer behavior by viewport (mobile breakpoint), not by presence of touch support.
                      // This ensures desktop users (even on touch-capable devices) get the desktop lightbox.
                      console.debug('[gallery] PhotoCard onView', { idx, isMobile, width: typeof window !== 'undefined' ? window.innerWidth : null });
                      if (isMobile) {
                        setCurrentIndex(idx);
                        setDrawerOpen(true);
                        setViewerOpen(false); // ensure full viewer isn't active
                        try { pswpRef.current?.close?.(); } catch (e) {}
                        return;
                      }

                      try { pswpRef.current?.open(idx); return; } catch (e) { /* fallback below */ }
                      viewerOpen ? navigateTo(idx) : openViewer(idx);
                    }}
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

            <TabsContent value="videos" className="mt-0 space-y-3 sm:space-y-4">
              {filteredVideos.length > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground px-1">
                  {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
                </p>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredVideos.map((video) => (
                  <Card key={video['File Name']} className="overflow-hidden group border-2 border-border/40 hover:border-primary/40 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                    <CardContent className="p-0 relative aspect-video bg-black/90">
                      <video controls preload="metadata" src={video.path} className="w-full h-full rounded-t-xl sm:rounded-t-2xl" playsInline />
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <FileDetailsModal file={video}>
                          <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg backdrop-blur-sm bg-background/90">
                            <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </FileDetailsModal>
                        {isAdmin && <DeleteButton fileName={video['File Name']} type="videos" />}
                      </div>
                    </CardContent>
                    <CardFooter className="p-2 sm:p-3 bg-gradient-to-br from-muted/30 to-transparent">
                      <div className="w-full">
                        <p className="text-xs sm:text-sm font-semibold truncate w-full">{video['File Name']}</p>
                        {video['Description'] && <p className="text-xs text-muted-foreground truncate w-full">{video['Description']}</p>}
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
                  <p className="text-xs sm:text-sm text-muted-foreground/70">{searchQuery ? 'Try a different search term' : 'Upload some videos to get started'}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="audio" className="mt-0 space-y-3 sm:space-y-4">
              {filteredAudio.length > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground px-1">
                  {filteredAudio.length} {filteredAudio.length === 1 ? 'track' : 'tracks'}
                </p>
              )}
              
              <div className="space-y-2 sm:space-y-3">
                {filteredAudio.map((audioFile, index) => (
                  <Card key={audioFile['File Name']} className={cn("overflow-hidden border-2 transition-all duration-300 rounded-xl sm:rounded-2xl bg-gradient-to-br from-card to-card/50 backdrop-blur-sm", currentAudio?.['File Name'] === audioFile['File Name'] ? "border-primary shadow-xl shadow-primary/20" : "border-border/40 hover:border-primary/40 shadow-sm hover:shadow-lg")}>
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                      <Button variant={currentAudio?.['File Name'] === audioFile['File Name'] && isPlaying ? "default" : "outline"} size="icon" onClick={() => playAudio(audioFile)} className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-lg">
                        {currentAudio?.['File Name'] === audioFile['File Name'] && isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </Button>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm sm:text-base">{audioFile['File Name']}</p>
                        {audioFile['Description'] && <p className="text-xs sm:text-sm text-muted-foreground truncate">{audioFile['Description']}</p>}
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
                  <p className="text-xs sm:text-sm text-muted-foreground/70">{searchQuery ? 'Try a different search term' : 'Upload some music to get started'}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-0 space-y-3 sm:space-y-4">
              {filteredDocuments.length > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground px-1">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
                </p>
              )}
              
              <div className="space-y-2 sm:space-y-3">
                {filteredDocuments.map((doc) => (
                  <Card key={doc['File Name']} className="overflow-hidden border-2 border-border/40 hover:border-primary/40 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <a href={doc.path} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm sm:text-base">{doc['File Name']}</p>
                        {doc['Description'] && <p className="text-xs sm:text-sm text-muted-foreground truncate">{doc['Description']}</p>}
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
                  <p className="text-xs sm:text-sm text-muted-foreground/70">{searchQuery ? 'Try a different search term' : 'Upload some documents to get started'}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Image Viewer + Drawer — render the overlay when either the full viewer or the drawer is open */}
      {(viewerOpen || drawerOpen) && filteredPhotos.length > 0 && (
        <div className="fixed inset-0 bg-black z-50">
          {/* Header (only shown for the full viewer) */}
          {viewerOpen && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-4 z-20">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">{currentIndex + 1} / {filteredPhotos.length}</span>
                <button onClick={closeViewer} className="text-white hover:bg-white/20 h-10 w-10 rounded-full flex items-center justify-center transition">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Image with Embla carousel for smooth native swipes (only for full viewer) */}
          {viewerOpen && (
            <div className="h-full flex items-center justify-center relative">
              <div className="w-full h-full" ref={emblaRef}>
                <div className={cn("flex h-full", !viewerReady && "opacity-0 pointer-events-none") }>
                  {filteredPhotos.map((photo, idx) => (
                    <div key={photo['File Name']} className="relative w-full h-full flex-shrink-0">
                      <div className="relative w-full h-full">
                        <Image src={photo.path} alt={photo['File Name']} fill className="object-contain" sizes="100vw" priority quality={90} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* show the requested image immediately while Embla positions (no flash-through) */}
                {!viewerReady && (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
                      <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center p-4">
                        <Image
                          src={filteredPhotos[currentIndex].path}
                          alt={filteredPhotos[currentIndex]['File Name']}
                          fill
                          className="object-contain"
                          sizes="100vw"
                        />
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <div className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">Loading…</div>
                    </div>
                  </>
                )}
              </div>

              {/* Desktop Arrow Controls - HIDDEN ON MOBILE */}
              {currentIndex > 0 && (
                <button onClick={() => navigateTo(currentIndex - 1)} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/60 hover:bg-black/80 h-12 w-12 rounded-full items-center justify-center backdrop-blur-sm z-10">
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {currentIndex < filteredPhotos.length - 1 && (
                <button onClick={() => navigateTo(currentIndex + 1)} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/60 hover:bg-black/80 h-12 w-12 rounded-full items-center justify-center backdrop-blur-sm z-10">
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>
          )}

          {/* Bottom Description - visible when viewer overlay OR drawer is open */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent p-4 pb-6 z-20 cursor-pointer"
            onClick={() => { setDrawerOpen((s) => { const next = !s; if (next) setViewerOpen(false); return next; }); }}
            onTouchStart={(e) => {
              (window as any).overlayStartY = e.touches[0].clientY;
            }}
            onTouchMove={(e) => {
              const startY = (window as any).overlayStartY;
              if (typeof startY !== 'number') return;
              const delta = e.touches[0].clientY - startY;
              // provide basic visual feedback by nudging drawer translate while dragging up
              if (delta < 0) {
                setIsDrawerDragging(true);
                setDrawerTranslateY(Math.max(0, 100 + delta)); // not exact, just small feedback
              }
            }}
            onTouchEnd={(e) => {
              const startY = (window as any).overlayStartY;
              const endY = e.changedTouches[0].clientY;
              (window as any).overlayStartY = null;
              setIsDrawerDragging(false);
              setDrawerTranslateY(0);
              if (typeof startY === 'number') {
                const diff = endY - startY;
                if (diff < -80) {
                  setDrawerOpen(true);
                }
              }
            }}
          >
            <p className="text-white font-semibold text-sm line-clamp-1">{filteredPhotos[currentIndex]['File Name']}</p>
            {filteredPhotos[currentIndex]['Description'] && (
              <p className="text-white/80 text-sm line-clamp-2 mt-2">{filteredPhotos[currentIndex]['Description']}</p>
            )}
            <div className="flex items-center justify-center mt-2">
              <ChevronUp className="h-4 w-4 text-white/60" />
            </div>
          </div>

          {/* Bottom Drawer - Full Details (rendered when drawerOpen is true) */}
          {drawerOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/40"
                style={{ zIndex: 29 }}
                onClick={() => setDrawerOpen(false)}
              />

              <div
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-hidden={!drawerOpen}
                inert={!drawerOpen}
                className={`absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl z-30 max-h-[80vh] overflow-auto ${isDrawerDragging ? '' : 'transition-transform duration-300'}`}
                style={{ transform: `translateY(${drawerOpen ? (isDrawerDragging ? drawerTranslateY : 0) : '100%'})`, touchAction: 'pan-y' } as any}
                onTouchStart={(e) => {
                  const y = e.touches[0].clientY;
                  drawerStartYRef.current = y;
                  drawerLastTouchYRef.current = y;
                  drawerLastTouchTimeRef.current = Date.now();
                  drawerInitialScrollRef.current = drawerRef.current?.scrollTop ?? 0;
                  setIsDrawerDragging(true);
                  setDrawerTranslateY(0);
                }}
                onTouchMove={(e) => {
                  const startY = drawerStartYRef.current;
                  if (startY === null) return;
                  const y = e.touches[0].clientY;
                  const delta = y - startY;

                  // track last touch for velocity
                  drawerLastTouchYRef.current = y;
                  drawerLastTouchTimeRef.current = Date.now();

                  // if content is scrolled, don't intercept the pull-down
                  if (drawerInitialScrollRef.current > 0 && delta > 0) return;

                  if (delta > 0) {
                    e.preventDefault();
                    // apply rubber-band effect for large drags
                    const capped = Math.min(delta, window.innerHeight * 0.6);
                    setDrawerTranslateY(capped);
                  }
                }}
                onTouchEnd={() => {
                  const startY = drawerStartYRef.current ?? 0;
                  const lastY = drawerLastTouchYRef.current ?? startY;
                  const lastTime = drawerLastTouchTimeRef.current ?? Date.now();
                  const now = Date.now();
                  const delta = (lastY - startY) || 0; // positive if dragged down
                  const timeDiff = Math.max(1, now - lastTime);
                  const velocity = delta / timeDiff; // px per ms

                  setIsDrawerDragging(false);

                  const THRESHOLD = 110; // px
                  const VELOCITY_CLOSE = 0.5; // px/ms (~500px/s)

                  if (drawerTranslateY > THRESHOLD || velocity > VELOCITY_CLOSE) {
                    setDrawerOpen(false);
                  } else {
                    setDrawerTranslateY(0);
                  }

                  drawerStartYRef.current = null;
                  drawerLastTouchYRef.current = null;
                  drawerLastTouchTimeRef.current = null;
                }}
              >
                <div className="relative">
                  <div className="flex justify-center py-3 border-b">
                    <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
                  </div>

                  {/* Move Delete to top-right inside drawer */}
                  {isAdmin && (
                    <div className="absolute right-4 top-4">
                      <DeleteButton fileName={filteredPhotos[currentIndex]['File Name']} type="images" />
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <h2 className="text-xl font-bold">Details</h2>
                  <div className="space-y-3">
                    <div className="bg-muted/30 rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">File Name</p>
                      <p className="text-sm font-medium">{filteredPhotos[currentIndex]['File Name']}</p>
                    </div>
                    {filteredPhotos[currentIndex]['Description'] && (
                      <div className="bg-muted/30 rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</p>
                        <p className="text-sm break-words">{filteredPhotos[currentIndex]['Description']}</p>
                      </div>
                    )}
                    {filteredPhotos[currentIndex]['Capture Date'] && (
                      <div className="bg-muted/30 rounded-xl p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Capture Date</p>
                        <p className="text-sm">{filteredPhotos[currentIndex]['Capture Date']}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} />
    </>
  );
}
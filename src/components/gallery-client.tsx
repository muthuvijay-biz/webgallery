'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';
import { GalleryHeader } from './gallery-header';
import { PhotoCard } from './photocard';
import { DeleteButton } from './delete-button';
import DocumentViewer from './document-viewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { FileMetadata } from '@/lib/files';
import { Info, X, GripHorizontal, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface GalleryClientProps {
  photos: FileMetadata[];
  videos: FileMetadata[];
  documents: FileMetadata[];
  audios: FileMetadata[];
  isAdmin: boolean;
}

export function GalleryClient({ photos, videos, documents, audios, isAdmin }: GalleryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'photos' | 'videos' | 'documents' | 'audios'>('photos');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [drawerHeight, setDrawerHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);
  const pswpInstanceRef = useRef<PhotoSwipe | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const openDrawerRef = useRef<(() => void) | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);

  // Store drawer open function
  openDrawerRef.current = () => {
    setDrawerOpen(true);
  };

  const handleLogout = () => {
    window.location.href = '/login';
  };

  // Filter files based on search query
  const filterFiles = useCallback((files: FileMetadata[]) => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(file => 
      file['File Name'].toLowerCase().includes(query) ||
      file['Description']?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const filteredPhotos = filterFiles(photos);
  const filteredVideos = filterFiles(videos);
  const filteredDocuments = filterFiles(documents);
  const filteredAudios = filterFiles(audios);

  // Initialize PhotoSwipe
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const lightbox = new PhotoSwipeLightbox({
      gallery: '#photoswipe-gallery',
      children: 'a',
      pswpModule: PhotoSwipe,
      bgOpacity: 1,
      showHideAnimationType: 'zoom',
      closeOnVerticalDrag: true,
      pinchToClose: true,
      padding: { top: 0, bottom: 150, left: 0, right: 0 },
      imageClickAction: 'zoom',
      tapAction: 'toggle-controls',
      doubleTapAction: 'zoom',
      zoom: true,
      maxZoomLevel: 4,
      minZoomLevel: 1,
    });

    // Add custom UI elements
    lightbox.on('uiRegister', () => {
      if (!lightbox.pswp || !lightbox.pswp.ui) return;

      // Download button
      lightbox.pswp.ui.registerElement({
        name: 'download-button',
        order: 8,
        isButton: true,
        html: {
          isCustomSVG: true,
          inner: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
          outlineID: 'pswp__icn-download',
        },
        onClick: async (e: Event, el: HTMLElement, pswp: any) => {
          e.preventDefault();
          e.stopPropagation();
          const currSlide = pswp.currSlide;
          if (currSlide && currSlide.data.element) {
            const imageUrl = currSlide.data.element.href;
            const filename = currSlide.data.element.dataset.caption?.split('|||')[0] || 'image';
            
            try {
              const response = await fetch(imageUrl);
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            } catch (error) {
              console.error('Download failed:', error);
            }
          }
        },
      });

      // Delete button (only for admin)
      if (isAdmin) {
        lightbox.pswp.ui.registerElement({
          name: 'delete-button',
          order: 9,
          isButton: true,
          html: {
            isCustomSVG: true,
            inner: '<path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
            outlineID: 'pswp__icn-delete',
          },
          onClick: (e: Event, el: HTMLElement, pswp: any) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Trigger delete without closing PhotoSwipe
            setTimeout(() => {
              const deleteBtns = document.querySelectorAll('button');
              for (const btn of deleteBtns) {
                if (btn.className.includes('destructive')) {
                  btn.click();
                  break;
                }
              }
            }, 10);
            return false;
          },
        });
      }

      // Caption showing filename and limited description - tap to open drawer
      lightbox.pswp.ui.registerElement({
        name: 'custom-caption',
        order: 9,
        isButton: false,
        appendTo: 'wrapper',
        html: '<div class="pswp-caption-content"></div>',
        onInit: (el: HTMLElement, pswp: any) => {
          // Force visibility with important styles
          el.setAttribute('style', 'position: absolute !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; z-index: 99999 !important; pointer-events: auto !important; display: block !important;');
          
          // Single click handler on the container element
          const handleClick = (e: any) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Caption clicked!'); // Debug
            setDrawerOpen(true);
          };
          
          el.addEventListener('click', handleClick, false);
          el.addEventListener('touchend', handleClick, false);
          
          const updateCaption = () => {
            const currSlide = pswp.currSlide;
            if (!currSlide || !currSlide.data.element) {
              el.innerHTML = '';
              return;
            }
            
            const caption = currSlide.data.element.dataset.caption || '';
            if (!caption) {
              el.innerHTML = '';
              return;
            }
            
            const filename = caption.split('|||')[0];
            const fullDesc = caption.split('|||')[1] || '';
            const shortDesc = fullDesc.length > 80 ? fullDesc.substring(0, 80) + '...' : fullDesc;
            
            el.innerHTML = `<div class="caption-clickable" style="background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 70%, transparent 100%); padding: 16px 12px 24px; text-align: center; cursor: pointer; min-height: 100px; display: flex; flex-direction: column; justify-content: flex-end; width: 100%;">
              <div style="color: white; font-size: clamp(14px, 4vw, 18px); font-weight: 700; margin-bottom: 8px; text-shadow: 0 2px 8px rgba(0,0,0,0.5); word-wrap: break-word; overflow-wrap: break-word; max-width: 100%; padding: 0 8px;">${filename}</div>
              ${shortDesc ? `<div style="color: rgba(255,255,255,0.9); font-size: clamp(12px, 3.5vw, 15px); margin-bottom: 12px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); word-wrap: break-word; overflow-wrap: break-word; max-width: 100%; padding: 0 8px; line-height: 1.4;">${shortDesc}</div>` : ''}
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px; color: rgba(255,255,255,0.8); font-size: clamp(10px, 3vw, 13px); margin-top: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 15l-6-6-6 6"/>
                </svg>
                <span style="text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">TAP FOR DETAILS</span>
              </div>
            </div>`;
          };
          
          pswp.on('change', updateCaption);
          pswp.on('afterInit', updateCaption);
          setTimeout(updateCaption, 100);
        },
      });
    });

    // Track current slide to update drawer content
    lightbox.on('change', () => {
      if (!lightbox.pswp) return;
      const currentIndex = lightbox.pswp.currIndex;
      const currentItem = filteredPhotos[currentIndex];
      if (currentItem) {
        setSelectedFile(currentItem);
        setCurrentFileName(currentItem['File Name']);
      }
    });

    // Set initial file when opened
    lightbox.on('afterInit', () => {
      if (!lightbox.pswp) return;
      pswpInstanceRef.current = lightbox.pswp;
      const currentIndex = lightbox.pswp.currIndex;
      const currentItem = filteredPhotos[currentIndex];
      if (currentItem) {
        setSelectedFile(currentItem);
        setCurrentFileName(currentItem['File Name']);
      }
    });

    // Close drawer when PhotoSwipe closes
    lightbox.on('close', () => {
      setDrawerOpen(false);
      setSelectedFile(null);
      pswpInstanceRef.current = null;
    });

    lightbox.init();
    lightboxRef.current = lightbox;

    return () => {
      lightbox.destroy();
      lightboxRef.current = null;
    };
  }, [filteredPhotos]);

  // Handle drawer drag gestures
  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startHeightRef.current = drawerHeight;
    lastYRef.current = clientY;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;

    const deltaY = startYRef.current - clientY;
    const newHeight = Math.max(0, Math.min(window.innerHeight * 0.7, startHeightRef.current + deltaY));
    setDrawerHeight(newHeight);

    // Calculate velocity
    const now = Date.now();
    const timeDelta = now - lastTimeRef.current;
    if (timeDelta > 0) {
      velocityRef.current = (clientY - lastYRef.current) / timeDelta;
    }
    lastYRef.current = clientY;
    lastTimeRef.current = now;
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Check velocity for quick swipe down
    if (velocityRef.current > 0.5) {
      setDrawerOpen(false);
      setDrawerHeight(0);
      return;
    }

    // Snap to closed if dragged down more than 30%
    const threshold = window.innerHeight * 0.21;
    if (drawerHeight < threshold) {
      setDrawerOpen(false);
      setDrawerHeight(0);
    } else {
      // Snap to default height
      setDrawerHeight(window.innerHeight * 0.4);
    }
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleDragMove(e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Add/remove event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // Set drawer height when opened
  useEffect(() => {
    if (drawerOpen && drawerHeight === 0) {
      setDrawerHeight(window.innerHeight * 0.4);
    } else if (!drawerOpen) {
      setDrawerHeight(0);
    }
  }, [drawerOpen]);

  // Audio player functions
  const playAudio = (audioPath: string) => {
    if (currentAudio) {
      currentAudio.pause();
    }
    const audio = new Audio(audioPath);
    audio.volume = isMuted ? 0 : 1;
    audio.play();
    setCurrentAudio(audio);
    setIsPlaying(true);

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
    });
  };

  const togglePlayPause = () => {
    if (!currentAudio) return;
    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
    } else {
      currentAudio.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!currentAudio) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    currentAudio.volume = newMuted ? 0 : 1;
  };

  return (
    <div className="min-h-screen bg-background">
      <GalleryHeader
        isAdmin={isAdmin}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
      />

      <main className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-20">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="sticky top-[4.5rem] sm:top-[5rem] z-30 bg-background/95 backdrop-blur-md pb-4 mb-6 border-b border-border/30">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
              <TabsTrigger value="photos">Photos ({filteredPhotos.length})</TabsTrigger>
              <TabsTrigger value="videos">Videos ({filteredVideos.length})</TabsTrigger>
              <TabsTrigger value="audios">Audio ({filteredAudios.length})</TabsTrigger>
              <TabsTrigger value="documents">Docs ({filteredDocuments.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="photos" className="mt-0">
            <div 
              id="photoswipe-gallery" 
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
            >
              {filteredPhotos.map((photo, index) => (
                <PhotoCard key={photo['File Name']} photo={photo} index={index} isAdmin={isAdmin} />
              ))}
            </div>
            {filteredPhotos.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                {searchQuery ? 'No photos match your search.' : 'No photos uploaded yet.'}
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video) => (
                <div key={video['File Name']} className="relative group rounded-xl overflow-hidden bg-card border border-border/20">
                  <video
                    controls
                    className="w-full aspect-video object-cover"
                    preload="metadata"
                  >
                    <source src={video.path} />
                    Your browser does not support the video tag.
                  </video>
                  <div className="p-3 border-t border-border/20">
                    <p className="font-semibold text-sm truncate">{video['File Name']}</p>
                    {video['Description'] && (
                      <p className="text-xs text-muted-foreground truncate mt-1">{video['Description']}</p>
                    )}
                    {isAdmin && (
                      <div className="mt-2">
                        <DeleteButton fileName={video['File Name']} type="videos" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filteredVideos.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                {searchQuery ? 'No videos match your search.' : 'No videos uploaded yet.'}
              </div>
            )}
          </TabsContent>

          <TabsContent value="audios" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAudios.map((audio) => (
                <div key={audio['File Name']} className="relative group rounded-xl overflow-hidden bg-card border border-border/20">
                  <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Volume2 className="w-16 h-16 text-muted-foreground" />
                  </div>
                  <div className="p-3 border-t border-border/20">
                    <p className="font-semibold text-sm truncate">{audio['File Name']}</p>
                    {audio['Description'] && (
                      <p className="text-xs text-muted-foreground truncate mt-1">{audio['Description']}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (currentAudio && !currentAudio.paused) {
                            pauseAudio();
                          } else {
                            playAudio(audio.path);
                          }
                        }}
                        className="flex-1"
                      >
                        {currentAudio && !currentAudio.paused ? (
                          <><Pause className="w-4 h-4 mr-2" /> Pause</>
                        ) : (
                          <><Play className="w-4 h-4 mr-2" /> Play</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={toggleMute}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    </div>
                    {isAdmin && (
                      <div className="mt-2">
                        <DeleteButton fileName={audio['File Name']} type="audios" />
                      </div>
                    )}
                  </div>
                  <audio src={audio.path} className="hidden" />
                </div>
              ))}
            </div>
            {filteredAudios.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                {searchQuery ? 'No audio files match your search.' : 'No audio files uploaded yet.'}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <div key={doc['File Name']} className="flex items-center gap-4 p-4 border rounded-xl hover:border-primary/40 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{doc['File Name']}</h3>
                    {doc['Description'] && <p className="text-xs text-muted-foreground">{doc['Description']}</p>}
                  </div>
                  <div className="flex gap-2">
                    <DocumentViewer file={doc}>
                      <Button variant="outline" size="sm">Preview</Button>
                    </DocumentViewer>
                    {isAdmin && <DeleteButton fileName={doc['File Name']} type="documents" />}
                  </div>
                </div>
              ))}
            </div>
            {filteredDocuments.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                {searchQuery ? 'No documents match your search.' : 'No documents uploaded yet.'}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Custom Drawer for PhotoSwipe */}
      {drawerOpen && selectedFile && (
        <>
          {/* Backdrop overlay - click to close */}
          <div
            className="fixed inset-0 bg-black/0"
            style={{ zIndex: 99999998 }}
            onClick={() => setDrawerOpen(false)}
          />
          
          <div
            ref={drawerRef}
            className="fixed left-0 right-0 bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 ease-out"
            style={{
              bottom: 0,
              height: `${drawerHeight}px`,
              zIndex: 99999999,
              transform: isDragging ? 'none' : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Drag Handle */}
          <div
            className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <GripHorizontal className="w-8 h-1.5 text-muted-foreground/50" />
          </div>

          {/* Drawer Header */}
          <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex-shrink-0">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate">Photo Details</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Swipe down to close</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full h-8 w-8 sm:h-9 sm:w-9"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="overflow-y-auto px-3 sm:px-6 py-3 sm:py-4" style={{ height: `calc(100% - 80px)` }}>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:grid sm:grid-cols-[100px_1fr] gap-1 sm:gap-2">
                <p className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-300">File Name</p>
                <p className="break-all text-sm sm:text-base text-gray-900 dark:text-white">{selectedFile['File Name']}</p>
              </div>

              {selectedFile['File Size'] && (
                <div className="flex flex-col sm:grid sm:grid-cols-[100px_1fr] gap-1 sm:gap-2">
                  <p className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-300">File Size</p>
                  <p className="break-all text-sm sm:text-base text-gray-900 dark:text-white">{selectedFile['File Size']}</p>
                </div>
              )}

              {selectedFile['Description'] && (
                <div className="flex flex-col sm:grid sm:grid-cols-[100px_1fr] gap-1 sm:gap-2">
                  <p className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-300 flex-shrink-0">Description</p>
                  <p className="break-words text-sm sm:text-base text-gray-900 dark:text-white overflow-wrap-anywhere whitespace-pre-wrap">{selectedFile['Description']}</p>
                </div>
              )}

              {selectedFile['Capture Date'] && (
                <div className="flex flex-col sm:grid sm:grid-cols-[100px_1fr] gap-1 sm:gap-2">
                  <p className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-300">Capture Date</p>
                  <p className="break-all text-sm sm:text-base text-gray-900 dark:text-white">{selectedFile['Capture Date']}</p>
                </div>
              )}

              {selectedFile['Location'] && (
                <div className="flex flex-col sm:grid sm:grid-cols-[100px_1fr] gap-1 sm:gap-2">
                  <p className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-300">Location</p>
                  <p className="break-words text-sm sm:text-base text-gray-900 dark:text-white">{selectedFile['Location']}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </>
      )}

      {/* Hidden delete button for PhotoSwipe - triggered by toolbar */}
      {isAdmin && currentFileName && (
        <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'all', zIndex: 99999999 }}>
          <DeleteButton fileName={currentFileName} type="images" />
        </div>
      )}

      {/* Custom PhotoSwipe Styles */}
      <style jsx global>{`
        .pswp {
          z-index: 999999 !important;
        }
        
        [role="alertdialog"] {
          z-index: 9999999 !important;
        }
        
        .pswp__custom-caption {
          z-index: 1 !important;
          pointer-events: none;
        }
        
        .pswp__img {
          width: auto !important;
          height: auto !important;
          max-width: 100% !important;
          max-height: calc(100vh - 150px) !important;
          object-fit: contain !important;
          position: static !important;
          transform: none !important;
        }
        
        .pswp__zoom-wrap {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        .pswp__container {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      `}</style>
    </div>
  );
}

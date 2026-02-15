'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';
import { GalleryHeader } from './gallery-header';
import { PhotoCard } from './photocard';
import { DeleteButton } from './delete-button';
import DocumentViewer from './document-viewer';
import { Badge } from './ui/badge';
import { Link as LinkIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { FileMetadata } from '@/lib/files';
import { Info, X, GripHorizontal, Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';

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

  // Small child component to resolve placeholder files (local/.link or signed URLs)
  function VideoTile({ video }: { video: FileMetadata }) {
    const [resolved, setResolved] = useState<string>(video.path);
    useEffect(() => {
      let mounted = true;
      const tryResolve = async () => {
        try {
          // if already an external URL, nothing to do
          if (String(video.path || '').startsWith('http') && !String(video.path || '').includes('/uploads/')) {
            setResolved(video.path);
            return;
          }

          // Probe uploads/signed URLs for placeholder text (HEAD first, then small-text GET).
          const pathStr = String(video.path || '');
          const shouldProbe = pathStr.startsWith('/uploads/') || pathStr.includes('/storage/v1/object') || String(video.storedName || '').toLowerCase().endsWith('.link') || video['File Size'] === 'External';
          if (!shouldProbe) return;

          // Try HEAD to detect small/text content without downloading large binaries.
          try {
            let probeOk = false;
            const head = await fetch(video.path, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
            if (head && head.ok) {
              const ct = (head.headers.get('content-type') || '').toLowerCase();
              const cl = parseInt(head.headers.get('content-length') || '0', 10) || 0;
              if (ct.startsWith('text') || ct.includes('json') || (cl > 0 && cl < 8192)) {
                probeOk = true;
              }
            }

            // Fallback: attempt a short GET with timeout — only for small/likely text placeholders
            if (!probeOk) {
              // if HEAD didn't indicate text/small, still allow a short timeout GET for uploads/signed urls
              const ac = new AbortController();
              const to = setTimeout(() => ac.abort(), 1500);
              const quick = await fetch(video.path, { cache: 'no-store', signal: ac.signal }).catch(() => null);
              clearTimeout(to);
              if (quick && quick.ok) {
                const cth = (quick.headers.get('content-type') || '').toLowerCase();
                const clh = parseInt(quick.headers.get('content-length') || '0', 10) || 0;
                if (cth.startsWith('text') || cth.includes('json') || clh < 8192) probeOk = true;
              }
            }

            if (!probeOk) return;

            // safe to read body (expected small text)
            const bodyText = await fetch(video.path, { cache: 'no-store' }).then(r => r.text()).catch(() => '');
            const body = String(bodyText || '');
            const m = body.match(/external:\s*(\S+)/i) || body.match(/https?:\/\/[^\s"'\)\]]+/i);
            if (m && mounted) {
              const raw = m[1] || m[0];
              const resolvedUrl = String(raw || '').replace(/^['\"]+/, '').replace(/[)\]"'\.,;:]+$/g, '').trim();
              // basic validation: only accept absolute http(s) URLs and reject known error placeholders
              try {
                const parsed = new URL(resolvedUrl);
                if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && !/error_204|jserror/i.test(resolvedUrl)) {
                  setResolved(parsed.toString());
                  console.log('[VideoTile] placeholder probe ->', video['File Name'], '->', parsed.toString());
                  return;
                }
              } catch (e) {
                // invalid URL — ignore and continue probing
              }
            }
          } catch (err) {
            // ignore probe errors and silently continue
          }

          // also try companion JSON URL if available (works for public storage or relative /uploads/ paths)
          try {
            // do NOT attempt companion JSON fetch for signed URLs (they include query tokens)
            if (!String(video.path || '').includes('?') && (String(video.path || '').startsWith('/uploads/') || String(video.path || '').includes('/storage/v1/object/public/'))) {
              const jsonUrl = `${video.path}.json`;
              const jres = await fetch(jsonUrl).catch(() => null);
              if (jres && jres.ok) {
                const j = await jres.json().catch(() => null);
                if (j && typeof j.externalUrl === 'string' && mounted) {
                  setResolved(String(j.externalUrl));
                  console.log('[VideoTile] resolved from companion JSON', video['File Name'], '->', j.externalUrl);
                  return;
                }
              }
            }
          } catch (e) {
            /* ignore */
          }
        } catch (err) {
          // ignore
        }
      };
      tryResolve();
      return () => { mounted = false; };
    }, [video.path, video.storedName, video['File Size']]);

    // debug log for problem filenames
    useEffect(() => {
      if (video['File Name'] === 'Ant' || video['File Name'] === 'Filename2') {
        console.log('[GalleryClient] video item', video['File Name'], { path: video.path, storedName: video.storedName, fileSize: video['File Size'], description: video['Description'], resolved });
      }
    }, [resolved, video]);

    // embed detection (same logic as gallery-client) but uses resolved path
    const src = String(resolved || video.path || '');
    const getEmbed = (urlStr: string) => {
      try {
        const u = new URL(urlStr);
        const host = u.hostname.toLowerCase();
        if (/youtube\.com|youtu\.be/.test(host)) {
          let id = '';
          if (host.includes('youtu.be')) id = u.pathname.slice(1);
          else id = u.searchParams.get('v') || '';
          if (!id) {
            const m = u.pathname.match(/\/embed\/(.+)/) || u.pathname.match(/\/v\/(.+)/);
            if (m) id = m[1] || '';
          }
          return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        if (host.includes('vimeo.com')) {
          const m = u.pathname.match(/\/(?:video\/)?(\d+)/);
          if (m) return `https://player.vimeo.com/video/${m[1]}`;
        }
        if (host.includes('drive.google.com') || host.includes('docs.google.com')) {
          const idFromPath = (u.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || [])[1];
          const idFromQ = u.searchParams.get('id');
          const id = idFromPath || idFromQ || '';
          if (id) return `https://drive.google.com/file/d/${id}/preview`;
        }
      } catch (e) {
        return null;
      }
      return null;
    };

    const embed = getEmbed(src);
    if (embed) {
      return (
        <div className="w-full aspect-video bg-black relative overflow-hidden">
          <iframe title={video['File Name']} src={embed} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      );
    }

    // fallback to native video element if src is a direct media URL
    return (
      <video controls className="w-full aspect-video object-cover" preload="metadata">
        <source src={src} />
        Your browser does not support the video tag.
      </video>
    );
  }
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

  const router = useRouter();

  const handleLogout = () => {
    // clear client-side admin flag and navigate to login
    try { localStorage.removeItem('is_admin'); } catch (e) { /* ignore */ }
    router.replace('/login');
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

  // Ensure images render correctly when loading the page directly.
  // Some browsers / next/image lazy-loading won't trigger until a layout
  // change occurs — dispatching a resize forces intersection observers
  // to recalc so photos appear without manually switching tabs.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeTab !== 'photos') return;
    if (!filteredPhotos || filteredPhotos.length === 0) return;

    const timer = window.setTimeout(() => {
      // trigger layout / IO callbacks
      window.dispatchEvent(new Event('resize'));
    }, 60);

    return () => window.clearTimeout(timer);
  }, [filteredPhotos.length, activeTab]);

  // Audio player functions + per-item playback state, seek and visualizer
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Visualizer refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const stopVisualizer = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch (e) {}
      analyserRef.current = null;
    }
  };

  const startVisualizer = (audioEl: HTMLAudioElement, key: string) => {
    stopVisualizer();
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContextCtor();
      const ctx = audioCtxRef.current;
      const src = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = src;
      analyserRef.current = analyser;

      const canvas = canvasRefs.current[key];
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const ctx2d = canvas.getContext('2d');
      if (!ctx2d) return;

      const render = () => {
        if (!analyserRef.current) return;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        ctx2d.clearRect(0, 0, width, height);

        const barWidth = Math.max(2, Math.floor(width / (bufferLength / 2)));
        let x = 0;
        for (let i = 0; i < bufferLength; i += 2) {
          const v = dataArray[i] / 255;
          const barHeight = v * height;
          ctx2d.fillStyle = 'rgba(99,102,241,0.9)';
          ctx2d.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }

        animationIdRef.current = requestAnimationFrame(render);
      };

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      };
      resize();
      render();

      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (err) {
      console.error('visualizer start error', err);
    }
  };

  const playAudio = (audioPath: string) => {
    // ensure only one audio plays at once
    if (currentAudio) {
      try { currentAudio.pause(); } catch (e) {}
    }

    const audio = new Audio(audioPath);
    audio.crossOrigin = 'anonymous';
    audio.volume = isMuted ? 0 : 1;

    const onLoaded = () => setAudioDuration(audio.duration || 0);
    const onTime = () => setAudioCurrentTime(audio.currentTime || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setPlayingPath(null);
      setAudioCurrentTime(0);
      setAudioDuration(0);
      stopVisualizer();
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);

    audio.play().catch(() => {});

    setCurrentAudio(audio);
    setPlayingPath(audioPath);
    setIsPlaying(true);

    // start visualizer shortly after (canvas ref must exist)
    setTimeout(() => {
      const canvas = canvasRefs.current[audioPath];
      if (canvas) startVisualizer(audio, audioPath);
    }, 120);
  };

  const pauseAudio = () => {
    if (!currentAudio) return;
    try { currentAudio.pause(); } catch (e) {}
    setIsPlaying(false);
    stopVisualizer();
  };

  const togglePlayPause = () => {
    if (!currentAudio) return;
    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
      stopVisualizer();
    } else {
      currentAudio.play().catch(() => {});
      setIsPlaying(true);
      if (playingPath && currentAudio) {
        const canvas = canvasRefs.current[playingPath];
        if (canvas) startVisualizer(currentAudio, playingPath);
      }
    }
  };

  const toggleMute = () => {
    if (!currentAudio) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    currentAudio.volume = newMuted ? 0 : 1;
  };

  const seekAudio = (time: number) => {
    if (!currentAudio) return;
    currentAudio.currentTime = time;
    setAudioCurrentTime(time);
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Download audio (falls back to opening URL if fetch is blocked)
  const downloadAudio = async (url: string, fileName?: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response was not ok');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('download failed, opening in new tab:', err);
      window.open(url, '_blank', 'noopener');
    }
  };

  // cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (currentAudio) {
        try { currentAudio.pause(); } catch (e) {}
      }
      stopVisualizer();
    };
  }, [currentAudio]);

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
                  <VideoTile video={video} />
                  <div className="p-3 border-t border-border/20">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{video['File Name']}</p>
                      {(video['File Size'] === 'External' || String(video.storedName || '').toLowerCase().endsWith('.link') || (String(video.path || '').startsWith('http') && !String(video.path || '').includes('/uploads/')) || (String(video.path || '').includes('/uploads/') && !/\.[a-z0-9]{2,6}$/i.test(String(video['File Name'] || '')))) && (
                        <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-muted/10 border-muted-foreground/10">
                          <LinkIcon className="w-3 h-3 mr-1" />
                          External
                        </Badge>
                      )}
                    </div>
                    {video['Description'] && (
                      <p className="text-xs text-muted-foreground truncate mt-1">{video['Description']}</p>
                    )}
                    {isAdmin && (
                      <div className="mt-2">
                        <DeleteButton fileName={video.storedName ?? video['File Name']} type="videos" />
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
              {filteredAudios.map((audio) => {
                const isActive = playingPath === audio.path;
                return (
                  <div key={audio['File Name']} className="relative group rounded-xl overflow-hidden bg-card border border-border/20">

                    {/* Compact header: filename + actions */}
                    <div className="flex items-center gap-3 px-3 py-2">
                      <canvas
                        ref={(el) => { canvasRefs.current[audio.path] = el; }}
                        className="w-28 h-8 rounded-md bg-muted/10"
                        aria-hidden
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{audio['File Name']}</p>
                          {(audio['File Size'] === 'External' || String(audio.storedName || '').toLowerCase().endsWith('.link') || (String(audio.path || '').startsWith('http') && !String(audio.path || '').includes('/uploads/')) || (String(audio.path || '').includes('/uploads/') && !/\.[a-z0-9]{2,6}$/i.test(String(audio['File Name'] || '')))) && (
                            <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-muted/10 border-muted-foreground/10">
                              <LinkIcon className="w-3 h-3 mr-1" />
                              External
                            </Badge>
                          )}
                        </div>
                        {audio['Description'] && <p className="text-xs text-muted-foreground truncate mt-1">{audio['Description']}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => downloadAudio(audio.path, audio['File Name'])} aria-label="Download">
                          <Download className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <DeleteButton fileName={audio.storedName ?? audio['File Name']} type="audios" />
                        )}
                      </div>
                    </div>

                    <div className="p-3 pt-0 border-t border-border/20">
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => (isActive ? togglePlayPause() : playAudio(audio.path))}
                          className="h-9 w-28"
                        >
                          {isActive && isPlaying ? (<><Pause className="w-4 h-4 mr-2" /> Pause</>) : (<><Play className="w-4 h-4 mr-2" /> Play</>)}
                        </Button>

                        <div className="flex-1">
                          <input
                            aria-label="seek"
                            type="range"
                            min={0}
                            max={isActive ? audioDuration || 0 : 0}
                            step={0.1}
                            value={isActive ? audioCurrentTime : 0}
                            onChange={(e) => isActive && seekAudio(Number(e.target.value))}
                            className="w-full"
                            disabled={!isActive}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <div>{isActive ? formatTime(audioCurrentTime) : '0:00'}</div>
                            <div>{audioDuration ? formatTime(audioDuration) : '0:00'}</div>
                          </div>
                        </div>

                        <Button size="sm" variant="ghost" onClick={toggleMute} className="ml-2">
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{doc['File Name']}</h3>
                      {(doc['File Size'] === 'External' || String(doc.storedName || '').toLowerCase().endsWith('.link') || (String(doc.path || '').startsWith('http') && !String(doc.path || '').includes('/uploads/')) || (String(doc.path || '').includes('/uploads/') && !/\.[a-z0-9]{2,6}$/i.test(String(doc['File Name'] || '')))) && (
                        <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-muted/10 border-muted-foreground/10">
                          <LinkIcon className="w-3 h-3 mr-1" />
                          External
                        </Badge>
                      )}
                    </div>
                    {doc['Description'] && <p className="text-xs text-muted-foreground">{doc['Description']}</p>}
                  </div>
                  <div className="flex gap-2">
                    <DocumentViewer file={doc}>
                      <Button variant="outline" size="sm">Preview</Button>
                    </DocumentViewer>
                    {isAdmin && <DeleteButton fileName={doc.storedName ?? doc['File Name']} type="documents" /> }
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
          <DeleteButton fileName={selectedFile?.storedName ?? currentFileName} type="images" />
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

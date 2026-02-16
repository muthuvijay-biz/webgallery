'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Info, Link as LinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileMetadata } from '@/lib/files';
import { FileDetailsModal } from './file-details-modal';
import { DeleteButton } from './delete-button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';

interface PhotoCardProps {
  photo: FileMetadata;
  index: number;
  isAdmin: boolean;
}

export function PhotoCard({ photo, index, isAdmin }: PhotoCardProps) {
  const [dims, setDims] = useState<{w?: number; h?: number}>({});
  const [loaded, setLoaded] = useState(false);
  const isMobile = useIsMobile();
  const [actionsOpen, setActionsOpen] = useState(false);

  // derive a same-origin proxy URL for stored images or Supabase signed URLs
  const deriveProxySrc = (p: FileMetadata) => {
    const pathStr = String(p.path || '');
    // prefer explicit storedName when present
    if (p.storedName && !String(p.storedName).toLowerCase().endsWith('.link')) {
      return `/api/storage?file=images/${encodeURIComponent(p.storedName)}`;
    }
    // match supabase signed/public URLs and convert to proxy
    const supa = pathStr.match(/https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\/(uploads\/(images|videos|documents)\/[^?\s]+)/i);
    if (supa) {
      const uploaded = supa[1].replace(/^uploads\//i, '');
      if (/^images\//i.test(uploaded)) return `/api/storage?file=${encodeURIComponent(uploaded)}`;
    }
    // generic supabase fallback
    const parts = pathStr.split('/storage/v1/object/');
    if (parts.length === 2) {
      const uploaded = parts[1].split('?')[0];
      const fileParam = uploaded.replace(/^uploads\//i, '');
      if (/^images\//i.test(fileParam)) return `/api/storage?file=${encodeURIComponent(fileParam)}`;
    }
    return null;
  };

  const initialProxy = deriveProxySrc(photo);
  const [imgSrc, setImgSrc] = useState<string>(String(initialProxy ?? photo.path));

  // keep imgSrc in sync if photo changes (e.g. when switching between sources)
  useEffect(() => {
    setImgSrc(String(deriveProxySrc(photo) ?? photo.path));
  }, [photo.path, photo.storedName]);

  // reset `loaded` when the source changes. handle cached-image races and
  // different DOM representations (Next/Image proxy, signed URLs, encoded URLs).
  useEffect(() => {
    setLoaded(false);

    const filename = String(photo.storedName || photo['File Name'] || '');

    const checkCached = () => {
      try {
        const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
        const match = imgs.find(i => {
          if (!i.src) return false;
          const src = i.src;
          // direct match or contains raw path
          if (src.endsWith(photo.path) || src.includes(photo.path)) return true;
          // match by storedName or filename (covers signed/encoded URLs)
          if (filename && (src.includes(filename) || decodeURIComponent(src).includes(filename))) return true;
          // try decoding the src and look for the photo.path
          try { if (decodeURIComponent(src).includes(photo.path)) return true; } catch (e) { /* ignore */ }
          return false;
        });

        if (match && match.complete && (match.naturalWidth || 0) > 0) {
          setDims({ w: match.naturalWidth, h: match.naturalHeight });
          setLoaded(true);
          return true;
        }

        // attach listeners to detect eventual load/error
        if (match && !match.complete) {
          const onLoad = () => {
            setDims({ w: match.naturalWidth, h: match.naturalHeight });
            setLoaded(true);
            cleanup();
          };
          const onError = () => {
            // don't leave skeleton forever on error — show fallback UI
            setLoaded(true);
            cleanup();
          };
          const cleanup = () => {
            match.removeEventListener('load', onLoad);
            match.removeEventListener('error', onError);
          };
          match.addEventListener('load', onLoad);
          match.addEventListener('error', onError);
        }
      } catch (e) {
        // ignore DOM access/errors
      }
      return false;
    };

    // try several retries to cover timing races
    if (!checkCached()) {
      const timers = [
        window.setTimeout(checkCached, 120),
        window.setTimeout(checkCached, 400),
        window.setTimeout(checkCached, 1200),
      ];
      return () => timers.forEach(t => window.clearTimeout(t));
    }
    return () => {};
  }, [photo.path, photo.storedName, photo['File Name']]);

  return (
    <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
      <Card 
        className="overflow-hidden group border border-border/20 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer bg-card hover:border-primary/40"
        onContextMenu={(e) => {
          if (!isMobile) return;
          e.preventDefault();
          setActionsOpen(true);
        }}
      >
        <CardContent className="p-0 relative aspect-square bg-muted/30">
          {/* skeleton/shimmer until the image loads */}
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Skeleton className="w-full h-full rounded-none shimmer" />
            </div>
          )}

          {/* Background preview image */}
          {String(photo.path).startsWith('/') ? (
            <Image
              src={photo.path}
              alt={photo['File Name']}
              fill
              onLoadingComplete={(img) => {
                setDims({ w: img.naturalWidth, h: img.naturalHeight });
                setLoaded(true);
              }}
              onError={() => {
                // remove skeleton if the image can't be decoded/rendered
                setLoaded(true);
              }}
              className={`object-cover group-hover:scale-105 transition-transform duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              loading="lazy"
              quality={85}
            />
          ) : (
            // External / signed URLs: use same-origin proxy when possible to avoid browser blocking
            <img
              src={imgSrc}
              alt={photo['File Name']}
              onLoad={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                setDims({ w: t.naturalWidth, h: t.naturalHeight });
                setLoaded(true);
              }}
              onError={(e) => {
                // if original signed URL was blocked, retry using proxy once
                if (!String(imgSrc).startsWith('/api/storage')) {
                  const proxy = deriveProxySrc(photo);
                  if (proxy) {
                    // eslint-disable-next-line no-console
                    console.debug('[PhotoCard] image load failed — retrying via proxy ->', proxy);
                    setImgSrc(proxy);
                    return;
                  }
                }
                setLoaded(true);
              }}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
            />
          )}

          {/* Clickable overlay — opens modal viewer */}
          <a
            href={photo.path}
            data-caption={`${photo['File Name']}|||${photo['Description'] || ''}`}
            data-index={index}
            className="absolute inset-0 z-10"
            aria-label={`View ${photo['File Name']}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation(); // prevent parent handlers
              // dispatch event for GalleryClient to open react-image-gallery
              try {
                const ev = new CustomEvent('open-image-gallery', { detail: { index } });
                window.dispatchEvent(ev);
              } catch (err) {
                /* ignore */
              }
            }}
          >
          </a>
          <div 
            className="absolute top-2 right-2 flex items-center gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none md:pointer-events-auto z-20" 
            onClick={(e) => e.stopPropagation()}
          >
            <PopoverTrigger asChild>
              <FileDetailsModal file={photo}>
                <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg backdrop-blur-sm bg-background/90">
                  <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </FileDetailsModal>
            </PopoverTrigger>

            {isAdmin && <DeleteButton fileName={photo.storedName ?? photo['File Name']} type="images" />}
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            <div className="flex items-center gap-2">
              <p className="text-white text-xs sm:text-sm font-semibold truncate">{photo['File Name']}</p>
              {(photo['File Size'] === 'External' || String(photo.storedName || '').toLowerCase().endsWith('.link') || (String(photo.path || '').startsWith('http') && !String(photo.path || '').includes('/uploads/')) || (String(photo.path || '').includes('/uploads/') && !/\.[a-z0-9]{2,6}$/i.test(String(photo['File Name'] || '')))) && (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-white/8 border-muted-foreground/10">
                  <LinkIcon className="w-3 h-3 mr-1" />
                  External
                </Badge>
              )}
            </div>
            {photo['Description'] && (
              <p className="text-white/80 text-xs truncate mt-1">{photo['Description']}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <PopoverContent className="w-64 p-2" side="top" align="end">
        <div className="flex flex-col gap-1">
          <FileDetailsModal file={photo}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Info className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </FileDetailsModal>
          {isAdmin && (
            <DeleteButton fileName={photo.storedName ?? photo['File Name']} type="images" />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

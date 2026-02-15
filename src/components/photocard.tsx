'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileMetadata } from '@/lib/files';
import { FileDetailsModal } from './file-details-modal';
import { DeleteButton } from './delete-button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface PhotoCardProps {
  photo: FileMetadata;
  index: number;
  isAdmin: boolean;
  onView: (index: number) => void;
}

export function PhotoCard({ photo, index, isAdmin, onView }: PhotoCardProps) {
  const [dims, setDims] = useState<{w?: number; h?: number}>({});
  const isMobile = useIsMobile();
  const lastTapRef = useRef<number | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartPointRef = useRef<{x: number; y: number} | null>(null);

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, []);

  return (
    <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
      <PopoverTrigger asChild>
        <Card 
          className="overflow-hidden group border-2 border-border/40 hover:border-primary/40 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
          onClick={(e) => {
            // if click originated on an anchor and we're on desktop, do nothing (PhotoSwipe will handle it)
            const anchor = (e.target as HTMLElement).closest('a');
            if (anchor && !isMobile) return;

            // ignore click immediately after a long-press/menu open
            const now = Date.now();
            if (lastTapRef.current && now - lastTapRef.current < 700) {
              lastTapRef.current = now;
              return;
            }

            console.debug('[photocard] click', index, { isMobile });
            onView(index);
          }}
          onTouchStart={(e) => {
            if (!isMobile) return;
            const t = e.touches[0];
            touchStartPointRef.current = { x: t.clientX, y: t.clientY };
            longPressTriggeredRef.current = false;
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = window.setTimeout(() => {
              longPressTriggeredRef.current = true;
              setActionsOpen(true);
              lastTapRef.current = Date.now();
              console.debug('[photocard] longpress -> open actions', index);
            }, 520);
          }}
          onTouchMove={(e) => {
            if (!isMobile || !touchStartPointRef.current) return;
            const t = e.touches[0];
            const dx = t.clientX - touchStartPointRef.current.x;
            const dy = t.clientY - touchStartPointRef.current.y;
            if (Math.hypot(dx, dy) > 10) {
              if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
              }
            }
          }}
          onTouchEnd={(e) => {
            if (!isMobile) return;
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
            // if long-press already triggered, swallow this end to avoid opening viewer
            if (longPressTriggeredRef.current) {
              longPressTriggeredRef.current = false;
              e.stopPropagation();
              lastTapRef.current = Date.now();
              return;
            }

            const now = Date.now();
            if (lastTapRef.current && now - lastTapRef.current < 500) return; // debounce double events
            lastTapRef.current = now;
            e.stopPropagation();
            console.debug('[photocard] touchend -> onView', index);
            onView(index);
          }}
          onContextMenu={(e) => {
            // fallback for emulators / devices that fire contextmenu on long-press
            if (!isMobile) return;
            e.preventDefault();
            setActionsOpen(true);
            lastTapRef.current = Date.now();
            console.debug('[photocard] contextmenu -> open actions', index);
          }}
        >
      <CardContent className="p-0 relative aspect-square bg-muted/30">
        {/* Anchor for PhotoSwipe: on mobile intercept the click and open the app drawer; on desktop let PhotoSwipe's listener handle it */}
        <a
          href={photo.path}
          data-src={photo.path}
          data-sub-html={photo['Description'] || photo['File Name']}
          data-lg-size={`${dims.w || 800}-${dims.h || 600}`}
          data-pswp-width={dims.w || undefined}
          data-pswp-height={dims.h || undefined}
          onClick={(e) => {
            // always prevent the native anchor navigation and bubble the event to the gallery handler
            e.preventDefault();
            e.stopPropagation();
            onView(index);
          }}
        >
          <Image
            src={photo.path}
            alt={photo['File Name']}
            fill
            onLoadingComplete={(img) => setDims({ w: img.naturalWidth, h: img.naturalHeight })}
            className="object-contain group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
          />
        </a>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none md:pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <FileDetailsModal file={photo}>
            <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg backdrop-blur-sm bg-background/90">
              <Info className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </FileDetailsModal>
          {isAdmin && (
            <DeleteButton fileName={photo['File Name']} type="images" />
          )}
        </div>

        {/* Long-press / hold actions for mobile (Info + Delete) */}
        <PopoverContent side="top" align="center" className="md:hidden !w-48 p-2">
          <div className="flex gap-2 justify-center">
            <FileDetailsModal file={photo}>
              <Button size="sm" className="w-full">Info</Button>
            </FileDetailsModal>
            {isAdmin && (
              <DeleteButton fileName={photo['File Name']} type="images" />
            )}
          </div>
        </PopoverContent>

        {/* File Name & Description Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 translate-y-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-300 space-y-0.5 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none">
          <p className="text-xs sm:text-sm font-semibold text-white truncate drop-shadow-lg">
            {photo['File Name']}
          </p>
          {photo['Description'] && (
            <p className="text-xs text-white/80 truncate drop-shadow-lg">{photo['Description']}</p>
          )}
        </div>

        {/* Index badge (count) */}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-[11px] font-semibold rounded-full px-2 py-1 shadow-md">
          {index + 1}
        </div>
      </CardContent>
    </Card>
    </PopoverTrigger>

    <PopoverContent side="top" align="center" className="md:hidden !w-48 p-2">
      <div className="flex gap-2 justify-center">
        <FileDetailsModal file={photo}>
          <Button size="sm" className="w-full">Info</Button>
        </FileDetailsModal>
        {isAdmin && (
          <DeleteButton fileName={photo['File Name']} type="images" />
        )}
      </div>
    </PopoverContent>
  </Popover>
  );
}

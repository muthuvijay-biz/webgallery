'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Info } from 'lucide-react';
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

  // reset loaded when source changes
  useEffect(() => setLoaded(false), [photo.path]);

  return (
    <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
      <PopoverTrigger asChild>
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
            <Image
              src={photo.path}
              alt={photo['File Name']}
              fill
              onLoadingComplete={(img) => { 
                setDims({ w: img.naturalWidth, h: img.naturalHeight }); 
                setLoaded(true); 
              }}
              className={`object-cover group-hover:scale-105 transition-transform duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              loading="lazy"
              quality={85}
            />

            {/* PhotoSwipe clickable overlay */}
            <a
              href={photo.path}
              data-caption={`${photo['File Name']}|||${photo['Description'] || ''}`}
              className="absolute inset-0 z-10"
              aria-label={`View ${photo['File Name']}`}
            >
            </a>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <div 
              className="absolute top-2 right-2 flex items-center gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none md:pointer-events-auto z-20" 
              onClick={(e) => e.stopPropagation()}
            >
              <FileDetailsModal file={photo}>
                <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg backdrop-blur-sm bg-background/90">
                  <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </FileDetailsModal>
              {isAdmin && <DeleteButton fileName={photo['File Name']} type="images" />}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
              <p className="text-white text-xs sm:text-sm font-semibold truncate">{photo['File Name']}</p>
              {photo['Description'] && (
                <p className="text-white/80 text-xs truncate mt-1">{photo['Description']}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-2" side="top" align="end">
        <div className="flex flex-col gap-1">
          <FileDetailsModal file={photo}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Info className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </FileDetailsModal>
          {isAdmin && (
            <DeleteButton fileName={photo['File Name']} type="images" />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

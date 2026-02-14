'use client';

import Image from 'next/image';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileMetadata } from '@/lib/files';
import { FileDetailsModal } from './file-details-modal';
import { DeleteButton } from './delete-button';

interface PhotoCardProps {
  photo: FileMetadata;
  index: number;
  isAdmin: boolean;
  onView: (index: number) => void;
}

export function PhotoCard({ photo, index, isAdmin, onView }: PhotoCardProps) {
  return (
    <Card 
      className="overflow-hidden group border-2 border-border/40 hover:border-primary/40 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
      onClick={() => onView(index)}
    >
      <CardContent className="p-0 relative aspect-square bg-muted/30">
        <Image
          src={photo.path}
          alt={photo['File Name']}
          fill
          className="object-contain group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={(e) => e.stopPropagation()}>
          <FileDetailsModal file={photo}>
            <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg backdrop-blur-sm bg-background/90">
              <Info className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </FileDetailsModal>
          {isAdmin && (
            <DeleteButton fileName={photo['File Name']} type="images" />
          )}
        </div>

        {/* File Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-xs sm:text-sm font-semibold text-white truncate drop-shadow-lg">
            {photo['File Name']}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

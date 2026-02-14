'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileMetadata } from '@/lib/files';
import { cn } from '@/lib/utils';

interface SlideshowProps {
  photos: FileMetadata[];
  currentIndex: number;
  zoom: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleFullscreen: () => void;
  onIndexChange: (index: number) => void;
}

export function Slideshow({
  photos,
  currentIndex,
  zoom,
  onClose,
  onNext,
  onPrev,
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
  onIndexChange,
}: SlideshowProps) {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 75) {
      onNext();
    }
    if (touchEndX.current - touchStartX.current > 75) {
      onPrev();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slideshow Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-3 sm:p-4 md:p-6 z-10 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-3">
          <div className="text-white flex-1 min-w-0 mr-2 sm:mr-4">
            <p className="text-sm sm:text-base md:text-lg font-bold truncate">{photos[currentIndex]['File Name']}</p>
            <p className="text-xs sm:text-sm md:text-base text-white/70 font-medium">
              {currentIndex + 1} of {photos.length}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomOut}
              disabled={zoom <= 1}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 rounded-full"
            >
              <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onZoomIn}
              disabled={zoom >= 3}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 rounded-full"
            >
              <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 rounded-full hidden sm:flex"
            >
              <Maximize className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 rounded-full"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-8 relative overflow-hidden">
        <div 
          className="relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <Image
            src={photos[currentIndex].path}
            alt={photos[currentIndex]['File Name']}
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
          onClick={onPrev}
          className="absolute left-2 sm:left-4 md:left-6 text-white bg-black/60 hover:bg-black/80 backdrop-blur-sm h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full shadow-xl"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          className="absolute right-2 sm:right-4 md:right-6 text-white bg-black/60 hover:bg-black/80 backdrop-blur-sm h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full shadow-xl"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
        </Button>
      </div>

      {/* Thumbnail Strip */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 sm:p-3 md:p-6 backdrop-blur-sm">
        <div className="flex gap-1.5 sm:gap-2 md:gap-3 overflow-x-auto max-w-7xl mx-auto pb-2 scrollbar-hide">
          {photos.map((photo, index) => (
            <button
              key={photo['File Name']}
              onClick={() => onIndexChange(index)}
              className={cn(
                "relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden border-2 sm:border-3 transition-all duration-300",
                index === currentIndex 
                  ? "border-white scale-105 sm:scale-110 shadow-2xl shadow-white/50 ring-2 ring-white" 
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
      <div className="absolute bottom-20 sm:bottom-24 md:bottom-32 left-1/2 -translate-x-1/2">
        <div className="flex gap-1 sm:gap-1.5">
          {photos.map((_, index) => (
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
      </div>
    </div>
  );
}

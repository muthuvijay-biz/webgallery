'use client';

import { LogOut, Search, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartUploadDialog } from './SmartUploadDialog';

interface GalleryHeaderProps {
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onLogout: () => void;
}

export function GalleryHeader({ isAdmin, searchQuery, onSearchChange, onLogout }: GalleryHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/80 border-b border-border/40 shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                Gallery
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Your media collection</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <SmartUploadDialog />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onLogout}
                  className="rounded-full h-9 w-9 sm:h-10 sm:w-10"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-3 sm:mt-4">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 sm:pl-12 pr-4 h-10 sm:h-12 rounded-xl sm:rounded-2xl border-2 bg-muted/30 backdrop-blur-sm text-sm sm:text-base"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
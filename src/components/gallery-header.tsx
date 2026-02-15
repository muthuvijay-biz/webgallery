'use client';

import { LogOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartUploadDialog } from './smartuploaddialog';

interface GalleryHeaderProps {
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onLogout: () => void;
}

export function GalleryHeader({ isAdmin, searchQuery, onSearchChange, onLogout }: GalleryHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/30">
      {/* thin decorative purple band */}
      <div className="header-gradient h-1.5 w-full" />

      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="brand-logo w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-sm flex items-center justify-center bg-gradient-to-br from-primary to-accent text-white font-bold text-lg sm:text-xl">
              G
            </div>

            <div className="hidden sm:block">
              <div>
                <h1 className="text-base sm:text-lg font-semibold">eDocket</h1>
                <p className="text-xs text-muted-foreground">Truth Triumphs</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search files, tags, descriptions..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 pr-3 h-9 sm:h-10 rounded-xl border-2 bg-muted/10 text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="sm:hidden">
              <Button variant="ghost" size="icon" aria-label="Search">
                <Search className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            {isAdmin && (
              <>
                <SmartUploadDialog />
                <Button variant="ghost" size="icon" onClick={onLogout} className="rounded-full h-9 w-9 sm:h-10 sm:w-10">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

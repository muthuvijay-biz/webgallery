'use client';

export default function SiteFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 py-1.5 sm:py-3 border-t border-border/20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-2 sm:px-4 flex flex-row items-center justify-center gap-1 sm:gap-2 text-[10px] sm:text-sm whitespace-nowrap overflow-hidden">
        <div className="font-semibold">WebGallery</div>
        <div className="text-muted-foreground">•</div>
        <div className="text-muted-foreground truncate">© {new Date().getFullYear()} Apxilon Technologies</div>
      </div>
    </footer>
  );
}

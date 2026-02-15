'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { FileMetadata } from '@/lib/files';

type DocumentViewerProps = {
  file: FileMetadata;
  children: React.ReactNode; // trigger
};

export function DocumentViewer({ file, children }: DocumentViewerProps) {
  const name = file['File Name'] || 'Document';
  const lower = name.toLowerCase();
  const isPdf = lower.endsWith('.pdf');

  // prefer direct embed for PDFs; for other office formats use Google Docs viewer
  const viewerUrl = isPdf
    ? file.path
    : `https://docs.google.com/gview?url=${encodeURIComponent(file.path)}&embedded=true`;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between w-full gap-4">
            <div>
              <DialogTitle className="text-base sm:text-lg">{name}</DialogTitle>
              <div className="text-xs text-muted-foreground mt-1">Preview — {isPdf ? 'PDF' : 'Office / Document (Google Docs viewer)'}</div>
            </div>
            <div className="flex items-center gap-2">
              <a href={file.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Open externally</span>
              </a>
              <Button variant="ghost" size="sm" onClick={() => { /* dialog will close via DialogContext */ }}>
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="h-[calc(90vh-72px)] bg-black/5">
          <iframe
            title={`preview-${name}`}
            src={viewerUrl}
            className="w-full h-full bg-white"
            frameBorder={0}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentViewer;

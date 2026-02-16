'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { FileMetadata } from '@/lib/files';
import dynamic from 'next/dynamic';

// Load PDF renderer only on the client to avoid bundling `pdfjs-dist` (and optional native `canvas`) in server builds.
const PdfViewer = dynamic(() => import('./pdf-viewer'), { ssr: false });

type DocumentViewerProps = {
  file: FileMetadata;
  children: React.ReactNode; // trigger
};

export function DocumentViewer({ file, children }: DocumentViewerProps) {
  const name = file['File Name'] || 'Document';
  const lower = name.toLowerCase();
  const isPdf = lower.endsWith('.pdf');
  const pathStr = String(file.path || '');
  const isExternal = /^https?:\/\//i.test(pathStr) && !pathStr.includes('/uploads/');

  // Distinguish between (A) an actual stored file in our uploads/bucket and
  // (B) a stored *placeholder* (.link) whose content points to an external URL.
  const hasStoredFile = Boolean(file.storedName);
  const storedFileIsPlaceholder = hasStoredFile && String(file.storedName).toLowerCase().endsWith('.link');

  // Always proxy real stored files (including when `file.path` is a signed URL from Supabase).
  // Do NOT proxy `.link` placeholder files — those contain external URLs.
  const proxySrc = (hasStoredFile && !storedFileIsPlaceholder)
    ? `/api/storage?file=${encodeURIComponent(`${file.type}s/${file.storedName}`)}`
    : null;

  // Use Google viewer for office formats; embed PDFs directly when same-origin (proxy or /uploads/).
  const ext = (name.split('.').pop() || '').toLowerCase();
  const isOffice = ['doc','docx','ppt','pptx','xls','xlsx','odt','odp'].includes(ext);

  let embedSrc: string;
  if (isPdf) {
    if (proxySrc) embedSrc = proxySrc; // prefer proxy for stored PDFs (same-origin)
    else if (!isExternal && pathStr) embedSrc = pathStr; // local PDF path
    else embedSrc = `https://docs.google.com/gview?url=${encodeURIComponent(pathStr)}&embedded=true`; // external PDF
  } else if (isOffice) {
    const target = proxySrc ?? pathStr; // prefer proxied stored file, otherwise external URL
    embedSrc = `https://docs.google.com/gview?url=${encodeURIComponent(target)}&embedded=true`;
  } else {
    embedSrc = proxySrc ?? pathStr ?? `https://docs.google.com/gview?url=${encodeURIComponent(pathStr)}&embedded=true`;
  }

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
          {isExternal && (
            <div className="px-4 py-2 text-sm text-yellow-800 bg-yellow-50 border-b">
              Preview may be blocked by the remote host — use "Open externally" if it doesn't load.
            </div>
          )}

          {/* Render PDFs client-side (pdf.js) when we can proxy the stored file; otherwise fall back to iframe/Google viewer */}
          {isPdf && proxySrc ? (
            // PDF stored in our storage — render with pdf.js for reliable in-app preview
            <div className="w-full h-full bg-white">
              <div className="h-full">
                {/* dynamic PDF renderer */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <PdfViewer src={proxySrc} />
              </div>
            </div>
          ) : (
            <iframe
              title={`preview-${name}`}
              src={embedSrc}
              className="w-full h-full bg-white"
              frameBorder={0}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentViewer;

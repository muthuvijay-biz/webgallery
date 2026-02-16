'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { FileMetadata } from '@/lib/files';
// PDF rendering: prefer same-origin iframe for stored PDFs (reliable native viewer).
// Keep `pdf-viewer` component available as a fallback but don't import it by default.

type DocumentViewerProps = {
  file: FileMetadata;
  children: React.ReactNode; // trigger
};

export function DocumentViewer({ file, children }: DocumentViewerProps) {
  const name = file['File Name'] || 'Document';
  // debug: log file info when viewer mounts/opened (helps diagnose missing storedName / proxy issues)
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.debug('[DocumentViewer] file:', { name: file['File Name'], storedName: file.storedName, path: file.path, type: file.type });
  }
  const lower = name.toLowerCase();
  const isPdf = lower.endsWith('.pdf');
  const pathStr = String(file.path || '');
  const isExternal = /^https?:\/\//i.test(pathStr) && !pathStr.includes('/uploads/');

  // Distinguish between (A) an actual stored file in our uploads/bucket and
  // (B) a stored *placeholder* (.link) whose content points to an external URL.
  const hasStoredFile = Boolean(file.storedName);
  const storedFileIsPlaceholder = hasStoredFile && String(file.storedName).toLowerCase().endsWith('.link');

  // Determine a same-origin proxy URL when possible.
  // 1) If we have an actual stored filename, proxy that (safe).
  // 2) If the provided `file.path` is a Supabase signed URL, extract the object path and proxy that too.
  let proxySrc: string | null = null;
  if (hasStoredFile && !storedFileIsPlaceholder) {
    proxySrc = `/api/storage?file=${encodeURIComponent(`${file.type}s/${file.storedName}`)}`;
  } else {
    // match both signed and public Supabase storage URLs
    const supaMatch = pathStr.match(/https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\/(uploads\/(images|videos|documents)\/[^?\s]+)/i);
    if (supaMatch) {
      const uploadedPath = supaMatch[1]; // e.g. 'uploads/documents/file.pdf'
      const fileParam = uploadedPath.replace(/^uploads\//i, ''); // 'documents/file.pdf'
      proxySrc = `/api/storage?file=${encodeURIComponent(fileParam)}`;
      // eslint-disable-next-line no-console
      console.debug('[DocumentViewer] derived proxy from Supabase URL ->', proxySrc);
    } else if (/\.supabase\.co\/.+\/storage\/v1\/object\//i.test(pathStr)) {
      // generic fallback for other Supabase URL variants
      const parts = pathStr.split('/storage/v1/object/');
      if (parts.length === 2) {
        const uploaded = parts[1].split('?')[0];
        const fileParam = uploaded.replace(/^uploads\//i, '');
        if (/^(images|videos|documents)\//i.test(fileParam)) {
          proxySrc = `/api/storage?file=${encodeURIComponent(fileParam)}`;
          // eslint-disable-next-line no-console
          console.debug('[DocumentViewer] derived proxy from Supabase (fallback) ->', proxySrc);
        }
      }
    }
  }

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

  // eslint-disable-next-line no-console
  console.debug('[DocumentViewer] embedSrc chosen ->', { embedSrc, proxySrc, isExternal });

  // client-side blob URL for same-origin PDF rendering when proxySrc is available
  const [pdfBlobUrl, setPdfBlobUrl] = React.useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    // cleanup previous blob URL
    if (!proxySrc) {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      return;
    }

    async function fetchAsBlob() {
      setPdfError(null);
      setPdfLoading(true);
      try {
        const res = await fetch(proxySrc, { cache: 'no-store' });
        if (!res.ok) throw new Error(`proxy fetch failed (${res.status})`);
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        // revoke previous if present
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(url);
        // eslint-disable-next-line no-console
        console.debug('[DocumentViewer] pdfBlobUrl created ->', url);
      } catch (err: any) {
        console.error('[DocumentViewer] blob proxy fetch error:', err);
        setPdfError(err?.message || 'Failed to fetch PDF for in-app preview');
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    }

    fetchAsBlob();
    return () => {
      cancelled = true;
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    };
  }, [proxySrc]);

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

          {/* Render PDF via blob URL fetched from our proxy (prevents X-Frame-Options issues). */}
          {isPdf && proxySrc ? (
            pdfLoading ? (
              <div className="h-full flex items-center justify-center">Loading PDF…</div>
            ) : pdfError ? (
              <div className="p-4 text-sm text-red-700 bg-red-50">
                Failed to load PDF preview — <a className="underline" href={file.path} target="_blank" rel="noreferrer">open externally</a>
                <div className="mt-2 text-xs text-muted-foreground">{pdfError}</div>
              </div>
            ) : (
              // same-origin PDF (proxy or blob) — do not sandbox so the browser's native PDF viewer can run
              <iframe
                title={`preview-${name}`}
                src={pdfBlobUrl ?? proxySrc ?? embedSrc}
                className="w-full h-full bg-white"
                frameBorder={0}
                allow="fullscreen"
              />
            )
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

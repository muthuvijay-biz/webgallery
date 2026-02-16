'use client';

import React, { useEffect, useRef, useState } from 'react';

type PdfViewerProps = {
  src: string; // same-origin URL (we expect /api/storage?... or /uploads/...)
  initialPage?: number;
};

export default function PdfViewer({ src, initialPage = 1 }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<any>(null);
  const [page, setPage] = useState(initialPage);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackIframe, setFallbackIframe] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      try {
        // dynamic import so the package is only required at runtime
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
        // ensure worker is available from CDN (fallback)
        // use the version bundled with the installed package if available
        try {
          // @ts-ignore - runtime property
          const v = pdfjs.version || '2.16.105';
          // prefer unpkg CDN for the worker
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${v}/build/pdf.worker.min.js`;
        } catch (err) {
          // ignore and let pdfjs try a default
        }

        // fetch PDF bytes (same-origin / proxy ensures CORS ok)
        const res = await fetch(src, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
        const data = await res.arrayBuffer();
        console.debug('[PdfViewer] fetched PDF bytes:', data.byteLength);

        // disableWorker: render on the main thread to avoid worker/CSP/OffscreenCanvas issues
        const loadingTask = pdfjs.getDocument({ data, disableWorker: true });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        console.debug('[PdfViewer] pdf loaded, pages=', pdf.numPages);
        setNumPages(pdf.numPages);
        setPage(Math.min(initialPage, pdf.numPages));
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || String(err));
        setLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
      // cleanup PDF document
      if (pdfRef.current && pdfRef.current.destroy) pdfRef.current.destroy();
      pdfRef.current = null;
    };
  }, [src, initialPage]);

  // render the current page to canvas
  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      const canvas = canvasRef.current;
      const pdf = pdfRef.current;
      if (!canvas || !pdf) return;
      try {
        const pageObj = await pdf.getPage(page);
        if (cancelled) return;

        // account for devicePixelRatio for crisp rendering on high-DPI displays
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        const viewport = pageObj.getViewport({ scale: scale * dpr });

        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context not available');

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        // make canvas visually scale to CSS pixels
        canvas.style.width = Math.floor(viewport.width / dpr) + 'px';
        canvas.style.height = Math.floor(viewport.height / dpr) + 'px';

        console.debug('[PdfViewer] rendering page', page, 'scale', scale, 'dpr', dpr);
        const renderTask = pageObj.render({ canvasContext: context, viewport });
        await renderTask.promise;

        // quick sanity-check: ensure canvas has non-empty pixel content
        try {
          const img = context.getImageData(0, 0, 1, 1).data;
          const allEmpty = img[0] === 0 && img[1] === 0 && img[2] === 0 && img[3] === 0;
          console.debug('[PdfViewer] pixel sample:', img, 'allEmpty=', allEmpty);
          if (allEmpty) {
            // try one more render at a slightly higher scale
            const retryViewport = pageObj.getViewport({ scale: (scale + 0.25) * dpr });
            canvas.width = Math.floor(retryViewport.width);
            canvas.height = Math.floor(retryViewport.height);
            canvas.style.width = Math.floor(retryViewport.width / dpr) + 'px';
            canvas.style.height = Math.floor(retryViewport.height / dpr) + 'px';
            await (await pageObj.render({ canvasContext: context, viewport: retryViewport })).promise;

            // re-sample after retry
            const img2 = context.getImageData(0, 0, 1, 1).data;
            const allEmpty2 = img2[0] === 0 && img2[1] === 0 && img2[2] === 0 && img2[3] === 0;
            console.debug('[PdfViewer] pixel sample after retry:', img2, 'allEmpty=', allEmpty2);
            if (allEmpty2) {
              console.warn('[PdfViewer] canvas appears blank after retry — falling back to iframe');
              setError('Blank render — falling back to native viewer');
              setFallbackIframe(true);
            }
          }
        } catch (e) {
          // ignore pixel-sampling errors
        }
      } catch (err: any) {
        console.error('PDF render error:', err);
        setError(err?.message || 'Render error');
      }
    }
    renderPage();
    return () => { cancelled = true; };
  }, [page, scale]);

  if (loading) return <div className="h-[60vh] flex items-center justify-center">Loading PDF…</div>;

  // If pdf.js failed or produced a blank canvas we fall back to a same-origin iframe
  if (error && fallbackIframe) {
    return (
      <div className="h-[60vh] w-full bg-white">
        <div className="p-3 border-b text-sm text-muted-foreground">PDF renderer failed — using browser viewer as fallback</div>
        <iframe src={src} className="w-full h-[calc(60vh-48px)]" title="pdf-fallback" frameBorder={0} />
      </div>
    );
  }

  if (error) return (
    <div className="p-4 text-sm text-red-700 bg-red-50">
      Failed to load PDF preview — <a className="underline" href={src} target="_blank" rel="noreferrer">open externally</a>
      <div className="mt-2 text-xs text-muted-foreground">{error}</div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} title="Previous page">◀</button>
          <div className="text-sm">
            Page <strong>{page}</strong> of <strong>{numPages}</strong>
          </div>
          <button className="btn" onClick={() => setPage(p => Math.min((numPages || 1), p + 1))} disabled={numPages !== null && page >= numPages} title="Next page">▶</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Zoom</div>
          <button className="btn" onClick={() => setScale(s => Math.max(0.25, +(s - 0.25).toFixed(2)))} title="Zoom out">-</button>
          <div className="px-2 text-sm">{Math.round(scale * 100)}%</div>
          <button className="btn" onClick={() => setScale(s => +(s + 0.25).toFixed(2))} title="Zoom in">+</button>
          <a href={src} target="_blank" rel="noreferrer" className="ml-4 text-sm text-muted-foreground underline">Open externally</a>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white p-4 flex items-start justify-center">
        <canvas ref={canvasRef} className="shadow rounded" />
      </div>
    </div>
  );
}

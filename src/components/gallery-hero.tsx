'use client';

import { ShieldCheck, Zap, Settings, AlertTriangle } from 'lucide-react';
import { SmartUploadDialog } from './smartuploaddialog';

export default function GalleryHero() {
  const particles = [
    { top: -8, left: 12, size: 12, delay: 0 },
    { top: 18, left: 86, size: 8, delay: 200 },
    { top: -6, left: 68, size: 10, delay: 800 },
    { top: 40, left: 40, size: 6, delay: 1200 },
    { top: 8, left: 48, size: 10, delay: 400 },
  ];

  return (
    <section className="container mx-auto px-3 sm:px-4 py-6">
      <div className="relative overflow-visible hero-card p-6 sm:p-8 rounded-2xl bg-card/60 border border-border/40 shadow-lg">
        {/* subtle purple gradient bar (top) */}
        <div className="absolute -top-6 left-4 right-4 h-24 rounded-2xl header-gradient blur-3xl opacity-10 pointer-events-none" />

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          <div className="sm:col-span-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-foreground">WebGallery — beautiful, fast, secure</h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl">A mobile‑first gallery with photographers in mind — instant previews, secure uploads, and buttery smooth micro‑interactions.</p>

            <div className="mt-5 flex flex-wrap gap-3 items-center">
              <SmartUploadDialog />

              <a href="#pswp-gallery" className="btn-gradient-shine inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold shadow-md hover:scale-[1.02] transition-transform">
                Explore gallery
              </a>

              <div className="ml-1 px-3 py-2 rounded-full border border-border/30 text-sm text-muted-foreground bg-background/60">Docs</div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/30">
                <div className="w-10 h-10 rounded-lg bg-[#667eea]/10 flex items-center justify-center text-[#667eea]">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Quick setup</div>
                  <div className="text-xs text-muted-foreground">Start uploading within seconds</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/30">
                <div className="w-10 h-10 rounded-lg bg-[#764ba2]/10 flex items-center justify-center text-[#764ba2]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Secure storage</div>
                  <div className="text-xs text-muted-foreground">Private buckets & signed URLs</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/30">
                <div className="w-10 h-10 rounded-lg bg-yellow-200/30 flex items-center justify-center text-yellow-600">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Lightning fast</div>
                  <div className="text-xs text-muted-foreground">Optimized previews & caching</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/10 border border-border/20 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs">Files are private by default — enable sharing when needed.</span>
              </div>
            </div>
          </div>

          <div className="sm:col-span-4 relative flex items-center justify-center">
            <div className="floating-shield p-4 rounded-3xl bg-white/95 shadow-2xl border border-border/10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white shadow-inner">
                <ShieldCheck className="w-9 h-9" />
              </div>
            </div>

            {/* decorative particles (gold) */}
            {particles.map((p, i) => (
              <div
                key={i}
                className="particle"
                style={{ top: `${p.top}px`, left: `${p.left}%`, width: `${p.size}px`, height: `${p.size}px`, animationDelay: `${p.delay}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
